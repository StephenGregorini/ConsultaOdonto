import pandas as pd
import sys
import json
from datetime import datetime
import math

# ----------------- HELPERS ---------------------

def to_str(v):
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d")
    if pd.isna(v):
        return None
    return str(v).strip()


def fix_faixa(value):
    """
    Corrige faixas que o Excel converteu para datas.
    Regras:
      - se o valor for datetime → faixa original virou data → restaurar
      - se o valor parecer "2025-07-01" e mes=07 dia=01 → original era "0-7"
      - se o valor parecer "2015-08-01" → original era "8-15"
      - se o valor parecer ">30" → manter
    """

    # Se virou datetime
    if isinstance(value, datetime):
        d = value.day
        m = value.month

        # Mapear faixas reconhecidas
        if d == 1 and m == 7:   # 01/07
            return "0-7"
        if d == 1 and m == 8:   # 01/08
            return "8-15"
        if d == 1 and m == 1:   # Excel também pode virar 01/01
            return "0-7"

        return str(value.date())

    # Strings que parecem datas
    if isinstance(value, str) and value.count("-") == 2:
        try:
            dt = datetime.strptime(value, "%Y-%m-%d")
            return fix_faixa(dt)
        except:
            pass

    # Manter o que já é texto normal ("16-30", ">30", etc)
    return str(value)


def fix_percentual(value):
    """
    Normaliza percentuais:
      - se NaN → None
      - se maior que 10 → dividir por 1000000000000 (caso Excel bugado)
      - se string → converter
    """

    if pd.isna(value):
        return None

    # Converter string
    if isinstance(value, str):
        try:
            value = float(value)
        except:
            return None

    # Se exagerado (tipo 1000000000000), corrigir
    if value > 10_000:
        return value / 1_000_000_000_000

    return value


def normalize_mesref(value):
    try:
        return pd.to_datetime(value).strftime("%Y-%m")
    except:
        return to_str(value)


def json_safe(o):
    if isinstance(o, float) and math.isnan(o):
        return None
    return o


# ------------------ PARSE BLOCO -------------------

def parse_block(title, header, rows):
    title = title.lower()
    h = [to_str(x) for x in header]

    # 1. Boletos Emitidos
    if "boletos emitidos" in title:
        return {
            "tipo": "boletos_emitidos",
            "data": [
                {
                    "mes_ref": normalize_mesref(r[0]),
                    "qtde": json_safe(r[1]),
                    "valor_total": json_safe(r[2])
                }
                for r in rows
            ]
        }

    # 2. Pago no Vencimento
    if "pagamento no vencimento" in title:
        return {
            "tipo": "taxa_pago_no_vencimento",
            "data": [
                {
                    "mes_ref": normalize_mesref(r[0]),
                    "taxa": json_safe(fix_percentual(r[1]))
                }
                for r in rows
            ]
        }

    # 3. Taxa de Atraso por Faixa
    if "taxa de atraso" in title and len(h) == 4:
        return {
            "tipo": "taxa_atraso_faixa",
            "data": [
                {
                    "mes_ref": normalize_mesref(r[0]),
                    "faixa": fix_faixa(r[1]),
                    "qtde": json_safe(r[2]),
                    "percentual": fix_percentual(r[3])
                }
                for r in rows
            ]
        }

    # 4. Taxa de Atraso Mensal (agregado)
    if "taxa de atraso" in title and len(h) <= 2:
        return {
            "tipo": "taxa_atraso_mensal",
            "data": [
                {
                    "mes_ref": normalize_mesref(r[0]),
                    "taxa": fix_percentual(r[1])
                }
                for r in rows
            ]
        }

    # 5. Inadimplência
    if "inadimpl" in title:
        return {
            "tipo": "inadimplencia",
            "data": [
                {
                    "mes_ref": normalize_mesref(r[0]),
                    "taxa": fix_percentual(r[1])
                }
                for r in rows
            ]
        }

    # 6. Tempo Médio de Pagamento
    if "tempo médio" in title or "medio de pagamento" in title:
        return {
            "tipo": "tempo_medio_pagamento",
            "data": [
                {
                    "mes_ref": normalize_mesref(r[0]),
                    "dias": json_safe(r[1])
                }
                for r in rows
            ]
        }

    # 7. Valor Médio
    if "valor médio" in title:
        return {
            "tipo": "valor_medio_boleto",
            "data": [
                {
                    "mes_ref": normalize_mesref(r[0]),
                    "valor": json_safe(r[1])
                }
                for r in rows
            ]
        }

    # 8. Parcelamentos
    if "parcel" in title:
        return {
            "tipo": "parcelamentos",
            "data": [
                {
                    "mes_ref": normalize_mesref(r[0]),
                    "qtde_parcelas": json_safe(r[1]),
                    "qtde": json_safe(r[2]),
                    "percentual": fix_percentual(r[3])
                }
                for r in rows
            ]
        }

    return None


# ------------------ PARSE EXCEL COMPLETO -------------------

def parse_excel(path):
    df = pd.read_excel(path, header=None)

    result = {
        "estabelecimento": {
            "cnpj": to_str(df.iloc[0][0]),
            "external_id": to_str(df.iloc[0][1])
        },
        "boletos_emitidos": [],
        "taxa_pago_no_vencimento": [],
        "taxa_atraso_mensal": [],
        "taxa_atraso_faixa": [],
        "inadimplencia": [],
        "tempo_medio_pagamento": [],
        "valor_medio_boleto": [],
        "parcelamentos": []
    }

    i = 0
    while i < len(df):
        row = df.iloc[i]

        if isinstance(row[0], str) and row[0].strip() not in ["", "CNPJ"]:
            title = row[0].strip()
            header = df.iloc[i + 1].tolist()
            data = []

            j = i + 2
            while j < len(df) and not isinstance(df.iloc[j][0], str):
                if not all(pd.isna(df.iloc[j])):
                    data.append(df.iloc[j].tolist())
                j += 1

            parsed = parse_block(title, header, data)
            if parsed:
                result[parsed["tipo"]].extend(parsed["data"])

            i = j
        else:
            i += 1

    return result


# ----------------- MAIN ----------------------

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python converter.py arquivo.xlsx")
        sys.exit(1)

    caminho = sys.argv[1]
    parsed = parse_excel(caminho)

    print(json.dumps(parsed, indent=4, ensure_ascii=False))
