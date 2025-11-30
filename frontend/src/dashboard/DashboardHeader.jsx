import React from "react";
import { useDashboard } from "../DashboardContext";
import { formatMesRef } from "../utils/formatters";

export default function DashboardHeader({ onExport }) {
  const { profile, dados } = useDashboard();
  const periodo = dados?.filtros?.periodo;
  const contexto = dados?.contexto;

  return (
    <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
      
      {/* Título */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 border border-sky-500/40 px-3 py-1 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] tracking-wide text-sky-200 uppercase">
            Motor de crédito · MedSimples
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-100">
          Painel de <span className="text-sky-400">crédito e risco</span>
        </h1>

        <p className="text-slate-300 max-w-2xl text-sm sm:text-base mt-2">
          Visão de risco, inadimplência, comportamento e limites recomendados para cada clínica.
        </p>
      </div>

      {/* Infos do canto direito */}
      <div className="text-right text-xs text-slate-400 space-y-0.5">
        <div>
          Período disponível:{" "}
          <span className="font-semibold text-sky-300">
            {periodo?.min_mes_ref ? formatMesRef(periodo.min_mes_ref) : "-"} —{" "}
            {periodo?.max_mes_ref ? formatMesRef(periodo.max_mes_ref) : "-"}
          </span>
        </div>

        <div>
          Contexto:{" "}
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
        <button 
          onClick={onExport} 
          className="mt-2 px-3 py-1 bg-sky-600 text-white rounded hover:bg-sky-700 text-sm"
        >
          Exportar para XLSX
        </button>
      </div>
    </header>
  );
}
