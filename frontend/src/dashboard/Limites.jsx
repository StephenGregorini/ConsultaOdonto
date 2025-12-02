import React, { useState } from "react";
import { useDashboard } from "../DashboardContext";
import { formatCurrency } from "../utils/formatters";
import { API_BASE_URL } from "../apiConfig";
import Modal from "../components/ui/Modal";
import { AlertTriangle } from "lucide-react";

export default function Limites() {
  const { dados, setPanelLimiteAberto, setClinicaId, reloadDashboard, profile } = useDashboard();
  const [filter, setFilter] = useState("");
  const [showConfirmRevoke, setShowConfirmRevoke] = useState(false);
  const [selectedClinica, setSelectedClinica] = useState(null);

  if (!dados || !dados.ranking_clinicas) {
    return null;
  }

  const ranking = dados.ranking_clinicas;

  const handleApprove = (clinicaId) => {
    setClinicaId(clinicaId);
    setPanelLimiteAberto(true);
  };

  const handleRevokeClick = (clinica) => {
    setSelectedClinica(clinica);
    setShowConfirmRevoke(true);
  };

  const confirmRevoke = async () => {
    if (!selectedClinica) return;
    
    try {
      const payload = {
        limite_aprovado: null,
        observacao: "Limite revogado",
        aprovado_por: profile?.nome || profile?.email || "admin",
      };

      const r = await fetch(`${API_BASE_URL}/clinicas/${selectedClinica.clinica_id}/limite_aprovado`, {
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
    } finally {
      setShowConfirmRevoke(false);
      setSelectedClinica(null);
    }
  };

  const filteredRanking = ranking.filter(c => 
    c.clinica_nome.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
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
                        onClick={() => handleRevokeClick(c)}
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

      <Modal
        open={showConfirmRevoke}
        onClose={() => setShowConfirmRevoke(false)}
      >
        <div className="flex items-start gap-3">
          <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-rose-900/50 sm:mx-0 sm:h-10 sm:w-10">
            <AlertTriangle
              className="h-6 w-6 text-rose-400"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-100">
              Revogar limite
            </h3>
            {selectedClinica && (
              <p className="text-slate-400 text-sm mt-2">
                Tem certeza que deseja revogar o limite de crédito da clínica{" "}
                <span className="font-bold text-slate-200">
                  {selectedClinica.clinica_nome}
                </span>
                ?
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setShowConfirmRevoke(false)}
            className="px-4 py-2 rounded-xl text-sm border border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={confirmRevoke}
            className="px-4 py-2 rounded-xl text-sm border border-rose-500 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
          >
            Sim, revogar limite
          </button>
        </div>
      </Modal>
    </>
  );
}
