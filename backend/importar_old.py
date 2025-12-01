import os
import requests
import pandas as pd
import math
from datetime import datetime
from dotenv import load_dotenv
from io import BytesIO

# -----------------------
# CARREGAR .env
# -----------------------

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL:
    raise RuntimeError("⚠️ Defina SUPABASE_URL no .env")

if "db." in SUPABASE_URL:
    SUPABASE_URL = SUPABASE_URL.replace("db.", "")

if not SERVICE_ROLE_KEY:
    raise RuntimeError("⚠️ Defina SUPABASE_SERVICE_ROLE_KEY no .env")

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# -----------------------
# HELPERS
# -----------------------

def to_str(v):
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d")
    if pd.isna(v):
        return None
    return str(v).strip()

def fix_percentual(v):
    if pd.isna(v): return None
    if isinstance(v, str):
        try:
            v = float(v)
        except:
            return None
    if v > 10_000_000_000:
        return v / 1_000_000_000_000
    return v

def fix_faixa(v):
    if isinstance(v, datetime):
        d, m = v.day, v.month
        if (d, m) in [(1, 7), (1, 1)]:
            return "0-7"
        if (d, m) == (1, 8):
            return "8-15"
        return str(v.date())
    return str(v)

def normalize_mesref(v):
    try:
        return pd.to_datetime(v).strftime("%Y-%m")
    except:
        return to_str(v)

def json_safe(o):
    if isinstance(o, float) and math.isnan(o):
        return None
    return o

# -----------------------
# SUPABASE FUNÇÕES
# -----------------------

def supabase_upsert(table, data, conflict):
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={conflict}"
    r = requests.post(url, headers=HEADERS, json=data)

    if r.status_code not in (200, 201):
        raise RuntimeError(
            f"Erro ao enviar para {table}: {r.status_code} - {r.text}"
        )

    try:
        return r.json()
    except Exception:
        return None


def get_or_create_clinica(cnpj, external_id):
    url = f"{SUPABASE_URL}/rest/v1/clinicas?cnpj=eq.{cnpj}"
    r = requests.get(url, headers=HEADERS)

    if r.status_code == 200:
        rows = r.json()
        if len(rows) > 0:
            return rows[0]["id"]

    data = {
        "cnpj": cnpj,
        "external_id": external_id,
        "nome": external_id
    }

    resp = supabase_upsert("clinicas", data, "cnpj")
    if resp:
        return resp[0]["id"]

    raise RuntimeError("Não foi possível criar clínica.")

# -----------------------
# PARSE BLOCO
# -----------------------

def parse_block(title, header, rows):
    tl = title.lower()
    h = [to_str(x) for x in header] if header else []

    if "boletos emitidos" in tl:
        return ("boletos_emitidos", [
            {
                "mes_ref": normalize_mesref(r[0]),
                "qtde": json_safe(r[1]),
                "valor_total": json_safe(r[2]) if len(r) > 2 else None
            }
            for r in rows
        ])

    if "pagamento no vencimento" in tl:
        return ("taxa_pago_no_vencimento", [
            {
                "mes_ref": normalize_mesref(r[0]),
                "taxa": fix_percentual(r[1])
            }
            for r in rows
        ])

    if "taxa de atraso" in tl:
        return ("taxa_atraso_faixa", [
            {
                "mes_ref": normalize_mesref(r[0]),
                "faixa": fix_faixa(r[1]),
                "qtde": json_safe(r[2]),
                "percentual": fix_percentual(r[3])
            }
            for r in rows
        ])

    if "inadimpl" in tl:
        return ("inadimplencia", [
            {
                "mes_ref": normalize_mesref(r[0]),
                "taxa": fix_percentual(r[1])
            }
            for r in rows
        ])

    if "tempo médio" in tl or "tempo medio" in tl:
        return ("tempo_medio_pagamento", [
            {
                "mes_ref": normalize_mesref(r[0]),
                "dias": json_safe(r[1])
            }
            for r in rows
        ])

    if "valor médio" in tl or "valor medio" in tl:
        return ("valor_medio_boleto", [
            {
                "mes_ref": normalize_mesref(r[0]),
                "valor": json_safe(r[1])
            }
            for r in rows
        ])

    if "parcel" in tl:
        return ("parcelamentos_detalhe", [
            {
                "mes_ref": normalize_mesref(r[0]),
                "qtde_parcelas": json_safe(r[1]),
                "qtde": json_safe(r[2]),
                "percentual": fix_percentual(r[3])
            }
            for r in rows
        ])

    return (None, [])

# -----------------------
# PARSE EXCEL
# -----------------------

def parse_excel_from_bytes(contents: bytes):
    xls = pd.ExcelFile(BytesIO(contents))

    # Achar CNPJ
    cnpj = None
    external_id = None

    for sheet in xls.sheet_names:
        df = xls.parse(sheet, header=None)
        if len(df) >= 2 and str(df.iloc[0, 0]).strip() == "CNPJ":
            cnpj = to_str(df.iloc[1, 0])
            external_id = to_str(df.iloc[1, 1])
            break

    if cnpj is None:
        df0 = xls.parse(xls.sheet_names[0], header=None)
        cnpj = to_str(df0.iloc[1, 0])
        external_id = to_str(df0.iloc[1, 1])

    result = {
        "estabelecimento": {
            "cnpj": cnpj,
            "external_id": external_id
        },
        "boletos_emitidos": [],
        "taxa_pago_no_vencimento": [],
        "taxa_atraso_faixa": [],
        "inadimplencia": [],
        "tempo_medio_pagamento": [],
        "valor_medio_boleto": [],
        "parcelamentos_detalhe": []
    }

    # Arquivo com várias abas
    for sheet in xls.sheet_names:
        df = xls.parse(sheet, header=None)

        # título está na linha 0
        title = df.iloc[0, 0]
        if not isinstance(title, str):
            continue

        # procurar header
        header = None
        if isinstance(df.iloc[1, 0], str) and "MesRef" in df.iloc[1, 0]:
            header = df.iloc[1].tolist()
            start_row = 2
        else:
            start_row = 1

        rows = []
        for i in range(start_row, len(df)):
            if not all(pd.isna(df.iloc[i])):
                rows.append(df.iloc[i].tolist())

        tipo, dados = parse_block(title, header, rows)
        if tipo:
            result[tipo].extend(dados)

    return result

# -----------------------
# FUNÇÃO PRINCIPAL
# -----------------------

def processar_excel(contents: bytes):
    parsed = parse_excel_from_bytes(contents)

    clinica = parsed["estabelecimento"]

    clinica_id = get_or_create_clinica(
        clinica["cnpj"],
        clinica["external_id"]
    )

    # tabelas → conflito
    tabelas = {
        "boletos_emitidos": "clinica_id,mes_ref",
        "taxa_pago_no_vencimento": "clinica_id,mes_ref",
        "taxa_atraso_faixa": "clinica_id,mes_ref,faixa",
        "inadimplencia": "clinica_id,mes_ref",
        "tempo_medio_pagamento": "clinica_id,mes_ref",
        "valor_medio_boleto": "clinica_id,mes_ref",
        "parcelamentos_detalhe": "clinica_id,mes_ref,qtde_parcelas"
    }

    contagem = {}

    for tabela, conflict in tabelas.items():
        registros = parsed[tabela]
        contagem[tabela] = len(registros)

        for item in registros:
            supabase_upsert(
                tabela,
                {"clinica_id": clinica_id, **item},
                conflict
            )

    return {
        "clinica": clinica,
        "clinica_id": clinica_id,
        "registros": contagem
    }
