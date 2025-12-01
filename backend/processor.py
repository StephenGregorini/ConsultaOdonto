import os
import re
import math
import requests
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
from io import BytesIO

# ==========================
# CARREGAR ENV
# ==========================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL:
    raise RuntimeError("⚠️ Defina SUPABASE_URL no .env")

if "db." in SUPABASE_URL:
    SUPABASE_URL = SUPABASE_URL.replace("db.", "")

if not SERVICE_ROLE_KEY:
    raise RuntimeError("⚠️ Defina SERVICE_ROLE_KEY no .env")

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}


# ==========================
# HELPERS
# ==========================

def to_str(v):
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d")
    if pd.isna(v):
        return None
    return str(v).strip()


def fix_percentual(v):
    if pd.isna(v):
        return None
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


# ==========================
# NORMALIZAÇÃO E DEDUPE
# ==========================

def normalize_for_conflict(item, cols):
    for key in cols:
        v = item.get(key)
        if isinstance(v, str):
            item[key] = v.strip()
        elif pd.isna(v):
            item[key] = None


def dedupe(registros, conflict_cols):
    seen = set()
    out = []
    for row in registros:
        key = tuple(row.get(c) for c in conflict_cols)
        if key not in seen:
            seen.add(key)
            out.append(row)
    return out


# ==========================
# SUPABASE
# ==========================

def supabase_upsert(table, data, conflict):
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={conflict}"
    r = requests.post(url, headers=HEADERS, json=data)

    if r.status_code not in (200, 201):
        raise RuntimeError(
            f"Erro ao enviar para {table}: {r.status_code} - {r.text}"
        )

    try:
        return r.json()
    except:
        return None


def get_or_create_clinica(cnpj, external_id):
    url = f"{SUPABASE_URL}/rest/v1/clinicas?cnpj=eq.{cnpj}"
    r = requests.get(url, headers=HEADERS)

    if r.status_code == 200:
        data = r.json()
        if len(data) > 0:
            return data[0]["id"]

    payload = {
        "cnpj": cnpj,
        "external_id": external_id,
        "nome": external_id or cnpj
    }

    resp = supabase_upsert("clinicas", payload, "cnpj")
    if resp:
        return resp[0]["id"]

    raise RuntimeError("Não foi possível criar clínica.")


# ==========================
# PARSE BLOCO
# ==========================

def parse_block(title, header, rows):
    tl = title.lower().strip()

    if re.search(r"boleto[s]?\s*emit", tl):
        return ("boletos_emitidos", [
            {
                "mes_ref": normalize_mesref(r[0]),
                "qtde": json_safe(r[1]),
                "valor_total": json_safe(r[2]) if len(r) > 2 else None
            }
            for r in rows
        ])

    if "pagamento no vencimento" in tl or "taxa de pagamento" in tl:
        return ("taxa_pago_no_vencimento", [
            {"mes_ref": normalize_mesref(r[0]), "taxa": fix_percentual(r[1])}
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
            {"mes_ref": normalize_mesref(r[0]), "taxa": fix_percentual(r[1])}
            for r in rows
        ])

    if "tempo médio" in tl or "medio" in tl:
        return ("tempo_medio_pagamento", [
            {"mes_ref": normalize_mesref(r[0]), "dias": json_safe(r[1])}
            for r in rows
        ])

    if "valor médio" in tl:
        return ("valor_medio_boleto", [
            {"mes_ref": normalize_mesref(r[0]), "valor": json_safe(r[1])}
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


# ==========================
# PARSE EXCEL
# ==========================

def parse_excel_from_bytes(contents: bytes):
    xls = pd.ExcelFile(BytesIO(contents))

    cnpj = None
    external_id = None

    for sheet in xls.sheet_names:
        df = xls.parse(sheet, header=None)
        for i in range(min(10, len(df))):
            if str(df.iloc[i, 0]).strip() == "CNPJ":
                cnpj = to_str(df.iloc[i + 1, 0])
                external_id = to_str(df.iloc[i + 1, 1])
                break
        if cnpj:
            break

    if not cnpj:
        raise RuntimeError("Não foi possível localizar CNPJ no arquivo.")

    result = {
        "estabelecimento": {"cnpj": cnpj, "external_id": external_id},
        "boletos_emitidos": [],
        "taxa_pago_no_vencimento": [],
        "taxa_atraso_faixa": [],
        "inadimplencia": [],
        "tempo_medio_pagamento": [],
        "valor_medio_boleto": [],
        "parcelamentos_detalhe": []
    }

    for sheet in xls.sheet_names:
        df = xls.parse(sheet, header=None)

        i = 0
        nrows = len(df)

        while i < nrows - 1:
            titulo = df.iloc[i, 0]

            if isinstance(titulo, str) and titulo.strip() not in ("", "CNPJ"):
                header = df.iloc[i + 1]

                if any(isinstance(c, str) and "MesRef" in c for c in header):
                    rows = []
                    j = i + 2

                    while j < nrows:
                        row = df.iloc[j]
                        if all(pd.isna(x) for x in row):
                            break
                        rows.append(row.to_list())
                        j += 1

                    tipo, dados = parse_block(titulo, header, rows)
                    if tipo:
                        result[tipo].extend(dados)

                    i = j
                    continue

            i += 1

    return result


# ==========================
# TABELAS & CHAVES
# ==========================

TABELAS_CONFLITO = {
    "boletos_emitidos": "clinica_id,mes_ref",
    "taxa_pago_no_vencimento": "clinica_id,mes_ref",
    "taxa_atraso_faixa": "clinica_id,mes_ref,faixa",
    "inadimplencia": "clinica_id,mes_ref",
    "tempo_medio_pagamento": "clinica_id,mes_ref",
    "valor_medio_boleto": "clinica_id,mes_ref",
    "parcelamentos_detalhe": "clinica_id,mes_ref,qtde_parcelas",
}


# ==========================
# REGISTRAR IMPORTAÇÃO
# ==========================

def registrar_importacao(clinica_id, arquivo_nome, parsed, contagem):
    url = f"{SUPABASE_URL}/rest/v1/importacoes"

    payload = {
        "clinica_id": clinica_id,
        "arquivo_nome": arquivo_nome,
        "total_linhas": sum(contagem.values()),
        "status": "concluido",
        "log": contagem
    }

    requests.post(url, headers=HEADERS, json=payload)


# ==========================
# PROCESSAMENTO FINAL
# ==========================

def processar_excel(contents: bytes, arquivo_nome="arquivo.xlsx"):
    parsed = parse_excel_from_bytes(contents)

    clinica = parsed["estabelecimento"]

    clinica_id = get_or_create_clinica(
        clinica["cnpj"],
        clinica["external_id"]
    )

    contagem = {}

    for tabela, conflict in TABELAS_CONFLITO.items():

        registros = parsed[tabela]
        contagem[tabela] = len(registros)

        if not registros:
            continue

        conflict_cols = [c.strip() for c in conflict.split(",")]

        for item in registros:
            item["clinica_id"] = clinica_id
            normalize_for_conflict(item, conflict_cols)

        registros = dedupe(registros, conflict_cols)

        supabase_upsert(tabela, registros, conflict)

    # SALVAR NO HISTÓRICO
    registrar_importacao(
        clinica_id=clinica_id,
        arquivo_nome=arquivo_nome,
        parsed=parsed,
        contagem=contagem
    )

    return {
        "clinica": clinica,
        "clinica_id": clinica_id,
        "registros": contagem,
        "arquivo": arquivo_nome,
        "status": "ok"
    }
