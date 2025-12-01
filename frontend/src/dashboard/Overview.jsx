// src/dashboard/Overview.jsx
import React from "react";
import { useDashboard } from "../DashboardContext";
import Card from "../components/ui/Card";
import Kpi from "../components/ui/Kpi";
import { formatCurrency, formatPercent } from "../utils/formatters";

export default function Overview() {
  const { dados } = useDashboard();

  if (!dados) return null;

  const k = dados.kpis || {};
  const contexto = dados.contexto || {};
  const periodo = dados.filtros?.periodo || {};

  return (
    <div className="space-y-6">
      {/* HEADER EXECUTIVO */}
      <section>
        <h2 className="text-lg font-semibold text-slate-100 mb-1">
          Resumo executivo
        </h2>
        <p className="text-[13px] text-slate-400 max-w-2xl">
          Visão geral da clínica selecionada, consolidando score, risco,
          inadimplência, volume emitido e demais KPIs essenciais para
          discussão de crédito.
        </p>
      </section>

      {/* LINHA 1 — KPIs PRINCIPAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Score ajustado (0–1)"
          value={k.score_atual != null ? k.score_atual.toFixed(3) : "-"}
          description={`Risco ${k.categoria_risco || "-"}`}
          color="sky"
        />

        <Kpi
          label="Inadimplência real (período)"
          value={formatPercent(k.inadimplencia_media_periodo)}
          description={`Último mês: ${formatPercent(k.inadimplencia_ultimo_mes)}`}
          color="rose"
        />

        <Kpi
          label="Pago no vencimento (período)"
          value={formatPercent(k.taxa_pago_no_vencimento_media_periodo)}
          description={`Último mês: ${formatPercent(k.taxa_pago_no_vencimento_ultimo_mes)}`}
          color="emerald"
        />

        <Kpi
          label="Volume emitido (período)"
          value={formatCurrency(k.valor_total_emitido_periodo)}
          description={`Último mês: ${formatCurrency(k.valor_emitido_ultimo_mes)}`}
          color="sky"
        />
      </div>

      {/* LINHA 2 — OUTROS INDICADORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-slate-400 mb-1">
            Ticket médio ({periodo?.label || "Período"})
          </p>
          <p className="text-xl font-semibold text-slate-100">
            {formatCurrency(k.ticket_medio_periodo)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Último mês:{" "}
            <span className="text-sky-300">
              {formatCurrency(k.ticket_medio_ultimo_mes)}
            </span>
          </p>
        </Card>

        <Card>
          <p className="text-xs text-slate-400 mb-1">
            Dias médios após vencimento ({periodo?.label || "Período"})
          </p>
          <p className="text-xl font-semibold text-slate-100">
            {k.tempo_medio_pagamento_media_periodo != null
              ? `${k.tempo_medio_pagamento_media_periodo.toFixed(1)} dias`
              : "-"}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Último mês:{" "}
            <span className="text-sky-300">
              {k.tempo_medio_pagamento_ultimo_mes != null
                ? `${k.tempo_medio_pagamento_ultimo_mes.toFixed(1)} dias`
                : "-"}
            </span>
          </p>
        </Card>

        <Card>
          <p className="text-xs text-slate-400 mb-1">
            Parcelas médias (ponderado)
          </p>
          <p className="text-xl font-semibold text-slate-100">
            {k.parcelas_media_periodo != null
              ? k.parcelas_media_periodo.toFixed(2)
              : "-"}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Último mês:{" "}
            <span className="text-sky-300">
              {k.parcelas_media_ultimo_mes != null
                ? k.parcelas_media_ultimo_mes.toFixed(2)
                : "-"}
            </span>
          </p>
        </Card>
      </div>

      {/* SEÇÃO: COMENTÁRIO DO MOTOR */}
      <Card>
        <p className="text-sm font-medium text-slate-200">
          Comentário automático do motor
        </p>
        <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
          {k.recomendacao_geral ||
            "Nenhuma recomendação disponível para o período selecionado."}
        </p>
      </Card>
    </div>
  );
}
