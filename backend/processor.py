import os
import re
import math
import requests
import pandas as pd
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

# garante URL sem "db."
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
    if pd.isna(v):
        return None
    if isinstance(v, str):
        try:
            v = float(v)
        except Exception:
            return None
    # casos absurdos (ex.: 1000000000000)
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
    except Exception:
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
# PARSE BLOCO (por título)
# -----------------------

def parse_block(title, header, rows):
    tl = title.lower().strip() if isinstance(title, str) else ""

    # BOLETOS EMITIDOS (robusto para variações)
    if re.search(r"boleto[s]?\s*emit", tl):
        return ("boletos_emitidos", [
            {
                "mes_ref": normalize_mesref(r[0]),
                "qtde": json_safe(r[1]),
                "valor_total": json_safe(r[2]) if len(r) > 2 else None
            }
            for r in rows
        ])

    # TAXA PAGO NO VENCIMENTO
    if "pagamento no vencimento" in tl or "taxa de pagamento" in tl:
        return ("taxa_pago_no_vencimento", [
            {
                "mes_ref": normalize_mesref(r[0]),
                "taxa": fix_percentual(r[1])
            }
            for r in rows
        ])

    # TAXA DE ATRASO (por faixa)
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

    # INADIMPLÊNCIA
    if "inadimpl" in tl:
        return ("inadimplencia", [
            {
                "mes_ref": normalize_mesref(r[0]),
                "taxa": fix_percentual(r[1])
            }
            for r in rows
        ])

    # TEMPO MÉDIO DE PAGAMENTO
    if (
        "tempo médio de pagamento" in tl
        or "tempo medio de pagamento" in tl
        or "médio de pagamento após o vencimento" in tl
        or "medio de pagamento apos o vencimento" in tl
    ):
        return ("tempo_medio_pagamento", [
            {
                "mes_ref": normalize_mesref(r[0]),
                "dias": json_safe(r[1])
            }
            for r in rows
        ])

    # VALOR MÉDIO DO BOLETO
    if "valor médio" in tl or "valor medio" in tl:
        return ("valor_medio_boleto", [
            {
                "mes_ref": normalize_mesref(r[0]),
                "valor": json_safe(r[1])
            }
            for r in rows
        ])

    # PARCELAMENTOS
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

    # Bloco não reconhecido
    return (None, [])


# -----------------------
# PARSE EXCEL (abas + empilhado)
# -----------------------

def parse_excel_from_bytes(contents: bytes):
    xls = pd.ExcelFile(BytesIO(contents))

    # 1) Achar CNPJ / ExternalId em QUALQUER aba
    cnpj = None
    external_id = None

    for sheet in xls.sheet_names:
        df = xls.parse(sheet, header=None)
        # olhar só primeiras linhas
        for i in range(min(10, len(df))):
            if str(df.iloc[i, 0]).strip() == "CNPJ":
                cnpj = to_str(df.iloc[i + 1, 0])
                external_id = to_str(df.iloc[i + 1, 1])
                break
        if cnpj:
            break

    if cnpj is None:
        raise RuntimeError("Não foi possível localizar CNPJ no arquivo.")

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

    # 2) Varre cada aba procurando blocos:
    # [linha i = título] + [linha i+1 = header com MesRef] + [linhas de dados]
    for sheet in xls.sheet_names:
        df = xls.parse(sheet, header=None)
        nrows = len(df)
        i = 0

        while i < nrows - 1:
            val = df.iloc[i, 0]

            # ignorar vazios / cabeçalho de CNPJ
            if isinstance(val, str) and val.strip() not in ("", "CNPJ"):
                next_row = df.iloc[i + 1]

                # verifica se linha seguinte contém "MesRef" em alguma coluna
                if any(isinstance(c, str) and "MesRef" in c for c in next_row.to_list()):
                    title = val
                    header = next_row.to_list()
                    data_rows = []
                    j = i + 2

                    # varre dados até linha totalmente vazia
                    while j < nrows:
                        row = df.iloc[j]
                        if all(pd.isna(x) for x in row):
                            break
                        data_rows.append(row.to_list())
                        j += 1

                    tipo, dados = parse_block(title, header, data_rows)
                    if tipo:
                        result[tipo].extend(dados)

                    # pula para depois do bloco atual
                    i = j
                    continue

            i += 1

    return result


# -----------------------
# REGISTRAR IMPORTAÇÃO
# -----------------------

def registrar_importacao(clinica_id, arquivo_nome, parsed, contagem):
    """
    Cria um registro na tabela 'importacoes' no Supabase
    para controle de histórico.
    """
    url = f"{SUPABASE_URL}/rest/v1/importacoes"

    registro = {
        "clinica_id": clinica_id,
        "arquivo_nome": arquivo_nome,
        "total_linhas": contagem.get("boletos_emitidos", 0),
        "erros": 0,
        "avisos": 0,
        "status": "concluido",
        "log": contagem,
    }

    r = requests.post(url, headers=HEADERS, json=registro)
    if r.status_code not in (200, 201):
        print("⚠️ Erro ao registrar importação:", r.text)


# -----------------------
# CONFIG DAS TABELAS
# -----------------------

TABELAS_CONFLITO = {
    "boletos_emitidos": "clinica_id,mes_ref",
    "taxa_pago_no_vencimento": "clinica_id,mes_ref",
    "taxa_atraso_faixa": "clinica_id,mes_ref,faixa",
    "inadimplencia": "clinica_id,mes_ref",
    "tempo_medio_pagamento": "clinica_id,mes_ref",
    "valor_medio_boleto": "clinica_id,mes_ref",
    "parcelamentos_detalhe": "clinica_id,mes_ref,qtde_parcelas",
}


# -----------------------
# FUNÇÃO PRINCIPAL
# -----------------------

def processar_excel(contents: bytes, arquivo_nome: str = "arquivo.xlsx"):
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

        # adiciona clinica_id em todos
        for item in registros:
            item["clinica_id"] = clinica_id

        # bulk upsert
        supabase_upsert(tabela, registros, conflict)

    # registra histórico da importação
    try:
        registrar_importacao(
            clinica_id=clinica_id,
            arquivo_nome=arquivo_nome,
            parsed=parsed,
            contagem=contagem,
        )
    except Exception as e:
        print("⚠️ Falha ao registrar histórico da importação:", e)

    return {
        "clinica": clinica,
        "clinica_id": clinica_id,
        "registros": contagem
    }
