import os
import math
from datetime import datetime
import pandas as pd
import requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from processor import processar_excel



from io import BytesIO
from openpyxl import Workbook
from fastapi.responses import StreamingResponse

# ==========================
# CONFIG SUPABASE
# ==========================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL:
    raise RuntimeError("⚠️ Defina SUPABASE_URL no .env")

# remover "db." se vier na URL
if "db." in SUPABASE_URL:
    SUPABASE_URL = SUPABASE_URL.replace("db.", "")

if not SERVICE_ROLE_KEY:
    raise RuntimeError("⚠️ Defina SUPABASE_SERVICE_ROLE_KEY no .env")

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

class LimiteAprovadoPayload(BaseModel):
    limite_aprovado: float | None = None
    observacao: str | None = None
    aprovado_por: str | None = None

# New Pydantic Models for Dashboard Data
class DashboardFiltrosPeriodo(BaseModel):
    min_mes_ref: Optional[str] = None
    max_mes_ref: Optional[str] = None

class DashboardContext(BaseModel):
    clinica_id: Optional[str] = None
    clinica_nome: Optional[str] = None

class DashboardKpis(BaseModel):
    score_atual: Optional[float] = None
    score_mes_anterior: Optional[float] = None
    score_variacao_vs_m1: Optional[float] = None
    categoria_risco: Optional[str] = None
    limite_aprovado: Optional[float] = None
    valor_total_emitido_12m: Optional[float] = None
    valor_total_emitido_ultimo_mes: Optional[float] = None
    inadimplencia_media_12m: Optional[float] = None
    inadimplencia_ultimo_mes: Optional[float] = None
    taxa_pago_no_vencimento_media_12m: Optional[float] = None
    taxa_pago_no_vencimento_ultimo_mes: Optional[float] = None
    ticket_medio_12m: Optional[float] = None
    ticket_medio_ultimo_mes: Optional[float] = None
    tempo_medio_pagamento_media_12m: Optional[float] = None
    tempo_medio_pagamento_ultimo_mes: Optional[float] = None
    limite_sugerido: Optional[float] = None
    limite_sugerido_base_media12m: Optional[float] = None
    limite_sugerido_base_media3m: Optional[float] = None
    limite_sugerido_base_ultimo_mes: Optional[float] = None
    limite_sugerido_base_mensal_mix: Optional[float] = None
    limite_sugerido_fator: Optional[float] = None
    limite_sugerido_teto_global: Optional[float] = None
    limite_sugerido_share_portfolio_12m: Optional[float] = None

class DashboardSeries(BaseModel):
    score_por_mes: Optional[List[Dict[str, Any]]] = None
    valor_emitido_por_mes: Optional[List[Dict[str, Any]]] = None
    inadimplencia_por_mes: Optional[List[Dict[str, Any]]] = None
    taxa_pago_no_vencimento_por_mes: Optional[List[Dict[str, Any]]] = None
    tempo_medio_pagamento_por_mes: Optional[List[Dict[str, Any]]] = None
    parcelas_media_por_mes: Optional[List[Dict[str, Any]]] = None

class DashboardRankingClinicas(BaseModel):
    clinica_id: Optional[str] = None
    clinica_nome: Optional[str] = None
    cnpj: Optional[str] = None
    score_credito: Optional[float] = None
    categoria_risco: Optional[str] = None
    limite_aprovado: Optional[float] = None
    valor_total_emitido_12m: Optional[float] = None
    inadimplencia_media_12m: Optional[float] = None

class DashboardData(BaseModel):
    filtros: Dict[str, DashboardFiltrosPeriodo]
    contexto: DashboardContext
    kpis: DashboardKpis
    series: DashboardSeries
    ranking_clinicas: List[DashboardRankingClinicas]


# ==========================
# FASTAPI APP
# ==========================

app = FastAPI(title="MedSimples · Importação de dados")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # para DEV, libera tudo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ==========================
# HELPERS SUPABASE
# ==========================


def supabase_post(table: str, data: dict, on_conflict: str | None = None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {}
    if on_conflict:
        params["on_conflict"] = on_conflict

    r = requests.post(
        url,
        headers={**HEADERS, "Prefer": "return=representation"},
        params=params,
        json=data,
    )

    if r.status_code not in (200, 201):
        raise RuntimeError(f"Erro ao enviar para {table}: {r.status_code} - {r.text}")

    try:
        return r.json()[0]
    except Exception:
        return None


def supabase_get(table: str, select: str = "*", extra_params: dict | None = None):
    """GET simples no PostgREST, retornando lista de dicts."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"

    params = {"select": select}
    if extra_params:
        params.update(extra_params)

    r = requests.get(url, headers=HEADERS, params=params)

    if r.status_code not in (200, 206):
        raise RuntimeError(f"Erro ao buscar {table}: {r.status_code} - {r.text}")

    return r.json()


def to_df(rows, columns=None):
    if not rows:
        return pd.DataFrame(columns=columns or [])
    df = pd.DataFrame(rows)
    return df


# ==========================
# ENDPOINTS BÁSICOS
# ==========================


@app.get("/ping")
def ping():
    return {"status": "ok"}


@app.post("/clinicas/{clinica_id}/limite_aprovado")
async def definir_limite_aprovado(clinica_id: str, payload: LimiteAprovadoPayload):

    if payload.limite_aprovado is None:
        # Registro de revogação
        row = {
            "clinica_id": clinica_id,
            "limite_aprovado": None,
            "observacao": "Limite revogado",
            "aprovado_por": payload.aprovado_por,
        }
    else:
        # Registro de aprovação normal
        row = {
            "clinica_id": clinica_id,
            "limite_aprovado": float(payload.limite_aprovado),
            "observacao": payload.observacao or None,
            "aprovado_por": payload.aprovado_por,
        }


    try:
        inserido = supabase_post("clinica_limite", row)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True, "registro": inserido}


@app.get("/clinicas/{clinica_id}/limites")
async def listar_limites_clinica(clinica_id: str):
    """
    Retorna o histórico de limites aprovados de uma clínica,
    do mais recente para o mais antigo.
    """
    try:
        rows = supabase_get(
            "clinica_limite",
            select=(
                "limite_aprovado,"
                "faturamento_base,"
                "score_base,"
                "aprovado_em,"
                "aprovado_por,"
                "observacao"
            ),
            extra_params={
                "clinica_id": f"eq.{clinica_id}",
                "order": "aprovado_em.desc",
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar limites da clínica: {e}",
        )

    return rows




@app.get("/historico")
async def listar_historico():
    """
    Lista o histórico de importações, já juntando com a tabela `clinicas`
    e enriquecendo com:
      - total_registros (espelho de total_linhas)
      - total_boletos_emitidos (soma de qtde da clínica)
      - total_inadimplencia (média da taxa de inadimplência da clínica)
    """

    # 1) Buscar importações + clínica
    try:
        importacoes = supabase_get(
            "importacoes",
            select=(
                "id,clinica_id,arquivo_nome,total_linhas,status,criado_em,"
                "clinicas:clinica_id(id,nome,cnpj,external_id)"
            ),
            extra_params={"order": "criado_em.desc"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar histórico: {e}",
        )

    if not importacoes:
        return []

    # 2) Coletar IDs de clínica presentes no histórico
    clinica_ids = sorted(
        {row.get("clinica_id") for row in importacoes if row.get("clinica_id")}
    )

    totais_boletos_por_clinica: dict[str, int] = {}
    media_inadimplencia_por_clinica: dict[str, float] = {}

    if clinica_ids:
        ids_in = ",".join(clinica_ids)

        # 2.1 Boletos emitidos
        try:
            boletos_rows = supabase_get(
                "boletos_emitidos",
                select="clinica_id,qtde",
                extra_params={"clinica_id": f"in.({ids_in})"},
            )
        except Exception:
            boletos_rows = []

        # Agregar boletos (soma)
        for row in boletos_rows or []:
            cid = row.get("clinica_id")
            if not cid:
                continue
            qtde = row.get("qtde") or 0
            try:
                qtde = int(qtde)
            except Exception:
                qtde = 0
            totais_boletos_por_clinica[cid] = (
                totais_boletos_por_clinica.get(cid, 0) + qtde
            )

        # 2.2 Inadimplência REAL
        try:
            dash_rows = supabase_get(
                "vw_dashboard_final",
                select="clinica_id,mes_ref_date,valor_total_emitido,taxa_pago_no_vencimento,taxa_inadimplencia",
                extra_params={"clinica_id": f"in.({ids_in})"},
            )
        except Exception:
            dash_rows = []

        df_dash = to_df(dash_rows)

        if not df_dash.empty:
            # Ignorar mês atual
            hoje_utc = datetime.utcnow()
            primeiro_dia_mes_atual = hoje_utc.replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            ).date()
            if "mes_ref_date" in df_dash.columns:
                df_dash["mes_ref_date"] = pd.to_datetime(
                    df_dash["mes_ref_date"], errors="coerce"
                )
                df_dash = df_dash[
                    df_dash["mes_ref_date"].dt.date < primeiro_dia_mes_atual
                ]

            # Tipos numéricos e preenchimento de nulos
            for col in [
                "valor_total_emitido",
                "taxa_pago_no_vencimento",
                "taxa_inadimplencia",
            ]:
                if col in df_dash.columns:
                    df_dash[col] = pd.to_numeric(df_dash[col], errors="coerce")

            df_dash = df_dash.fillna(
                {
                    "valor_total_emitido": 0,
                    "taxa_pago_no_vencimento": 0,
                    "taxa_inadimplencia": 0,
                }
            )

            # Cálculo da inadimplência real
            df_dash["taxa_pago_no_vencimento"] = df_dash[
                "taxa_pago_no_vencimento"
            ].clip(0, 1)
            df_dash["taxa_inad_dos_atrasados"] = df_dash["taxa_inadimplencia"].clip(0, 1)
            df_dash["valor_nao_pago_no_venc"] = df_dash["valor_total_emitido"] * (
                1 - df_dash["taxa_pago_no_vencimento"]
            )
            df_dash["valor_inad_real"] = (
                df_dash["valor_nao_pago_no_venc"]
                * df_dash["taxa_inad_dos_atrasados"]
            )

            # Agregar por clínica (média ponderada)
            agg_df = df_dash.groupby("clinica_id").agg(
                valor_inad_real_total=("valor_inad_real", "sum"),
                valor_total_emitido_total=("valor_total_emitido", "sum"),
            )

            for cid, row in agg_df.iterrows():
                emitido = row["valor_total_emitido_total"]
                inad = row["valor_inad_real_total"]
                if emitido > 0:
                    media_inadimplencia_por_clinica[str(cid)] = inad / emitido

    # 3) Enriquecer cada registro do histórico com os totais reais
    historico_enriquecido = []
    for imp in importacoes:
        cid = imp.get("clinica_id")
        imp["total_registros"] = imp.get("total_linhas") or 0
        imp["total_boletos_emitidos"] = totais_boletos_por_clinica.get(cid, 0)
        imp["total_inadimplencia"] = media_inadimplencia_por_clinica.get(cid, 0) or 0
        historico_enriquecido.append(imp)

    return historico_enriquecido


# ==========================
# DASHBOARD · RESUMO GERAL
# ==========================


@app.get("/dashboard/resumo-geral")
async def dashboard_resumo_geral():
    """
    Retorna um resumo consolidado para o dashboard interno:
    - total de boletos
    - valor total
    - ticket médio
    - taxa pago no vencimento (último mês)
    - inadimplência (último mês)
    - tempo médio de pagamento (último mês)
    - séries por mês para gráficos
    """

    try:
        # --- Tabelas base ---
        boletos_rows = supabase_get(
            "boletos_emitidos", select="mes_ref,qtde,valor_total"
        )
        inad_rows = supabase_get("inadimplencia", select="mes_ref,taxa")
        taxa_venc_rows = supabase_get("taxa_pago_no_vencimento", select="mes_ref,taxa")
        tempo_rows = supabase_get("tempo_medio_pagamento", select="mes_ref,dias")
        ticket_rows = supabase_get("valor_medio_boleto", select="mes_ref,valor")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao carregar dados do Supabase: {e}"
        )

    # ----------------------
    # DataFrames
    # ----------------------
    df_boletos = to_df(boletos_rows, ["mes_ref", "qtde", "valor_total"])
    df_inad = to_df(inad_rows, ["mes_ref", "taxa"])
    df_taxa_venc = to_df(taxa_venc_rows, ["mes_ref", "taxa"])
    df_tempo = to_df(tempo_rows, ["mes_ref", "dias"])
    df_ticket = to_df(ticket_rows, ["mes_ref", "valor"])

    # Garantir tipos numéricos
    if not df_boletos.empty:
        df_boletos["qtde"] = pd.to_numeric(df_boletos["qtde"], errors="coerce").fillna(
            0
        )
        df_boletos["valor_total"] = pd.to_numeric(
            df_boletos.get("valor_total", 0), errors="coerce"
        ).fillna(0)

    if not df_inad.empty:
        df_inad["taxa"] = pd.to_numeric(df_inad["taxa"], errors="coerce")

    if not df_taxa_venc.empty:
        df_taxa_venc["taxa"] = pd.to_numeric(df_taxa_venc["taxa"], errors="coerce")

    if not df_tempo.empty:
        df_tempo["dias"] = pd.to_numeric(df_tempo["dias"], errors="coerce")

    if not df_ticket.empty:
        df_ticket["valor"] = pd.to_numeric(df_ticket["valor"], errors="coerce")

    # ----------------------
    # KPI gerais
    # ----------------------
    total_boletos = int(df_boletos["qtde"].sum()) if not df_boletos.empty else 0
    valor_total_boletos = (
        float(df_boletos["valor_total"].sum()) if not df_boletos.empty else 0.0
    )
    ticket_medio_global = (
        (valor_total_boletos / total_boletos) if total_boletos > 0 else None
    )

    # último mês de referência (pelo boletos_emitidos)
    periodo_referencia = None
    if not df_boletos.empty and "mes_ref" in df_boletos.columns:
        df_boletos_sorted = df_boletos.sort_values("mes_ref")
        periodo_referencia = df_boletos_sorted["mes_ref"].iloc[-1]

    # função helper pra pegar valor do último mês de uma df qualquer
    def valor_ultimo_mes(df, coluna_valor):
        if df.empty:
            return None
        try:
            df_sorted = df.sort_values("mes_ref")
            return float(df_sorted[coluna_valor].iloc[-1])
        except Exception:
            return None

    taxa_inad_ultimo = valor_ultimo_mes(df_inad, "taxa")
    taxa_pago_venc_ultimo = valor_ultimo_mes(df_taxa_venc, "taxa")
    tempo_medio_ultimo = valor_ultimo_mes(df_tempo, "dias")
    ticket_medio_ultimo = valor_ultimo_mes(df_ticket, "valor")

    # ----------------------
    # Séries por mês (pra gráfico)
    # ----------------------
    series_boletos = []
    if not df_boletos.empty:
        grp = (
            df_boletos.groupby("mes_ref", as_index=False)[["qtde", "valor_total"]].sum()
        )
        grp = grp.sort_values("mes_ref")
        series_boletos = grp.to_dict(orient="records")

    series_inad = []
    if not df_inad.empty:
        grp = df_inad.groupby("mes_ref", as_index=False)["taxa"].mean().sort_values(
            "mes_ref"
        )
        series_inad = grp.to_dict(orient="records")

    series_taxa_venc = []
    if not df_taxa_venc.empty:
        grp = (
            df_taxa_venc.groupby("mes_ref", as_index=False)["taxa"]
            .mean()
            .sort_values("mes_ref")
        )
        series_taxa_venc = grp.to_dict(orient="records")

    series_tempo = []
    if not df_tempo.empty:
        grp = (
            df_tempo.groupby("mes_ref", as_index=False)["dias"]
            .mean()
            .sort_values("mes_ref")
        )
        series_tempo = grp.to_dict(orient="records")

    return {
        "periodo_referencia": periodo_referencia,
        "kpis": {
            "total_boletos": total_boletos,
            "valor_total_boletos": valor_total_boletos,
            "ticket_medio_global": ticket_medio_global,
            "taxa_inadimplencia_ultimo": taxa_inad_ultimo,
            "taxa_pago_no_vencimento_ultimo": taxa_pago_venc_ultimo,
            "tempo_medio_pagamento_ultimo": tempo_medio_ultimo,
            "ticket_medio_ultimo": ticket_medio_ultimo,
        },
        "series": {
            "boletos_por_mes": series_boletos,
            "inadimplencia_por_mes": series_inad,
            "taxa_pago_no_vencimento": series_taxa_venc,
            "tempo_medio_pagamento": series_tempo,
        },
    }


# ==========================
# DASHBOARD · CRÉDITO & RISCO (vw_dashboard_final)
# ==========================

from pandas import Timestamp

def _write_data_to_sheet(ws, data, title=None):
    if title:
        ws.append([title])
        ws.append([]) # Add a blank row for spacing

    if isinstance(data, dict):
        for key, value in data.items():
            ws.append([key, str(value)]) # Write key-value pairs
    elif isinstance(data, list) and data:
        # Assuming list of dictionaries, write header first
        headers = list(data[0].keys())
        ws.append(headers)
        for row_data in data:
            ws.append([row_data.get(header, "") for header in headers])
    ws.append([]) # Add a blank row after each section


def _safe_float(v):
    try:
        if v is None:
            return None
        f = float(v)
        if pd.isna(f):
            return None
        return float(f)
    except Exception:
        return None


def _safe_str(v):
    if v is None:
        return None
    return str(v)


def _format_mes_ref(dt: Timestamp | None):
    if dt is None or pd.isna(dt):
        return None
    try:
        return dt.strftime("%Y-%m")
    except Exception:
        return None


@app.get("/dashboard/clinicas")
async def listar_clinicas_dashboard():
    """
    Lista clínicas presentes na view `vw_dashboard_final`
    para uso no filtro do dashboard de crédito & risco.
    """
    try:
        rows = supabase_get(
            "vw_dashboard_final",
            select="clinica_id,clinica_nome,cnpj,external_id",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao carregar clínicas do dashboard: {e}",
        )

    df = to_df(
        rows,
        columns=["clinica_id", "clinica_nome", "cnpj", "external_id"],
    )

    if df.empty:
        return []

    df = df.drop_duplicates(subset=["clinica_id"])

    clinicas = []
    for _, row in df.iterrows():
        clinicas.append(
            {
                "id": _safe_str(row.get("clinica_id")),
                "nome": _safe_str(row.get("clinica_nome"))
                or _safe_str(row.get("external_id"))
                or _safe_str(row.get("cnpj")),
                "cnpj": _safe_str(row.get("cnpj")),
                "external_id": _safe_str(row.get("external_id")),
            }
        )

    clinicas = sorted(clinicas, key=lambda x: (x["nome"] or "").lower())
    return clinicas


@app.get("/dashboard")
async def dashboard_completo(
    clinica_id: str | None = None,
    meses: int = 12,
    inicio: str | None = None,  # "YYYY-MM"
    fim: str | None = None,      # "YYYY-MM"
):
    """
    Dashboard completo de CRÉDITO & RISCO usando `vw_dashboard_final`.

    - Se `clinica_id` vier preenchido, o contexto é aquela clínica.
    - Se não vier, o contexto é "Todas as clínicas" (visão agregada).

    Regras importantes:
    - Ignora sempre o mês em aberto (mês atual).
    - Calcula inadimplência REAL (sobre o total emitido).
    - Calcula um SCORE AJUSTADO e categoria A–E.
    - Calcula um LIMITE SUGERIDO conservador por clínica (quando clinica_id é enviado)
      usando a média dos últimos 12 meses, 3 meses, último mês e o score.
    """

    # --------------------------
    # 1) Carregar dados da view
    # --------------------------
    extra = {}
    try:
        rows = supabase_get("vw_dashboard_final", select="*", extra_params=extra)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao carregar dados do dashboard: {e}",
        )

    df = to_df(rows)

    if df.empty:
        return {
            "filtros": {"periodo": {"min_mes_ref": None, "max_mes_ref": None}},
            "contexto": {
                "clinica_id": clinica_id,
                "clinica_nome": "Sem dados",
            },
            "kpis": {},
            "series": {},
            "ranking_clinicas": [],
        }

    # --------------------------
    # 2) Preparar datas
    # --------------------------
    if "mes_ref_date" in df.columns:
        df["mes_ref_date"] = pd.to_datetime(df["mes_ref_date"], errors="coerce")
    else:
        df["mes_ref_date"] = pd.to_datetime(df["mes_ref"], errors="coerce")

    df = df.dropna(subset=["mes_ref_date"])

    # Ignorar sempre o mês em aberto (mês atual)
    hoje_utc = datetime.utcnow()
    primeiro_dia_mes_atual = hoje_utc.replace(day=1, hour=0, minute=0, second=0, microsecond=0).date()
    df = df[df["mes_ref_date"].dt.date < primeiro_dia_mes_atual]

    if df.empty:
        return {
            "filtros": {"periodo": {"min_mes_ref": None, "max_mes_ref": None}},
            "contexto": {
                "clinica_id": clinica_id,
                "clinica_nome": "Sem dados válidos (mês em aberto ignorado)",
            },
            "kpis": {},
            "series": {},
            "ranking_clinicas": [],
        }

    # --------------------------
    # 3) Tipos numéricos
    # --------------------------
    def _num(col, fill=None):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            if fill is not None:
                df[col] = df[col].fillna(fill)

    _num("valor_total_emitido", fill=0)
    _num("taxa_pago_no_vencimento")
    _num("taxa_inadimplencia")
    _num("tempo_medio_pagamento_dias")
    _num("parc_media_parcelas_pond")
    _num("valor_medio_boleto")
    _num("limite_aprovado")

    # --------------------------
    # 4) Inadimplência REAL
    # --------------------------
    if "taxa_pago_no_vencimento" not in df.columns:
        df["taxa_pago_no_vencimento"] = 0.0
    if "taxa_inadimplencia" not in df.columns:
        df["taxa_inadimplencia"] = 0.0

    df["taxa_pago_no_vencimento"] = df["taxa_pago_no_vencimento"].clip(0, 1)
    df["taxa_inad_dos_atrasados"] = df["taxa_inadimplencia"].clip(0, 1)

    df["valor_nao_pago_no_venc"] = df["valor_total_emitido"] * (
        1 - df["taxa_pago_no_vencimento"]
    )
    df["valor_inad_real"] = df["valor_nao_pago_no_venc"] * df["taxa_inad_dos_atrasados"]

    df["taxa_inadimplencia_real"] = None
    mask_emitido = df["valor_total_emitido"] > 0
    df.loc[mask_emitido, "taxa_inadimplencia_real"] = (
        df.loc[mask_emitido, "valor_inad_real"] / df.loc[mask_emitido, "valor_total_emitido"]
    )

    # --------------------------
    # 5) SCORE AJUSTADO
    # --------------------------
    def _clamp01(x):
        try:
            x = float(x)
        except Exception:
            return 0.0
        if math.isnan(x):
            return 0.0
        return max(0.0, min(1.0, x))

    def _calc_score_row(row):
        inad_real = row.get("taxa_inadimplencia_real")  # sobre o total emitido
        pago_venc = row.get("taxa_pago_no_vencimento")  # 0–1
        dias = row.get("tempo_medio_pagamento_dias")
        parc = row.get("parc_media_parcelas_pond")

        # 1) Risco de inadimplência real (0 → 0%, 1 → 3%+)
        risk_inad = 0.0
        if inad_real is not None:
            risk_inad = _clamp01(inad_real / 0.03)  # 3% vira risco 1

        # 2) Risco de atraso (0 → 100% pago no venc., 1 → 25%+ fora do venc.)
        risk_atraso = 0.0
        if pago_venc is not None:
            risk_atraso = _clamp01((1.0 - float(pago_venc)) / 0.25)

        # 3) Risco de prazo (0 → 5 dias, 1 → 65 dias+)
        risk_dias = 0.0
        if dias is not None:
            risk_dias = _clamp01((float(dias) - 5.0) / 60.0)

        # 4) Risco de parcelamento (0 → 1 parcela, 1 → 12 parcelas+)
        risk_parc = 0.0
        if parc is not None:
            risk_parc = _clamp01((float(parc) - 1.0) / 11.0)

        # Pesos conservadores:
        # inad 50%, atraso 25%, dias 15%, parcelas 10%
        score = 1.0 - (
            0.50 * risk_inad
            + 0.25 * risk_atraso
            + 0.15 * risk_dias
            + 0.10 * risk_parc
        )

        return max(0.0, min(1.0, score))

    df["score_ajustado"] = df.apply(_calc_score_row, axis=1)

    def _categoria_from_score(s):
        s = _safe_float(s)
        if s is None:
            return None
        if s >= 0.80:
            return "A"
        if s >= 0.60:
            return "B"
        if s >= 0.40:
            return "C"
        if s >= 0.20:
            return "D"
        return "E"

    df["categoria_risco_ajustada"] = df["score_ajustado"].apply(_categoria_from_score)

    # --------------------------
    # 6) Período global
    # --------------------------
    min_dt = df["mes_ref_date"].min()
    max_dt = df["mes_ref_date"].max()

    limite_inferior_default = max_dt - pd.DateOffset(months=meses - 1)

    # --------------------------
    # 7) Recorte de tempo
    # --------------------------
    if inicio and fim:
        try:
            dt_inicio = pd.to_datetime(inicio + "-01")
            dt_fim = pd.to_datetime(fim + "-01") + pd.offsets.MonthEnd(0)
            df_recorte = df[
                (df["mes_ref_date"] >= dt_inicio)
                & (df["mes_ref_date"] <= dt_fim)
            ].copy()
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Parâmetros inicio/fim inválidos: {e}",
            )
    else:
        df_recorte = df[df["mes_ref_date"] >= limite_inferior_default].copy()

    # --------------------------
    # 8) Contexto (clínica x geral)
    # --------------------------
    if clinica_id:
        nomes = (
            df[df["clinica_id"] == clinica_id]["clinica_nome"]
            .dropna()
            .unique()
            .tolist()
        )
        nome_clinica = nomes[0] if nomes else "Clínica selecionada"
    else:
        nome_clinica = "Todas as clínicas"

    if clinica_id:
        df_ctx = df_recorte[df_recorte["clinica_id"] == clinica_id].copy()
    else:
        df_ctx = df_recorte.copy()

    if df_ctx.empty:
        return {
            "filtros": {
                "periodo": {
                    "min_mes_ref": _format_mes_ref(min_dt),
                    "max_mes_ref": _format_mes_ref(max_dt),
                }
            },
            "contexto": {
                "clinica_id": clinica_id,
                "clinica_nome": nome_clinica,
            },
            "kpis": {},
            "series": {},
            "ranking_clinicas": [],
        }

    max_ctx_dt = df_ctx["mes_ref_date"].max()
    df_ctx_ultimo = df_ctx[df_ctx["mes_ref_date"] == max_ctx_dt]

    # helpers
    def mean_col(col):
        if col not in df_ctx.columns:
            return None
        return _safe_float(df_ctx[col].mean())

    def sum_col(col):
        if col not in df_ctx.columns:
            return None
        return _safe_float(df_ctx[col].sum())

    # --------------------------
    # 9) KPI principais
    # --------------------------
    col_score = "score_ajustado"

    score_atual = (
        _safe_float(df_ctx_ultimo[col_score].mean())
        if col_score in df_ctx_ultimo.columns
        else None
    )

    mes_anterior_dt = max_ctx_dt - pd.DateOffset(months=1)
    df_ctx_m1 = df_ctx[df_ctx["mes_ref_date"] == mes_anterior_dt]
    score_m1 = (
        _safe_float(df_ctx_m1[col_score].mean())
        if not df_ctx_m1.empty and col_score in df_ctx_m1.columns
        else None
    )

    score_var = None
    if score_atual is not None and score_m1 is not None:
        score_var = _safe_float(score_atual - score_m1)

    # categoria
    categoria_risco = None
    col_cat = "categoria_risco_ajustada"
    if col_cat in df_ctx_ultimo.columns:
        if clinica_id:
            categorias = (
                df_ctx_ultimo[col_cat]
                .dropna()
                .astype(str)
                .unique()
                .tolist()
            )
            categoria_risco = categorias[0] if categorias else None
        else:
            serie = df_ctx_ultimo[col_cat].dropna().astype(str)
            categoria_risco = serie.value_counts().idxmax() if not serie.empty else None

    # limite aprovado
    limite_aprovado = None
    if "limite_aprovado" in df_ctx_ultimo.columns:
        if clinica_id:
            limite_aprovado = _safe_float(df_ctx_ultimo["limite_aprovado"].mean())
        else:
            limite_aprovado = _safe_float(
                df_ctx_ultimo.groupby("clinica_id")["limite_aprovado"].max().sum()
            )

    # valor emitido
    valor_total_12m = sum_col("valor_total_emitido")
    valor_total_ultimo_mes = _safe_float(
        df_ctx_ultimo["valor_total_emitido"].sum()
    ) if "valor_total_emitido" in df_ctx_ultimo.columns else None

    # inadimplência REAL 12m / último mês
    if "valor_inad_real" in df_ctx.columns and "valor_total_emitido" in df_ctx.columns:
        total_inad_12m = _safe_float(df_ctx["valor_inad_real"].sum())
        total_emit_12m = _safe_float(df_ctx["valor_total_emitido"].sum())
        if total_emit_12m and total_emit_12m > 0 and total_inad_12m is not None:
            inad_media_12m = _safe_float(total_inad_12m / total_emit_12m)
        else:
            inad_media_12m = None
    else:
        inad_media_12m = None

    if (
        "valor_inad_real" in df_ctx_ultimo.columns
        and "valor_total_emitido" in df_ctx_ultimo.columns
    ):
        inad_ult = _safe_float(df_ctx_ultimo["valor_inad_real"].sum())
        emit_ult = _safe_float(df_ctx_ultimo["valor_total_emitido"].sum())
        if emit_ult and emit_ult > 0 and inad_ult is not None:
            inad_ultimo_mes = _safe_float(inad_ult / emit_ult)
        else:
            inad_ultimo_mes = None
    else:
        inad_ultimo_mes = None

    # pago no vencimento
    pago_venc_media_12m = mean_col("taxa_pago_no_vencimento")
    pago_venc_ultimo_mes = _safe_float(
        df_ctx_ultimo["taxa_pago_no_vencimento"].mean()
    ) if "taxa_pago_no_vencimento" in df_ctx_ultimo.columns else None

    # ticket
    ticket_12m = mean_col("valor_medio_boleto")
    ticket_ultimo_mes = _safe_float(
        df_ctx_ultimo["valor_medio_boleto"].mean()
    ) if "valor_medio_boleto" in df_ctx_ultimo.columns else None

    # tempo médio
    tempo_medio_12m = mean_col("tempo_medio_pagamento_dias")
    tempo_medio_ultimo = _safe_float(
        df_ctx_ultimo["tempo_medio_pagamento_dias"].mean()
    ) if "tempo_medio_pagamento_dias" in df_ctx_ultimo.columns else None

    # --------------------------
    # 10) LIMITE SUGERIDO (conservador)
    # --------------------------
    limite_sugerido = None
    limite_sugerido_base_media12m = None
    limite_sugerido_base_media3m = None
    limite_sugerido_base_ultimo_mes = None
    limite_sugerido_base_mensal_mix = None
    limite_sugerido_fator = None
    limite_sugerido_share_portfolio_12m = None

    LIMITE_TETO_GLOBAL = 1_000_000.0  # teto duro por clínica (ajustável)

    if clinica_id:
        df_clin_all = df[df["clinica_id"] == clinica_id].copy()
        if not df_clin_all.empty:
            last_dt_clin = df_clin_all["mes_ref_date"].max()

            # 10.1 Janela 12M da clínica
            dt_inicio_12m_clin = last_dt_clin - pd.DateOffset(months=11)
            df_clin_12m = df_clin_all[
                df_clin_all["mes_ref_date"] >= dt_inicio_12m_clin
            ].copy()
            if df_clin_12m.empty:
                df_clin_12m = df_clin_all.copy()

            total_emit_12m_clin = _safe_float(df_clin_12m["valor_total_emitido"].sum())
            n_meses_12m_clin = int(df_clin_12m["mes_ref_date"].nunique() or 0)

            if n_meses_12m_clin > 0 and total_emit_12m_clin is not None:
                limite_sugerido_base_media12m = total_emit_12m_clin / n_meses_12m_clin

            # 10.2 Janela 3M da clínica
            dt_inicio_3m = last_dt_clin - pd.DateOffset(months=2)
            df_last3 = df_clin_all[
                (df_clin_all["mes_ref_date"] >= dt_inicio_3m)
                & (df_clin_all["mes_ref_date"] <= last_dt_clin)
            ].copy()
            if not df_last3.empty:
                limite_sugerido_base_media3m = _safe_float(
                    df_last3["valor_total_emitido"].mean()
                )

            # 10.3 Último mês da clínica
            df_ultimo_mes_clin = df_clin_all[
                df_clin_all["mes_ref_date"] == last_dt_clin
            ].copy()
            if not df_ultimo_mes_clin.empty:
                limite_sugerido_base_ultimo_mes = _safe_float(
                    df_ultimo_mes_clin["valor_total_emitido"].sum()
                )

            # 10.4 Base mensal combinada (12M, 3M, último mês)
            componentes = []
            pesos = []

            if limite_sugerido_base_media12m is not None:
                componentes.append(limite_sugerido_base_media12m)
                pesos.append(0.50)
            if limite_sugerido_base_media3m is not None:
                componentes.append(limite_sugerido_base_media3m)
                pesos.append(0.30)
            if limite_sugerido_base_ultimo_mes is not None:
                componentes.append(limite_sugerido_base_ultimo_mes)
                pesos.append(0.20)

            if componentes and sum(pesos) > 0:
                limite_sugerido_base_mensal_mix = sum(
                    c * p for c, p in zip(componentes, pesos)
                ) / sum(pesos)
            else:
                limite_sugerido_base_mensal_mix = None

            # 10.5 Share da clínica na carteira (12M)
            dt_inicio_12m_share = last_dt_clin - pd.DateOffset(months=11)
            df_port_12m = df[df["mes_ref_date"] >= dt_inicio_12m_share].copy()
            if not df_port_12m.empty and total_emit_12m_clin is not None:
                total_emit_portfolio_12m = _safe_float(
                    df_port_12m["valor_total_emitido"].sum()
                )
                if total_emit_portfolio_12m and total_emit_portfolio_12m > 0:
                    limite_sugerido_share_portfolio_12m = _safe_float(
                        total_emit_12m_clin / total_emit_portfolio_12m
                    )

            # 10.6 Fator de limite por score (mais conservador)
            def _fator_limite_score(s):
                s = _safe_float(s)
                if s is None:
                    return 0.10  # sem score → bem conservador
                if s >= 0.80:
                    return 0.40
                if s >= 0.70:
                    return 0.30
                if s >= 0.60:
                    return 0.25
                if s >= 0.50:
                    return 0.20
                if s >= 0.40:
                    return 0.15
                if s >= 0.20:
                    return 0.10
                return 0.05

            limite_sugerido_fator = _fator_limite_score(score_atual)

            base_para_limite = limite_sugerido_base_mensal_mix or 0.0
            bruto = base_para_limite * (limite_sugerido_fator or 0.0)

            if bruto and bruto > 0:
                limite_sugerido = min(bruto, LIMITE_TETO_GLOBAL)
            else:
                limite_sugerido = None

    # --------------------------
    # 11) Séries temporais
    # --------------------------
    grp = df_ctx.groupby("mes_ref_date", as_index=False).agg(
        {
            "score_ajustado": "mean",
            "valor_total_emitido": "sum",
            "valor_inad_real": "sum",
            "taxa_pago_no_vencimento": "mean",
            "tempo_medio_pagamento_dias": "mean",
            "parc_media_parcelas_pond": "mean",
        }
    )

    grp = grp.sort_values("mes_ref_date")

    series_score = []
    series_valor = []
    series_inad = []
    series_pago_venc = []
    series_tempo = []
    series_parc = []

    for _, row in grp.iterrows():
        mes_str = _format_mes_ref(row["mes_ref_date"])

        score_val = _safe_float(row.get("score_ajustado"))
        valor_emitido = _safe_float(row.get("valor_total_emitido"))
        inad_valor = _safe_float(row.get("valor_inad_real"))
        pago_venc_val = _safe_float(row.get("taxa_pago_no_vencimento"))
        tempo_val = _safe_float(row.get("tempo_medio_pagamento_dias"))
        parc_val = _safe_float(row.get("parc_media_parcelas_pond"))

        taxa_inad_mes = None
        if valor_emitido and valor_emitido > 0 and inad_valor is not None:
            taxa_inad_mes = _safe_float(inad_valor / valor_emitido)

        series_score.append(
            {
                "mes_ref": mes_str,
                "score_credito": score_val,
            }
        )
        series_valor.append(
            {
                "mes_ref": mes_str,
                "valor_total_emitido": valor_emitido,
            }
        )
        series_inad.append(
            {
                "mes_ref": mes_str,
                "taxa_inadimplencia": taxa_inad_mes,
            }
        )
        series_pago_venc.append(
            {
                "mes_ref": mes_str,
                "taxa_pago_no_vencimento": pago_venc_val,
            }
        )
        series_tempo.append(
            {
                "mes_ref": mes_str,
                "tempo_medio_pagamento_dias": tempo_val,
            }
        )
        series_parc.append(
            {
                "mes_ref": mes_str,
                "media_parcelas_pond": parc_val,
            }
        )

    # --------------------------
    # 12) Ranking de clínicas (último mês fechado global)
    # --------------------------
    df_ultimo_global = df[df["mes_ref_date"] == max_dt].copy()

    ranking = []
    if not df_ultimo_global.empty:
        df_12m_global = df[df["mes_ref_date"] >= limite_inferior_default].copy()

        agg_12m_por_clinica = (
            df_12m_global.groupby("clinica_id", as_index=False).agg(
                {
                    "valor_total_emitido": "sum",
                    "valor_inad_real": "sum",
                }
            )
        )

        def _calc_inad_med(row):
            emit = _safe_float(row.get("valor_total_emitido"))
            inad = _safe_float(row.get("valor_inad_real"))
            if emit and emit > 0 and inad is not None:
                return _safe_float(inad / emit)
            return None

        agg_12m_por_clinica["inadimplencia_media_12m"] = agg_12m_por_clinica.apply(
            _calc_inad_med, axis=1
        )

        agg_12m_por_clinica = agg_12m_por_clinica.rename(
            columns={
                "valor_total_emitido": "valor_total_emitido_12m",
            }
        )

        df_rank = df_ultimo_global.merge(
            agg_12m_por_clinica, on="clinica_id", how="left"
        )

        for _, row in df_rank.iterrows():
            ranking.append(
                {
                    "clinica_id": _safe_str(row.get("clinica_id")),
                    "clinica_nome": _safe_str(row.get("clinica_nome")),
                    "cnpj": _safe_str(row.get("cnpj")),
                    "score_credito": _safe_float(row.get("score_ajustado")),
                    "categoria_risco": _safe_str(row.get("categoria_risco_ajustada")),
                    "limite_aprovado": _safe_float(row.get("limite_aprovado")),
                    "valor_total_emitido_12m": _safe_float(
                        row.get("valor_total_emitido_12m")
                    ),
                    "inadimplencia_media_12m": _safe_float(
                        row.get("inadimplencia_media_12m")
                    ),
                }
            )

        ranking = sorted(
            ranking,
            key=lambda x: (x["score_credito"] or 0),
            reverse=True,
        )

    # --------------------------
    # 13) Montar resposta
    # --------------------------
    return {
        "filtros": {
            "periodo": {
                "min_mes_ref": _format_mes_ref(min_dt),
                "max_mes_ref": _format_mes_ref(max_dt),
            }
        },
        "contexto": {
            "clinica_id": clinica_id,
            "clinica_nome": nome_clinica,
        },
        "kpis": {
            "score_atual": score_atual,
            "score_mes_anterior": score_m1,
            "score_variacao_vs_m1": score_var,
            "categoria_risco": categoria_risco,
            "limite_aprovado": limite_aprovado,
            "valor_total_emitido_12m": valor_total_12m,
            "valor_total_emitido_ultimo_mes": valor_total_ultimo_mes,
            "inadimplencia_media_12m": inad_media_12m,
            "inadimplencia_ultimo_mes": inad_ultimo_mes,
            "taxa_pago_no_vencimento_media_12m": pago_venc_media_12m,
            "taxa_pago_no_vencimento_ultimo_mes": pago_venc_ultimo_mes,
            "ticket_medio_12m": ticket_12m,
            "ticket_medio_ultimo_mes": ticket_ultimo_mes,
            "tempo_medio_pagamento_media_12m": tempo_medio_12m,
            "tempo_medio_pagamento_ultimo_mes": tempo_medio_ultimo,
            # limite sugerido (novo motor conservador)
            "limite_sugerido": limite_sugerido,
            "limite_sugerido_base_media12m": limite_sugerido_base_media12m,
            "limite_sugerido_base_media3m": limite_sugerido_base_media3m,
            "limite_sugerido_base_ultimo_mes": limite_sugerido_base_ultimo_mes,
            "limite_sugerido_base_mensal_mix": limite_sugerido_base_mensal_mix,
            "limite_sugerido_fator": limite_sugerido_fator,
            "limite_sugerido_teto_global": LIMITE_TETO_GLOBAL,
            "limite_sugerido_share_portfolio_12m": limite_sugerido_share_portfolio_12m,
        },
        "series": {
            "score_por_mes": series_score,
            "valor_emitido_por_mes": series_valor,
            "inadimplencia_por_mes": series_inad,
            "taxa_pago_no_vencimento_por_mes": series_pago_venc,
            "tempo_medio_pagamento_por_mes": series_tempo,
            "parcelas_media_por_mes": series_parc,
        },
        "ranking_clinicas": ranking,
    }


@app.post("/export-dashboard", response_class=StreamingResponse)
async def export_dashboard(dashboard_data: DashboardData):
    """
    Exporta um Excel simples com RESUMO POR CLÍNICA, usando apenas
    o campo `ranking_clinicas` do DashboardData.

    Colunas:
    - Clínica
    - CNPJ
    - ID da clínica
    - Score de crédito
    - Categoria de risco
    - Limite aprovado
    - Valor total emitido (12m)
    - Inadimplência média (12m)
    """
    output = BytesIO()
    wb = Workbook()

    # Usar a primeira planilha como "Resumo por clínica"
    ws = wb.active
    ws.title = "Resumo por clínica"

    # Cabeçalhos
    headers = [
        "Clínica",
        "CNPJ",
        "ID Clínica",
        "Score crédito",
        "Categoria risco",
        "Limite aprovado",
        "Valor emitido 12m",
        "Inadimplência média 12m",
    ]
    ws.append(headers)

    # Preencher linhas a partir de ranking_clinicas
    for item in dashboard_data.ranking_clinicas:
        ws.append([
            item.clinica_nome or "",
            item.cnpj or "",
            item.clinica_id or "",
            item.score_credito if item.score_credito is not None else None,
            item.categoria_risco or "",
            item.limite_aprovado if item.limite_aprovado is not None else None,
            item.valor_total_emitido_12m if item.valor_total_emitido_12m is not None else None,
            item.inadimplencia_media_12m if item.inadimplencia_media_12m is not None else None,
        ])

    # Auto-ajuste básico de largura (opcional, mas ajuda a ficar mais legível)
    for column_cells in ws.columns:
        length = max(len(str(cell.value)) if cell.value is not None else 0 for cell in column_cells)
        ws.column_dimensions[column_cells[0].column_letter].width = min(length + 2, 50)

    wb.save(output)
    output.seek(0)

    filename = f"resumo_clinicas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


