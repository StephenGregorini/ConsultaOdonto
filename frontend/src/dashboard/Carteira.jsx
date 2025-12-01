// /dashboard/Carteira.jsx
import React from "react";
import { useDashboard } from "../DashboardContext";
import { formatCurrency, formatPercent } from "../utils/formatters";

export default function Carteira() {
  const { dados, setClinicaId, setActiveTab } = useDashboard();

  if (!dados) return null;
  
  const ranking = dados.ranking_clinicas || [];

  return (
    <section className="space-y-6">
      <h2 className="text-slate-300 text-sm uppercase font-semibold tracking-wide">
        04 · Carteira e ranking
      </h2>

      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 overflow-x-auto">
        {ranking.length === 0 ? (
          <p className="text-slate-500 text-xs">Sem dados suficientes.</p>
        ) : (
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="py-2 pr-3 text-left">#</th>
                <th className="py-2 pr-3 text-left">Clínica</th>
                <th className="py-2 pr-3 text-left">Score</th>
                <th className="py-2 pr-3 text-left">Risco</th>
                <th className="py-2 pr-3 text-left">Limite</th>
                <th className="py-2 pr-3 text-left">Volume (período)</th>
                <th className="py-2 pr-3 text-left">Inad (período)</th>
              </tr>
            </thead>

            <tbody>
              {ranking.map((row, idx) => (
                <tr
                  key={row.clinica_id}
                  className="border-b border-slate-800/60 hover:bg-slate-900/70 cursor-pointer"
                  onClick={() => {
                    setClinicaId(row.clinica_id);
                    setActiveTab("decisao");
                  }}
                >
                  <td className="py-2 pr-3 text-slate-500">{idx + 1}</td>
                  <td className="py-2 pr-3 text-slate-100">{row.clinica_nome}</td>
                  <td className="py-2 pr-3">
                    <span className="text-sky-300">
                      {row.score_credito?.toFixed(3)}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="px-2 py-1 rounded-full bg-slate-800 text-emerald-300 text-xs">
                      {row.categoria_risco}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{formatCurrency(row.limite_aprovado)}</td>
                  <td className="py-2 pr-3">{formatCurrency(row.valor_total_emitido_periodo)}</td>
                  <td className="py-2 pr-3 text-rose-300">{formatPercent(row.inadimplencia_media_periodo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
