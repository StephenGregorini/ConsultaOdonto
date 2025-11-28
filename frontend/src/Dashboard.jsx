import React, { useEffect, useMemo, useState } from "react";
import Layout from "./Layout";
import { useAuth } from "./AuthContext";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ReferenceLine,
} from "recharts";

const API_BASE = "http://127.0.0.1:8000";

// =========================
// Helpers de formatação
// =========================

function formatNumber(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return Number(v).toLocaleString("pt-BR");
}

function formatCurrency(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

function formatPercent(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  let num = Number(v);
  if (!Number.isFinite(num)) return "-";
  if (num <= 1 && num >= -1) num = num * 100;
  return `${num.toFixed(2)}%`;
}

function formatMesRef(str) {
  if (!str) return "-";
  const [ano, mes] = String(str).split("-");
  if (!ano || !mes) return str;
  return `${mes}/${ano}`;
}

const MESES = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Fev" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Abr" },
  { value: "05", label: "Mai" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Ago" },
  { value: "09", label: "Set" },
  { value: "10", label: "Out" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dez" },
];

const chartColors = {
  score: "#38bdf8", // sky-400
  inad: "#fb7185", // rose-400
  pagoVenc: "#22c55e", // emerald-500
  volume: "#0ea5e9", // sky-500
  parcelas: "#a855f7", // purple-500
  tempo: "#f97316", // orange-500
};

// Tooltip customizado
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-[11px] text-slate-100 shadow-lg shadow-slate-900/80">
      {label && (
        <p className="font-semibold mb-1 text-slate-200">
          {formatMesRef(label)}
        </p>
      )}
      {payload.map((p, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1 text-slate-300">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            {p.name}
          </span>
          <span className="font-mono text-slate-100">
            {formatter ? formatter(p.value, p) : formatNumber(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// =========================
// COMPONENTE PRINCIPAL
// =========================

export default function Dashboard() {
  const { profile } = useAuth();

  const [clinicas, setClinicas] = useState([]);
  const [clinicaId, setClinicaId] = useState("todas");

  const [janelaMeses, setJanelaMeses] = useState(12);

  // período customizado "YYYY-MM"
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const periodoPersonalizadoAtivo = !!(periodoInicio && periodoFim);

  const [dados, setDados] = useState(null);
  const [carregandoClinicas, setCarregandoClinicas] = useState(true);
  const [carregandoDashboard, setCarregandoDashboard] = useState(true);
  const [erro, setErro] = useState(null);

  const [activeTab, setActiveTab] = useState("decisao"); // decisao | comportamento | carteira
  const [copiandoResumo, setCopiandoResumo] = useState(false);

  // ---------- ESTADO MÓDULO DE LIMITE ----------
  const [modalLimiteAberto, setModalLimiteAberto] = useState(false);
  const [novoLimiteAprovado, setNovoLimiteAprovado] = useState("");
  const [observacaoLimite, setObservacaoLimite] = useState("");
  const [salvandoLimite, setSalvandoLimite] = useState(false);
  const [historicoLimites, setHistoricoLimites] = useState([]);
  const [carregandoHistoricoLimites, setCarregandoHistoricoLimites] =
    useState(false);

  // anos fixos (últimos 5)
  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const anosDisponiveis = useMemo(
    () => [anoAtual - 4, anoAtual - 3, anoAtual - 2, anoAtual - 1, anoAtual],
    [anoAtual]
  );

  // helpers para split do período
  const [inicioAno, inicioMes] = periodoInicio
    ? periodoInicio.split("-")
    : ["", ""];
  const [fimAno, fimMes] = periodoFim ? periodoFim.split("-") : ["", ""];

  const labelPeriodoCurto = periodoPersonalizadoAtivo
    ? "período"
    : `${janelaMeses}M`;

  const labelPeriodoDetalhe = periodoPersonalizadoAtivo
    ? "Período selecionado no filtro."
    : `Últimos ${janelaMeses} meses no contexto selecionado.`;

  // ==========================
  // 1) CARREGAR CLÍNICAS
  // ==========================

  useEffect(() => {
    async function carregarClinicas() {
      try {
        setCarregandoClinicas(true);
        const res = await fetch(`${API_BASE}/dashboard/clinicas`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setClinicas(json || []);
      } catch (e) {
        console.error("Erro ao carregar clínicas:", e);
      } finally {
        setCarregandoClinicas(false);
      }
    }
    carregarClinicas();
  }, []);

  // ==========================
  // 2) CARREGAR DASHBOARD
  // ==========================

  async function carregarDashboard() {
    try {
      setCarregandoDashboard(true);
      setErro(null);

      const params = new URLSearchParams();

      if (periodoPersonalizadoAtivo) {
        params.set("inicio", periodoInicio);
        params.set("fim", periodoFim);
      } else {
        params.set("meses", String(janelaMeses || 12));
      }

      if (clinicaId && clinicaId !== "todas") {
        params.set("clinica_id", clinicaId);
      }

      const url = `${API_BASE}/dashboard?${params.toString()}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      setDados(json);
    } catch (e) {
      console.error("Erro ao carregar dashboard:", e);
      setErro("Erro ao carregar dados do dashboard.");
    } finally {
      setCarregandoDashboard(false);
    }
  }

  useEffect(() => {
    carregarDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicaId, janelaMeses, periodoInicio, periodoFim, periodoPersonalizadoAtivo]);

  // ==========================
  // 3) HISTÓRICO DE LIMITES
  // ==========================

  async function carregarHistoricoLimites(id) {
    if (!id || id === "todas") {
      setHistoricoLimites([]);
      return;
    }

    try {
      setCarregandoHistoricoLimites(true);
      const res = await fetch(`${API_BASE}/clinicas/${id}/limites`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setHistoricoLimites(json || []);
    } catch (e) {
      console.error("Erro ao carregar histórico de limites:", e);
    } finally {
      setCarregandoHistoricoLimites(false);
    }
  }

  useEffect(() => {
    if (clinicaId && clinicaId !== "todas") {
      carregarHistoricoLimites(clinicaId);
    } else {
      setHistoricoLimites([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicaId]);

  // ==========================
  // 4) FUNÇÕES DO MÓDULO DE LIMITE
  // ==========================

  function abrirModalLimite() {
    if (!clinicaId || clinicaId === "todas") {
      alert("Selecione uma clínica específica para aprovar o limite.");
      return;
    }

    const valorAtual = dados?.kpis?.limite_aprovado;
    const valorSug = dados?.kpis?.limite_sugerido;
    const inicial =
      valorAtual != null && !Number.isNaN(valorAtual)
        ? valorAtual
        : valorSug != null && !Number.isNaN(valorSug)
        ? valorSug
        : "";

    setNovoLimiteAprovado(
      inicial !== "" ? String(Math.round(Number(inicial))) : ""
    );
    setObservacaoLimite("");
    setModalLimiteAberto(true);
  }

async function handleSalvarLimite() {
  if (!clinicaId || clinicaId === "todas") {
    alert("Selecione uma clínica antes de aprovar o limite.");
    return;
  }

  try {
    setSalvandoLimite(true);

    const payload = {
      limite_aprovado: Number(novoLimiteAprovado),
      observacao: observacaoLimite || null,
      aprovado_por: profile?.nome || profile?.email || "admin",
    };

    const resp = await fetch(
      `${API_BASE}/clinicas/${clinicaId}/limite_aprovado`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );


    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`HTTP ${resp.status} - ${err}`);
    }

    alert("Limite aprovado com sucesso!");

    // recarrega painel + histórico
    await carregarDashboard();
    await carregarHistoricoLimites(clinicaId);

    setModalLimiteAberto(false);

  } catch (err) {
    console.error("Erro ao salvar limite:", err);
    alert("Erro ao salvar limite.");
  } finally {
    setSalvandoLimite(false);
  }
}


  // ==========================
  // Decompor dados
  // ==========================

  const kpis = dados?.kpis || {};
  const contexto = dados?.contexto || {};
  const periodo = dados?.filtros?.periodo || {};
  const series = dados?.series || {};
  const ranking = dados?.ranking_clinicas || [];

  const scorePorMes = series.score_por_mes || [];
  const valorPorMes = series.valor_emitido_por_mes || [];
  const inadPorMes = series.inadimplencia_por_mes || [];
  const pagoVencPorMes = series.taxa_pago_no_vencimento_por_mes || [];
  const tempoPorMes = series.tempo_medio_pagamento_por_mes || [];
  const parcelasPorMes = series.parcelas_media_por_mes || [];

  const limiteSugerido = kpis.limite_sugerido;
  const limiteAprovado = kpis.limite_aprovado;

  // Monta série combinada de comportamento (score + inad + pago no vencimento)
  const comportamentoSeries = useMemo(() => {
    const map = new Map();

    function ensure(key) {
      if (!map.has(key)) {
        map.set(key, { mes_ref: key });
      }
      return map.get(key);
    }

    scorePorMes.forEach((p) => {
      const row = ensure(p.mes_ref);
      row.score = p.score_credito;
    });

    inadPorMes.forEach((p) => {
      const row = ensure(p.mes_ref);
      row.inad = p.taxa_inadimplencia;
    });

    pagoVencPorMes.forEach((p) => {
      const row = ensure(p.mes_ref);
      row.pagoVenc = p.taxa_pago_no_vencimento;
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.mes_ref).localeCompare(String(b.mes_ref))
    );
  }, [scorePorMes, inadPorMes, pagoVencPorMes]);

  // Série de volume com limite sugerido como linha de referência
  const volumeSeries = useMemo(() => {
    return (valorPorMes || []).map((p) => ({
      mes_ref: p.mes_ref,
      volume: p.valor_total_emitido,
    }));
  }, [valorPorMes]);

  // Top 5 clínicas para gráfico
  const rankingTop5 = useMemo(() => {
    const arr = [...(ranking || [])];
    arr.sort((a, b) => (b.score_credito || 0) - (a.score_credito || 0));
    return arr.slice(0, 5);
  }, [ranking]);

  // ==========================
  // VARIAÇÃO DO SCORE
  // ==========================

  const variacaoScoreLabel = useMemo(() => {
    const v = Number(kpis.score_variacao_vs_m1);
    if (!Number.isFinite(v)) return null;
    if (v > 0) return { sinal: "↑", classe: "text-emerald-400", valor: v };
    if (v < 0) return { sinal: "↓", classe: "text-rose-400", valor: v };
    return { sinal: "→", classe: "text-slate-400", valor: v };
  }, [kpis.score_variacao_vs_m1]);

  // ==========================
  // RECOMENDAÇÃO DE LIMITE
  // ==========================

  const recomendacaoLimite = useMemo(() => {
    if (!clinicaId || clinicaId === "todas") {
      return {
        label: "Selecione uma clínica para ver o limite sugerido.",
        classe: "text-slate-400",
      };
    }
    if (limiteSugerido == null || Number.isNaN(limiteSugerido)) {
      return {
        label: "Sem histórico suficiente para sugerir limite com segurança.",
        classe: "text-amber-300",
      };
    }

    const atual = Number(limiteAprovado || 0);
    const sug = Number(limiteSugerido);
    if (!atual || atual <= 0) {
      return {
        label: "Sem limite aprovado ainda — usar como referência inicial.",
        classe: "text-sky-300",
      };
    }

    const diff = sug - atual;
    const perc = diff / atual;

    if (perc > 0.25) {
      return {
        label: "Limite sugerido bem acima do atual — avaliar aumento gradual.",
        classe: "text-emerald-300",
      };
    }
    if (perc > 0.05) {
      return {
        label: "Há espaço para aumento controlado do limite.",
        classe: "text-emerald-300",
      };
    }
    if (perc < -0.25) {
      return {
        label: "Limite atual pode estar agressivo frente ao risco — revisar.",
        classe: "text-rose-300",
      };
    }
    if (perc < -0.05) {
      return {
        label: "Limite atual levemente acima do sugerido — monitorar.",
        classe: "text-amber-300",
      };
    }

    return {
      label: "Limite atual alinhado com o sugerido pelo modelo.",
      classe: "text-slate-300",
    };
  }, [clinicaId, limiteSugerido, limiteAprovado]);

  // ==========================
  // Copiar resumo para reunião
  // ==========================

  const podeCopiarResumo = !!dados && clinicaId && clinicaId !== "todas";

  async function handleCopiarResumo() {
    if (!podeCopiarResumo) return;
    try {
      setCopiandoResumo(true);

      const nomeClinica = contexto?.clinica_nome || "Clínica";
      const score = kpis.score_atual != null ? kpis.score_atual.toFixed(3) : "-";
      const categoria = kpis.categoria_risco || "-";
      const inad12m = formatPercent(kpis.inadimplencia_media_12m);
      const pagoVenc12m = formatPercent(kpis.taxa_pago_no_vencimento_media_12m);
      const vol12m = formatCurrency(kpis.valor_total_emitido_12m);
      const limSug = formatCurrency(limiteSugerido);
      const limApr = formatCurrency(limiteAprovado);
      const rec = recomendacaoLimite.label;

      const resumo = [
        `Resumo de crédito – ${nomeClinica}`,
        "",
        `Score ajustado: ${score} (categoria ${categoria}).`,
        `Inadimplência real 12M: ${inad12m}. Pago no vencimento 12M: ${pagoVenc12m}.`,
        `Volume emitido 12M: ${vol12m}.`,
        `Limite aprovado atual: ${limApr}.`,
        `Limite sugerido pelo modelo (conservador): ${limSug}.`,
        "",
        `Comentário do motor de crédito: ${rec}`,
      ].join("\n");

      await navigator.clipboard.writeText(resumo);
    } catch (e) {
      console.error("Erro ao copiar resumo:", e);
    } finally {
      setCopiandoResumo(false);
    }
  }

  // ==========================
  // RENDER
  // ==========================

  return (
    <Layout>
      <div className="max-w-7xl mx-auto w-full space-y-8 py-4">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 border border-sky-500/40 px-3 py-1 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] tracking-wide text-sky-200 uppercase">
                Motor de crédito · MedSimples
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-100">
              Painel de{" "}
              <span className="text-sky-400">crédito e risco</span>
            </h1>
            <p className="text-slate-300 max-w-2xl text-sm sm:text-base mt-3">
              Apoia a definição de{" "}
              <span className="font-semibold text-sky-300">
                limites de antecipação para médicos
              </span>{" "}
              por clínica, seguindo a lógica de{" "}
              <span className="font-semibold text-sky-300">
                cartão de crédito
              </span>
              : limite total, consumido conforme as antecipações são usadas.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 text-xs sm:text-sm text-slate-400">
            <div>
              Período de dados disponível:{" "}
              <span className="font-semibold text-sky-300">
                {periodo.min_mes_ref
                  ? formatMesRef(periodo.min_mes_ref)
                  : "-"}
                {" — "}
                {periodo.max_mes_ref
                  ? formatMesRef(periodo.max_mes_ref)
                  : "-"}
              </span>
            </div>
            <div>
              Contexto atual:{" "}
              <span className="font-semibold text-slate-100">
                {contexto?.clinica_nome || "-"}
              </span>
            </div>
            <div>
              Usuário:{" "}
              <span className="font-semibold text-slate-100">
                {profile?.nome || profile?.email}
              </span>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="rounded-2xl bg-slate-950/80 border border-slate-800 px-4 py-4 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              {/* CLÍNICA */}
              <div className="flex flex-col">
                <span className="text-slate-400 mb-1 text-[11px] uppercase tracking-wide">
                  Clínica
                </span>
                <select
                  value={clinicaId}
                  onChange={(e) => setClinicaId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs sm:text-sm"
                >
                  <option value="todas">Todas as clínicas</option>
                  {clinicas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                {carregandoClinicas && (
                  <span className="text-[10px] text-slate-500 mt-1">
                    Carregando lista de clínicas...
                  </span>
                )}
              </div>

              {/* PERÍODO PERSONALIZADO */}
              <div className="flex flex-col">
                <span className="text-slate-400 mb-1 text-[11px] uppercase tracking-wide">
                  Período personalizado
                </span>

                <div className="flex flex-col gap-1.5">
                  {/* De */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 w-7">
                      De
                    </span>
                    <select
                      value={inicioMes || ""}
                      onChange={(e) => {
                        const mes = e.target.value;
                        if (!mes) return;
                        const ano =
                          inicioAno || String(anosDisponiveis[0] || anoAtual);
                        setPeriodoInicio(`${ano}-${mes}`);
                      }}
                      className="bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-2 py-1.5 text-xs"
                    >
                      <option value="">Mês</option>
                      {MESES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={inicioAno || ""}
                      onChange={(e) => {
                        const ano = e.target.value;
                        if (!ano) return;
                        const mes = inicioMes || "01";
                        setPeriodoInicio(`${ano}-${mes}`);
                      }}
                      className="bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-2 py-1.5 text-xs"
                    >
                      <option value="">Ano</option>
                      {anosDisponiveis.map((a) => (
                        <option key={a} value={String(a)}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Até */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 w-7">
                      Até
                    </span>
                    <select
                      value={fimMes || ""}
                      onChange={(e) => {
                        const mes = e.target.value;
                        if (!mes) return;
                        const ano =
                          fimAno || String(anosDisponiveis.at(-1) || anoAtual);
                        setPeriodoFim(`${ano}-${mes}`);
                      }}
                      className="bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-2 py-1.5 text-xs"
                    >
                      <option value="">Mês</option>
                      {MESES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={fimAno || ""}
                      onChange={(e) => {
                        const ano = e.target.value;
                        if (!ano) return;
                        const mes = fimMes || "12";
                        setPeriodoFim(`${ano}-${mes}`);
                      }}
                      className="bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-2 py-1.5 text-xs"
                    >
                      <option value="">Ano</option>
                      {anosDisponiveis.map((a) => (
                        <option key={a} value={String(a)}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <small className="text-slate-500 text-[10px] mt-1">
                  Se preencher início e fim, o painel usa apenas esse recorte.
                </small>
              </div>

              {/* JANELA TEMPORAL */}
              {!periodoPersonalizadoAtivo && (
                <div className="flex flex-col">
                  <span className="text-slate-400 mb-1 text-[11px] uppercase tracking-wide">
                    Janela móvel
                  </span>
                  <select
                    value={janelaMeses}
                    onChange={(e) => setJanelaMeses(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs sm:text-sm"
                  >
                    <option value={6}>Últimos 6 meses</option>
                    <option value={12}>Últimos 12 meses</option>
                    <option value={24}>Últimos 24 meses</option>
                  </select>
                </div>
              )}
            </div>

            {/* Info rápida + botão resumo */}
            <div className="flex flex-col items-end gap-2">
              <p className="text-[11px] text-slate-500 max-w-xs text-right">
                {labelPeriodoDetalhe}
              </p>
              <button
                type="button"
                disabled={!podeCopiarResumo || copiandoResumo}
                onClick={handleCopiarResumo}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] border ${
                  podeCopiarResumo
                    ? "border-sky-500/70 text-sky-200 hover:bg-sky-500/10"
                    : "border-slate-700 text-slate-500 cursor-not-allowed"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  content_copy
                </span>
                {copiandoResumo
                  ? "Copiando resumo..."
                  : "Copiar resumo para reunião"}
              </button>
            </div>
          </div>

          {/* Linha inferior de status */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800 pt-2">
            <span>
              {periodoPersonalizadoAtivo
                ? "Período customizado ativo."
                : "Utilizando últimos meses fechados (mês em aberto sempre ignorado)."}
            </span>
            {carregandoDashboard && (
              <span className="inline-flex items-center gap-1 text-sky-300">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                Atualizando painel...
              </span>
            )}
          </div>
        </div>

        {/* ESTADOS GERAIS */}
        {carregandoDashboard && (
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 text-sm text-slate-300">
            Carregando dados do dashboard...
          </div>
        )}

        {erro && !carregandoDashboard && (
          <div className="rounded-2xl bg-rose-900/40 border border-rose-500/60 p-4 text-sm text-rose-100">
            {erro}
          </div>
        )}

        {/* Se não tem dados */}
        {!carregandoDashboard && !erro && !dados && (
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 text-sm text-slate-300">
            Nenhum dado retornado para o filtro selecionado.
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        {!carregandoDashboard && !erro && dados && (
          <>
            {/* RESUMO EXECUTIVO */}
            <section className="grid md:grid-cols-3 gap-4">
              {/* Score e risco */}
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-md shadow-sky-900/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-400 text-xs">
                    Score ajustado (0–1)
                  </p>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-200">
                    Risco {kpis.categoria_risco || "-"}
                  </span>
                </div>
                <p className="text-2xl font-semibold text-sky-300">
                  {kpis.score_atual != null
                    ? kpis.score_atual.toFixed(3)
                    : "-"}
                </p>
                {variacaoScoreLabel && (
                  <p className={`text-[11px] mt-1 ${variacaoScoreLabel.classe}`}>
                    {variacaoScoreLabel.sinal}{" "}
                    {variacaoScoreLabel.valor.toFixed(3)} vs. mês anterior
                  </p>
                )}
                <p className="text-[11px] text-slate-500 mt-2">
                  Indicador sintético que concentra{" "}
                  inadimplência, atraso, prazo e número de parcelas.
                </p>
              </div>

              {/* Volume emitido */}
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-md shadow-sky-900/20">
                <p className="text-slate-400 text-xs mb-1">
                  Volume emitido ({labelPeriodoCurto})
                </p>
                <p className="text-2xl font-semibold text-slate-50">
                  {formatCurrency(kpis.valor_total_emitido_12m)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Último mês fechado:{" "}
                  <span className="text-sky-300">
                    {formatCurrency(kpis.valor_total_emitido_ultimo_mes)}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 mt-2">
                  Esse volume é a base para dimensionar o{" "}
                  <span className="text-sky-300">limite de crédito total</span>.
                </p>
              </div>

              {/* Inadimplência e pago no vencimento */}
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-md shadow-sky-900/20">
                <p className="text-slate-400 text-xs mb-1">
                  Inadimplência real ({labelPeriodoCurto})
                </p>
                <p className="text-xl font-semibold text-rose-300">
                  {formatPercent(kpis.inadimplencia_media_12m)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pago no vencimento ({labelPeriodoCurto}):{" "}
                  <span className="text-emerald-300">
                    {formatPercent(kpis.taxa_pago_no_vencimento_media_12m)}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 mt-2">
                  Inadimplência calculada sobre o{" "}
                  <span className="text-sky-300">
                    total emitido (não só sobre atrasados)
                  </span>
                  , deixando o risco mais transparente.
                </p>
              </div>
            </section>

            {/* ABAS PRINCIPAIS */}
            <section className="mt-6">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                {[
                  { id: "decisao", label: "Decisão de crédito" },
                  { id: "comportamento", label: "Comportamento de pagamento" },
                  { id: "carteira", label: "Carteira & ranking de clínicas" },
                ].map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative px-3 py-1.5 text-xs sm:text-sm rounded-full transition ${
                        active
                          ? "bg-sky-500/15 text-sky-200 border border-sky-500/60 shadow-sm shadow-sky-900/40"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/70"
                      }`}
                    >
                      {tab.label}
                      {active && (
                        <span className="absolute inset-x-4 -bottom-[2px] h-[2px] rounded-full bg-sky-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 space-y-8">
                {/* ===============================
                    ABA 01 - DECISÃO DE CRÉDITO
                =============================== */}
                {activeTab === "decisao" && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
                        01 · Painel de decisão de crédito
                      </h2>
                      <p className="text-[11px] text-slate-500 max-w-md text-right">
                        Use esta aba para{" "}
                        <span className="text-sky-300">
                          discutir e aprovar limites
                        </span>{" "}
                        em comitês de crédito, conectando limite, risco e histórico.
                      </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-4">
                      {/* SCORE & RISCO */}
                      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-md shadow-sky-900/20 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-slate-400 text-xs mb-1">
                              Score ajustado (0–1)
                            </p>
                            <p className="text-2xl font-semibold text-sky-300">
                              {kpis.score_atual != null
                                ? kpis.score_atual.toFixed(3)
                                : "-"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-400 text-xs mb-1">
                              Categoria de risco (A–E)
                            </p>
                            <p className="text-2xl font-semibold">
                              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-emerald-300 text-sm">
                                {kpis.categoria_risco || "-"}
                              </span>
                            </p>
                          </div>
                        </div>

                        {variacaoScoreLabel && (
                          <p className={`text-[11px] ${variacaoScoreLabel.classe}`}>
                            {variacaoScoreLabel.sinal}{" "}
                            {variacaoScoreLabel.valor.toFixed(3)} vs. mês anterior
                          </p>
                        )}

                        <p className="text-[11px] text-slate-500">
                          Score com peso maior para{" "}
                          <span className="text-sky-300">
                            inadimplência real, atraso, dias e número de parcelas
                          </span>
                          . Quanto mais próximo de 1, menor o risco.
                        </p>
                      </div>

                      {/* LIMITES: APROVADO x SUGERIDO + BOTÃO DE APROVAÇÃO */}
                      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-md shadow-sky-900/20 flex flex-col gap-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-slate-400 text-xs">
                            Limite de crédito para antecipação
                          </p>
                          {clinicaId !== "todas" && (
                            <button
                              type="button"
                              onClick={abrirModalLimite}
                              className="inline-flex items-center gap-1 rounded-full border border-sky-500/70 px-2.5 py-1 text-[11px] text-sky-200 hover:bg-sky-500/10"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                task_alt
                              </span>
                              Aprovar limite
                            </button>
                          )}
                        </div>

                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-[11px] text-slate-500 mb-1">
                              Limite aprovado
                            </p>
                            <p className="text-xl font-semibold text-emerald-300">
                              {formatCurrency(limiteAprovado)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-slate-500 mb-1">
                              Limite sugerido pelo modelo
                            </p>
                            <p className="text-xl font-semibold text-sky-300">
                              {formatCurrency(limiteSugerido)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2">
                          <p className={`text-[11px] ${recomendacaoLimite.classe}`}>
                            {recomendacaoLimite.label}
                          </p>
                        </div>

                        {/* Última decisão de limite */}
                        <div className="mt-2 border-t border-slate-800 pt-2">
                          <p className="text-[11px] text-slate-500 mb-1">
                            Histórico de decisões de limite
                          </p>
                          {clinicaId === "todas" ? (
                            <p className="text-[11px] text-slate-500">
                              Selecione uma clínica para ver o histórico.
                            </p>
                          ) : carregandoHistoricoLimites ? (
                            <p className="text-[11px] text-slate-500">
                              Carregando histórico...
                            </p>
                          ) : historicoLimites.length === 0 ? (
                            <p className="text-[11px] text-slate-500">
                              Ainda não há registros de limite aprovado para esta
                              clínica.
                            </p>
                          ) : (
                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                              {historicoLimites.slice(0, 4).map((item, idx) => {
                                const dt = item.aprovado_em
                                  ? new Date(item.aprovado_em)
                                  : null;
                                const dataStr = dt
                                  ? dt.toLocaleDateString("pt-BR")
                                  : "-";
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between gap-2 text-[11px]"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-slate-200">
                                        {formatCurrency(item.limite_aprovado)}
                                      </span>
                                      <span className="text-slate-500">
                                        {dataStr} ·{" "}
                                        {item.aprovado_por || "—"}
                                      </span>
                                    </div>
                                    {item.observacao && (
                                      <span className="text-[10px] text-slate-400 line-clamp-1 text-right">
                                        “{item.observacao}”
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-500 mt-2">
                          Lembre: esse limite é um{" "}
                          <span className="text-sky-300">teto total</span> de
                          exposição da clínica. Se for aprovado, deve ser tratado
                          como linha rotativa, e não como valor recorrente mensal.
                        </p>
                      </div>

                      {/* BASE DO LIMITE SUGERIDO */}
                      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-md shadow-sky-900/20 flex flex-col gap-3">
                        <p className="text-slate-400 text-xs mb-2">
                          Como o limite sugerido é construído
                        </p>

                        <div className="space-y-2 text-[11px] text-slate-300">
                          <p>
                            Média mensal 12M:{" "}
                            <span className="text-sky-300">
                              {formatCurrency(kpis.limite_sugerido_base_media12m)}
                            </span>
                          </p>
                          <p>
                            Média mensal últimos 3M:{" "}
                            <span className="text-sky-300">
                              {formatCurrency(kpis.limite_sugerido_base_media3m)}
                            </span>
                          </p>
                          <p>
                            Último mês emitido:{" "}
                            <span className="text-sky-300">
                              {formatCurrency(kpis.limite_sugerido_base_ultimo_mes)}
                            </span>
                          </p>
                          <p>
                            Base mensal combinada (12M · 3M · 1M):{" "}
                            <span className="text-sky-300">
                              {formatCurrency(kpis.limite_sugerido_base_mensal_mix)}
                            </span>
                          </p>
                          <p>
                            Fator de risco (score):{" "}
                            <span className="text-sky-300">
                              {kpis.limite_sugerido_fator != null
                                ? kpis.limite_sugerido_fator.toFixed(2)
                                : "-"}
                            </span>
                          </p>
                          <p>
                            Teto global configurado:{" "}
                            <span className="text-slate-200">
                              {formatCurrency(kpis.limite_sugerido_teto_global)}
                            </span>
                          </p>
                          {kpis.limite_sugerido_share_portfolio_12m != null && (
                            <p>
                              Participação no volume 12M da carteira:{" "}
                              <span className="text-sky-300">
                                {formatPercent(
                                  kpis.limite_sugerido_share_portfolio_12m
                                )}
                              </span>
                            </p>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-500 mt-2">
                          Regra desenhada para ser{" "}
                          <span className="text-sky-300">conservadora</span>,
                          puxando pelo histórico total (12M) e ponderando o
                          comportamento recente (3M e último mês).
                        </p>
                      </div>
                    </div>

                    {/* GRÁFICO: Volume vs limite */}
                    <div className="mt-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-slate-300 text-xs">
                          Volume emitido por mês x linha de limite sugerido
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Visual para entender se o limite está{" "}
                          <span className="text-sky-300">
                            acima ou abaixo do histórico
                          </span>
                          .
                        </p>
                      </div>
                      {volumeSeries.length === 0 ? (
                        <p className="text-slate-500 text-xs">
                          Sem dados suficientes para montar o gráfico.
                        </p>
                      ) : (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={volumeSeries}>
                              <CartesianGrid
                                stroke="#1f2937"
                                strokeDasharray="3 3"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="mes_ref"
                                tickFormatter={formatMesRef}
                                stroke="#64748b"
                                fontSize={11}
                              />
                              <YAxis
                                stroke="#64748b"
                                fontSize={11}
                                tickFormatter={(v) =>
                                  Number(v).toLocaleString("pt-BR", {
                                    maximumFractionDigits: 0,
                                  })
                                }
                              />
                              <Tooltip
                                content={(props) => (
                                  <ChartTooltip
                                    {...props}
                                    formatter={(value) =>
                                      formatCurrency(value)
                                    }
                                  />
                                )}
                              />
                              <Legend
                                wrapperStyle={{
                                  fontSize: 10,
                                  color: "#cbd5f5",
                                }}
                              />
                              <Bar
                                dataKey="volume"
                                name="Volume emitido"
                                fill={chartColors.volume}
                                radius={[4, 4, 0, 0]}
                              />
                              {limiteSugerido != null && limiteSugerido > 0 && (
                                <ReferenceLine
                                  y={limiteSugerido}
                                  stroke="#22c55e"
                                  strokeDasharray="4 4"
                                  label={{
                                    value: "Limite sugerido",
                                    position: "top",
                                    fill: "#22c55e",
                                    fontSize: 10,
                                  }}
                                />
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ===============================
                    ABA 02 - COMPORTAMENTO
                =============================== */}
                {activeTab === "comportamento" && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
                        02 · Comportamento de pagamento
                      </h2>
                      <p className="text-[11px] text-slate-500 max-w-md text-right">
                        Entenda se a clínica paga no vencimento, quanto atrasa,
                        qual o ticket médio e quantas parcelas costuma usar.
                      </p>
                    </div>

                    {/* KPIs */}
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      {/* Inadimplência */}
                      <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-4">
                        <p className="text-slate-400 text-xs mb-1">
                          Inadimplência real ({labelPeriodoCurto})
                        </p>
                        <p className="text-2xl font-semibold text-rose-300">
                          {formatPercent(kpis.inadimplencia_media_12m)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Último mês:{" "}
                          <span className="text-rose-300">
                            {formatPercent(kpis.inadimplencia_ultimo_mes)}
                          </span>
                        </p>
                      </div>

                      {/* Pago no vencimento */}
                      <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-4">
                        <p className="text-slate-400 text-xs mb-1">
                          Pago no vencimento ({labelPeriodoCurto})
                        </p>
                        <p className="text-2xl font-semibold text-emerald-300">
                          {formatPercent(kpis.taxa_pago_no_vencimento_media_12m)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Último mês:{" "}
                          <span className="text-emerald-300">
                            {formatPercent(
                              kpis.taxa_pago_no_vencimento_ultimo_mes
                            )}
                          </span>
                        </p>
                      </div>

                      {/* Ticket médio */}
                      <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-4">
                        <p className="text-slate-400 text-xs mb-1">
                          Ticket médio ({labelPeriodoCurto})
                        </p>
                        <p className="text-2xl font-semibold text-slate-50">
                          {formatCurrency(kpis.ticket_medio_12m)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Último mês:{" "}
                          <span className="text-sky-300">
                            {formatCurrency(kpis.ticket_medio_ultimo_mes)}
                          </span>
                        </p>
                      </div>

                      {/* Tempo médio de pagamento */}
                      <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-4">
                        <p className="text-slate-400 text-xs mb-1">
                          Dias médios após vencimento ({labelPeriodoCurto})
                        </p>
                        <p className="text-2xl font-semibold text-slate-50">
                          {kpis.tempo_medio_pagamento_media_12m != null
                            ? `${kpis.tempo_medio_pagamento_media_12m.toFixed(
                                1
                              )} dias`
                            : "-"}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Último mês:{" "}
                          <span className="text-sky-300">
                            {kpis.tempo_medio_pagamento_ultimo_mes != null
                              ? `${kpis.tempo_medio_pagamento_ultimo_mes.toFixed(
                                  1
                                )} dias`
                              : "-"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Gráfico de score x inad x pago no vencimento */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
                        <p className="text-slate-300 text-xs mb-3">
                          Score, inadimplência e pago no vencimento por mês
                        </p>
                        {comportamentoSeries.length === 0 ? (
                          <p className="text-slate-500 text-xs">
                            Sem dados para o recorte selecionado.
                          </p>
                        ) : (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={comportamentoSeries}>
                                <CartesianGrid
                                  stroke="#1f2937"
                                  strokeDasharray="3 3"
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="mes_ref"
                                  tickFormatter={formatMesRef}
                                  stroke="#64748b"
                                  fontSize={11}
                                />
                                <YAxis
                                  stroke="#64748b"
                                  fontSize={11}
                                  tickFormatter={(v) =>
                                    `${(v * 100).toFixed(0)}%`
                                  }
                                  domain={[0, 1]}
                                />
                                <Tooltip
                                  content={(props) => (
                                    <ChartTooltip
                                      {...props}
                                      formatter={(value, p) =>
                                        p.dataKey === "score"
                                          ? value.toFixed(3)
                                          : formatPercent(value)
                                      }
                                    />
                                  )}
                                />
                                <Legend
                                  wrapperStyle={{
                                    fontSize: 10,
                                    color: "#cbd5f5",
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="score"
                                  name="Score"
                                  stroke={chartColors.score}
                                  strokeWidth={2}
                                  dot={false}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="inad"
                                  name="Inadimplência"
                                  stroke={chartColors.inad}
                                  strokeWidth={2}
                                  dot={false}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="pagoVenc"
                                  name="Pago no vencimento"
                                  stroke={chartColors.pagoVenc}
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      {/* Gráfico de tempo e parcelas */}
                      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
                        <p className="text-slate-300 text-xs mb-3">
                          Prazo (dias) e nº de parcelas por mês
                        </p>
                        {tempoPorMes.length === 0 && parcelasPorMes.length === 0 ? (
                          <p className="text-slate-500 text-xs">
                            Sem dados suficientes.
                          </p>
                        ) : (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={(() => {
                                  const map = new Map();
                                  tempoPorMes.forEach((p) => {
                                    const row =
                                      map.get(p.mes_ref) ||
                                      { mes_ref: p.mes_ref };
                                    row.tempo =
                                      p.tempo_medio_pagamento_dias ?? null;
                                    map.set(p.mes_ref, row);
                                  });
                                  parcelasPorMes.forEach((p) => {
                                    const row =
                                      map.get(p.mes_ref) ||
                                      { mes_ref: p.mes_ref };
                                    row.parcelas =
                                      p.media_parcelas_pond ?? null;
                                    map.set(p.mes_ref, row);
                                  });
                                  return Array.from(map.values()).sort((a, b) =>
                                    String(a.mes_ref).localeCompare(String(b.mes_ref))
                                  );
                                })()}
                              >
                                <CartesianGrid
                                  stroke="#1f2937"
                                  strokeDasharray="3 3"
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="mes_ref"
                                  tickFormatter={formatMesRef}
                                  stroke="#64748b"
                                  fontSize={11}
                                />
                                <YAxis
                                  stroke="#64748b"
                                  fontSize={11}
                                  tickFormatter={(v) => v}
                                />
                                <Tooltip
                                  content={(props) => (
                                    <ChartTooltip
                                      {...props}
                                      formatter={(value, p) =>
                                        p.dataKey === "tempo"
                                          ? `${value.toFixed(1)} dias`
                                          : `${value.toFixed(2)} parcelas`
                                      }
                                    />
                                  )}
                                />
                                <Legend
                                  wrapperStyle={{
                                    fontSize: 10,
                                    color: "#cbd5f5",
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="tempo"
                                  name="Dias médios"
                                  stroke={chartColors.tempo}
                                  strokeWidth={2}
                                  dot={false}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="parcelas"
                                  name="Parcelas médias"
                                  stroke={chartColors.parcelas}
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* ===============================
                    ABA 03 - CARTEIRA / RANKING
                =============================== */}
                {activeTab === "carteira" && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
                        03 · Ranking de clínicas (último mês fechado)
                      </h2>
                      <p className="text-[11px] text-slate-500 max-w-md text-right">
                        Ordenado por{" "}
                        <span className="text-sky-300">score ajustado</span> no
                        último mês consolidado, com visão de limite aprovado e
                        inadimplência média em 12 meses.
                      </p>
                    </div>

                    <div className="grid lg:grid-cols-[2fr,1fr] gap-4">
                      {/* Tabela de ranking */}
                      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 overflow-x-auto">
                        {ranking.length === 0 ? (
                          <p className="text-slate-500 text-xs">
                            Ainda não há dados suficientes para o ranking.
                          </p>
                        ) : (
                          <table className="min-w-full text-xs sm:text-sm">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-800">
                                <th className="py-2 pr-3 text-left">#</th>
                                <th className="py-2 pr-3 text-left">Clínica</th>
                                <th className="py-2 pr-3 text-left">Score</th>
                                <th className="py-2 pr-3 text-left">Risco</th>
                                <th className="py-2 pr-3 text-left">
                                  Limite aprovado
                                </th>
                                <th className="py-2 pr-3 text-left">
                                  Valor emitido (12M)
                                </th>
                                <th className="py-2 pr-3 text-left">
                                  Inadimplência (12M)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {ranking.map((row, idx) => {
                                const isSelected =
                                  clinicaId !== "todas" &&
                                  clinicaId === row.clinica_id;
                                return (
                                  <tr
                                    key={row.clinica_id || idx}
                                    onClick={() => {
                                      setClinicaId(row.clinica_id || "todas");
                                      setActiveTab("decisao");
                                    }}
                                    className={`border-b border-slate-800/60 last:border-b-0 hover:bg-slate-900/70 transition cursor-pointer ${
                                      isSelected
                                        ? "bg-sky-500/5 border-sky-500/60"
                                        : ""
                                    }`}
                                  >
                                    <td className="py-2 pr-3 text-slate-500">
                                      {idx + 1}
                                    </td>
                                    <td className="py-2 pr-3">
                                      <div className="flex flex-col">
                                        <span className="text-slate-100">
                                          {row.clinica_nome || "-"}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                          {row.cnpj || ""}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2 pr-3">
                                      <span className="text-sky-300">
                                        {row.score_credito != null
                                          ? row.score_credito.toFixed(3)
                                          : "-"}
                                      </span>
                                    </td>
                                    <td className="py-2 pr-3">
                                      <span className="px-2 py-1 rounded-full bg-slate-800 text-[11px] text-emerald-300">
                                        {row.categoria_risco || "-"}
                                      </span>
                                    </td>
                                    <td className="py-2 pr-3">
                                      {formatCurrency(row.limite_aprovado)}
                                    </td>
                                    <td className="py-2 pr-3">
                                      {formatCurrency(
                                        row.valor_total_emitido_12m
                                      )}
                                    </td>
                                    <td className="py-2 pr-3">
                                      {formatPercent(
                                        row.inadimplencia_media_12m
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                        <p className="text-[10px] text-slate-500 mt-2">
                          Dica: clique em uma clínica para carregar o painel de
                          decisão já filtrado para ela.
                        </p>
                      </div>

                      {/* Gráfico Top 5 */}
                      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
                        <p className="text-slate-300 text-xs mb-3">
                          Top 5 clínicas por score (último mês)
                        </p>
                        {rankingTop5.length === 0 ? (
                          <p className="text-slate-500 text-xs">
                            Sem dados suficientes para o ranking.
                          </p>
                        ) : (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={rankingTop5.map((r) => ({
                                  nome:
                                    (r.clinica_nome || "").slice(0, 18) +
                                    (r.clinica_nome &&
                                    r.clinica_nome.length > 18
                                      ? "…"
                                      : ""),
                                  score: r.score_credito,
                                  volume: r.valor_total_emitido_12m,
                                }))}
                                layout="vertical"
                              >
                                <CartesianGrid
                                  stroke="#1f2937"
                                  strokeDasharray="3 3"
                                  horizontal={false}
                                />
                                <XAxis
                                  type="number"
                                  stroke="#64748b"
                                  fontSize={10}
                                />
                                <YAxis
                                  type="category"
                                  dataKey="nome"
                                  stroke="#64748b"
                                  fontSize={10}
                                  width={90}
                                />
                                <Tooltip
                                  content={(props) => (
                                    <ChartTooltip
                                      {...props}
                                      formatter={(value, p) =>
                                        p.dataKey === "score"
                                          ? value.toFixed(3)
                                          : formatCurrency(value)
                                      }
                                    />
                                  )}
                                />
                                <Legend
                                  wrapperStyle={{
                                    fontSize: 10,
                                    color: "#cbd5f5",
                                  }}
                                />
                                <Bar
                                  dataKey="score"
                                  name="Score"
                                  fill={chartColors.score}
                                  radius={[0, 4, 4, 0]}
                                />
                                <Bar
                                  dataKey="volume"
                                  name="Volume 12M"
                                  fill={chartColors.volume}
                                  radius={[0, 4, 4, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </>
        )}

        {/* MODAL DE APROVAÇÃO DE LIMITE */}
        {modalLimiteAberto && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl shadow-slate-900/70 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-100">
                  Aprovar limite de crédito
                </h3>
                <button
                  type="button"
                  onClick={() => !salvandoLimite && setModalLimiteAberto(false)}
                  className="text-slate-500 hover:text-slate-200 text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] text-slate-400 mb-3">
                Clínica:{" "}
                <span className="text-sky-300 font-medium">
                  {contexto?.clinica_nome || "-"}
                </span>
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Limite aprovado (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={novoLimiteAprovado}
                    onChange={(e) => setNovoLimiteAprovado(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                    placeholder="Ex.: 150000"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Limite sugerido pelo modelo (referência):{" "}
                    <span className="text-sky-300">
                      {formatCurrency(limiteSugerido)}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Observação (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={observacaoLimite}
                    onChange={(e) => setObservacaoLimite(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-[11px] text-slate-100 outline-none focus:border-sky-500 resize-none"
                    placeholder="Ex.: aprovado em comitê, condicionado a manutenção de inadimplência abaixo de 2%..."
                  />
                </div>

                <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-3 py-2 text-[10px] text-slate-400 space-y-1">
                  <p>
                    <span className="text-sky-300 font-medium">
                      Resumo técnico:
                    </span>{" "}
                    o limite sugerido considera a média dos últimos 12M, 3M e
                    último mês, ponderados pelo score de risco da clínica.
                  </p>
                  <p>
                    O valor aprovado aqui será registrado na tabela{" "}
                    <span className="font-mono text-slate-300">
                      clinica_limite
                    </span>{" "}
                    e passará a aparecer como{" "}
                    <span className="text-emerald-300">limite_aprovado</span> no
                    painel.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  type="button"
                  disabled={salvandoLimite}
                  onClick={() => !salvandoLimite && setModalLimiteAberto(false)}
                  className="px-3 py-1.5 rounded-full text-[11px] border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={salvandoLimite}
                  onClick={handleSalvarLimite}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] border border-emerald-500 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  {salvandoLimite ? (
                    <>
                      <span className="w-3 h-3 rounded-full border-2 border-emerald-300 border-t-transparent animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[14px]">
                        done_all
                      </span>
                      Confirmar aprovação
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
