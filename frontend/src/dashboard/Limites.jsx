import React, { useState } from "react";
import { useDashboard } from "../DashboardContext";
import { formatCurrency } from "../utils/formatters";
import { API_BASE_URL } from "../apiConfig";

export default function Limites() {
  const { dados, setPanelLimiteAberto, setClinicaId, reloadDashboard, profile } = useDashboard();
  const [filter, setFilter] = useState("");

  if (!dados || !dados.ranking_clinicas) {
    return null;
  }

  const ranking = dados.ranking_clinicas;

  const handleApprove = (clinicaId) => {
    setClinicaId(clinicaId);
    setPanelLimiteAberto(true);
  };

  const handleRevoke = async (clinicaId, clinicaNome) => {
    const confirmation = window.confirm(
      `Tem certeza que deseja revogar o limite da clínica ${clinicaNome}?`
    );
    if (confirmation) {
      try {
        const payload = {
          limite_aprovado: null,
          observacao: "Limite revogado",
          aprovado_por: profile?.nome || profile?.email || "admin",
        };

        const r = await fetch(`${API_BASE_URL}/clinicas/${clinicaId}/limite_aprovado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!r.ok) throw new Error("Erro ao revogar limite");

        alert("Limite revogado com sucesso!");
        reloadDashboard();
      } catch (error) {
        console.error("Erro ao revogar limite:", error);
        alert("Erro ao revogar limite.");
      }
    }
  };

  const filteredRanking = ranking.filter(c => 
    c.clinica_nome.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <section className="space-y-6">
      <h2 className="text-slate-300 text-sm uppercase font-semibold tracking-wide">
        Aprovação de Limites
      </h2>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filtrar clínicas..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Clínica
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Score
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Limite Sugerido
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Limite Aprovado
                </th>
                <th scope="col" className="px-6 py-3 text-center">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRanking.map((c) => (
                <tr
                  key={c.clinica_id}
                  className="bg-slate-900 border-b border-slate-800 hover:bg-slate-800/50"
                >
                  <th
                    scope="row"
                    className="px-6 py-4 font-medium text-slate-200 whitespace-nowrap"
                  >
                    {c.clinica_nome}
                  </th>
                  <td className="px-6 py-4 text-right">{c.score_credito?.toFixed(3) ?? "-"}</td>
                  <td className="px-6 py-4 text-right text-sky-300">
                    {formatCurrency(c.limite_sugerido)}
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-300">
                    {formatCurrency(c.limite_aprovado)}
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    <button
                      onClick={() => handleApprove(c.clinica_id)}
                      className="font-medium text-sky-400 hover:underline"
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleRevoke(c.clinica_id, c.clinica_nome)}
                      className="font-medium text-rose-400 hover:underline"
                    >
                      Revogar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
