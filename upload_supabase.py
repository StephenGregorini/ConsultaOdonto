import json
import requests
import sys

SUPABASE_URL = "https://nazwcadbqmadckhtssjd.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hendjYWRicW1hZGNraHRzc2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTE2OTksImV4cCI6MjA3ODE2NzY5OX0.v5kTj8i_NGehl70O92AIlgJ-pUt4oA-4Ar-iwAE9xtA"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def supabase_upsert(table, data, conflict):
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={conflict}"
    r = requests.post(url, headers=HEADERS, json=data)
    if r.status_code not in (200, 201):
        print("\n❌ Erro:", table, r.text)
    return r.json()

def get_or_create_clinica(cnpj, external_id):
    url = f"{SUPABASE_URL}/rest/v1/clinicas?cnpj=eq.{cnpj}"
    r = requests.get(url, headers=HEADERS)

    if r.status_code == 200 and len(r.json()) > 0:
        return r.json()[0]["id"]

    data = {"cnpj": cnpj, "external_id": external_id, "nome": external_id}
    resp = supabase_upsert("clinicas", data, "cnpj")
    return resp[0]["id"]

def upload_json(path):
    print("📌 Lendo JSON:", path)

    with open(path) as f:
        data = json.load(f)

    clinica = data["estabelecimento"]

    clinica_id = get_or_create_clinica(
        clinica["cnpj"],
        clinica["external_id"]
    )

    print("🏥 Clínica ID:", clinica_id)

    tables = {
        "boletos_emitidos": "clinica_id,mes_ref",
        "taxa_pago_no_vencimento": "clinica_id,mes_ref",
        "taxa_atraso_faixa": "clinica_id,mes_ref,faixa",
        "inadimplencia": "clinica_id,mes_ref",
        "tempo_medio_pagamento": "clinica_id,mes_ref",
        "valor_medio_boleto": "clinica_id,mes_ref",
        "parcelamentos": "clinica_id,mes_ref,qtde_parcelas"
    }

    for table, conflict in tables.items():
        if table not in data: continue
        for item in data[table]:
            supabase_upsert(
                table if table != "parcelamentos" else "parcelamentos_detalhe",
                {"clinica_id": clinica_id, **item},
                conflict
            )

    print("\n✅ Tudo enviado com sucesso!")

if __name__ == "__main__":
    upload_json(sys.argv[1])
