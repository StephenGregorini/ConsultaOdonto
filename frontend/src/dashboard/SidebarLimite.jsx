// /dashboard/SidebarLimite.jsx
import React, { useState, useEffect } from "react";
import { useDashboard } from "../DashboardContext";
import { formatCurrency } from "../utils/formatters";
import Modal from "../components/ui/Modal";
import { API_BASE_URL } from "../apiConfig";

function parseBrazilianCurrency(value) {
  if (!value) return 0;
  return Number(String(value).replace(/\./g, "").replace(",", "."));
}

export default function SidebarLimite({ open, onClose }) {
  const {
    dados,
    clinicaId,
    profile,
    reloadDashboard,
    setPanelLimiteAberto,
    loadingDashboard,
  } = useDashboard();

  const k = dados?.kpis || {};
  const nome = dados?.contexto?.clinica_nome || "-";

  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [showConfirmRevoke, setShowConfirmRevoke] = useState(false);

  useEffect(() => {
    if (dados) {
      const valorAtual = k.limite_aprovado;
      const valorSug = k.limite_sugerido;
      const inicial =
        valorAtual != null && !Number.isNaN(valorAtual)
          ? valorAtual
          : valorSug != null && !Number.isNaN(valorSug)
          ? valorSug
          : "";
      setValor(inicial !== "" ? String(Math.round(Number(inicial))).replace(".", ",") : "");
    }
  }, [dados, k.limite_aprovado, k.limite_sugerido]);

  if (!open) return null;

  async function salvar(limite) {
    if (!clinicaId || clinicaId === "todas") return;

    try {
      setSaving(true);
      setMensagem(null);

      const payload = {
        limite_aprovado: limite,
        observacao: obs || null,
        aprovado_por: profile?.nome || profile?.email || "admin",
        faturamento_base: k.limite_sugerido_base_mensal_mix || null,
        score_base: k.score_atual || null,
      };


      const r = await fetch(`${API_BASE_URL}/clinicas/${clinicaId}/limite_aprovado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) throw new Error("Erro ao salvar");

      await reloadDashboard();
      setMensagem({ tipo: "sucesso", texto: "Limite salvo com sucesso!" });
      setTimeout(() => {
        setPanelLimiteAberto(false);
        setMensagem(null);
      }, 1000);
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: "erro", texto: "Erro ao salvar limite." });
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    const numericValue = parseBrazilianCurrency(valor);
    if (numericValue < 0) {
      setMensagem({ tipo: "erro", texto: "O valor do limite não pode ser negativo." });
      return;
    }
    salvar(numericValue);
  }

  function handleRevoke() {
    setShowConfirmRevoke(true);
  }

  function confirmRevoke() {
    salvar(null);
    setShowConfirmRevoke(false);
  }

  return (
    <>
      <Modal open={showConfirmRevoke} onClose={() => setShowConfirmRevoke(false)}>
        <h3 className="text-lg font-semibold text-slate-100">Revogar limite</h3>
        <p className="text-slate-400 text-sm mt-2">
          Tem certeza que deseja revogar o limite de crédito desta clínica? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => setShowConfirmRevoke(false)}
            className="px-3 py-1.5 rounded-full text-[11px] border border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={confirmRevoke}
            className="px-3 py-1.5 rounded-full text-[11px] border border-rose-500 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
          >
            Revogar
          </button>
        </div>
      </Modal>

      <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-40 flex justify-end">
        <div className="w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-[0_0_40px_rgba(15,23,42,0.9)] flex flex-col">

          {/* HEADER */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-sky-400 mb-1">
                Aprovação de limite
              </p>
              <h3 className="text-sm font-semibold text-slate-100">
                {nome}
              </h3>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="text-slate-500 hover:text-slate-200 text-sm"
            >
              ✕
            </button>
          </div>

          {/* CONTENT */}
          {loadingDashboard ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-400 text-sm animate-pulse">Carregando dados da clínica...</p>
            </div>
          ) : (
            <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Limite aprovado (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                  placeholder="Ex.: 1.000,00"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Referência do modelo:{" "}
                  <span className="text-sky-300">{formatCurrency(k.limite_sugerido)}</span>
                </p>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Observação (opcional)
                </label>
                <textarea
                  rows={3}
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-[11px] text-slate-100 outline-none focus:border-sky-500 resize-none"
                  placeholder="Ex.: aprovado em comitê de crédito..."
                />
              </div>

              {mensagem && (
                <div
                  className={`rounded-lg px-3 py-2 text-xs border ${
                    mensagem.tipo === "erro"
                      ? "bg-rose-900/40 border-rose-500/60 text-rose-100"
                      : "bg-emerald-900/30 border-emerald-500/60 text-emerald-100"
                  }`}
                >
                  {mensagem.texto}
                </div>
              )}
            </div>
          )}

          {/* FOOTER */}
          <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-950/95">
            <button
              type="button"
              disabled={saving || loadingDashboard}
              onClick={handleRevoke}
              className="px-3 py-1.5 rounded-full text-[11px] border border-rose-500 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 disabled:opacity-60"
            >
              Revogar
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving || loadingDashboard}
                onClick={onClose}
                className="px-3 py-1.5 rounded-full text-[11px] border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving || loadingDashboard}
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] border border-emerald-500 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Confirmar aprovação"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
