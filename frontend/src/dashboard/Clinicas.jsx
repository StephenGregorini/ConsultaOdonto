import React, { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  Search,
  SlidersHorizontal,
  X,
  ArrowRight,
  Info,
} from "lucide-react";
import { API_BASE_URL } from "../apiConfig";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "../DashboardContext";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "../components/ui/Modal";

// ===========================
// Painel Lateral (memoizado)
// ===========================
const PainelClinica = React.memo(function PainelClinica({
  clinica,
  fmt,
  fmtPct,
  onClose,
  onRevokeClick,
  onAprovarEditar,
  onVerDashboard,
}) {
  if (!clinica) return null;
  const c = clinica;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-md h-full bg-slate-950 border-l border-slate-800 shadow-2xl p-6 flex flex-col"
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-slate-100 font-semibold text-lg">
                {c.clinica_nome || "Carregando..."}
              </h3>
              {c.cnpj && (
                <p className="text-[11px] text-slate-500 mt-1">
                  CNPJ: {c.cnpj}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full border border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-500 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* KPIs */}
          <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-3">
              <p className="text-slate-500">Limite aprovado</p>
              <p className="text-emerald-300 font-semibold text-sm mt-1">
                {fmt(c.limite_aprovado)}
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-3">
              <p className="text-slate-500">Limite sugerido</p>
              <p className="text-sky-300 font-semibold text-sm mt-1">
                {fmt(c.limite_sugerido)}
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-3">
              <p className="text-slate-500">Inadimplência média</p>
              <p className="text-rose-300 font-semibold text-sm mt-1">
                {fmtPct(c.inadimplencia_media_periodo)}
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-3">
              <p className="text-slate-500">Volume acumulado</p>
              <p className="text-sky-300 font-semibold text-sm mt-1">
                {fmt(c.valor_total_emitido_periodo)}
              </p>
            </div>
          </div>

          {/* Alertas */}
          <div className="mt-6 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5" />
              <p className="text-slate-400">
                Diferença entre limite sugerido e aprovado:
                <span className="text-sky-300 font-medium ml-1">
                  {fmt(
                    (c.limite_sugerido || 0) - (c.limite_aprovado || 0)
                  )}
                </span>
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="mt-auto pt-6 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onRevokeClick}
                className="w-full px-3 py-2.5 rounded-xl text-[13px] border border-rose-500/80 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition"
              >
                Revogar
              </button>
              <button
                onClick={onAprovarEditar}
                className="w-full px-3 py-2.5 rounded-xl text-[13px] border border-emerald-500/80 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition"
              >
                Aprovar/Editar
              </button>
            </div>

            <button
              onClick={onVerDashboard}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[13px] border border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-700/50 transition"
            >
              Ver dashboard completo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default function Clinicas() {
  const [clinicas, setClinicas] = useState([]);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [scoreMin, setScoreMin] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showConfirmRevoke, setShowConfirmRevoke] = useState(false);

  const navigate = useNavigate();
  const {
    dados,
    loadingDashboard,
    setPanelLimiteAberto,
    reloadDashboard,
    profile,
    clinicaId,
    setClinicaId,
  } = useDashboard();

  // ===========================
  // 1) Carregar lista de clínicas
  // ===========================
  useEffect(() => {
    if (!dados?.ranking_clinicas) return;

    const clinicasComDados = [...(dados.ranking_clinicas || [])];

    // Ordenação por categoria e score
    const catOrder = { A: 1, B: 2, C: 3, D: 4, E: 5 };

    clinicasComDados.sort((a, b) => {
      const c1 = catOrder[a.categoria_risco] || 999;
      const c2 = catOrder[b.categoria_risco] || 999;

      if (c1 !== c2) return c1 - c2;

      return (b.score_credito ?? 0) - (a.score_credito ?? 0);
    });

    setClinicas(clinicasComDados);
  }, [dados]);

  // ===========================
  // 2) Resumo do portfólio
  // ===========================
  const resumo = useMemo(() => {
    if (!clinicas.length) {
      return {
        totalClinicas: 0,
        totalLimiteAprovado: 0,
        totalLimiteSugerido: 0,
        inadimplenciaMedia: null,
        volumeAcumulado: 0,
        distCategorias: {},
      };
    }

    const totalClinicas = clinicas.length;
    let somaLimiteAprovado = 0;
    let somaLimiteSugerido = 0;
    let somaInadimplencia = 0;
    let countInadimplencia = 0;
    let somaVolume = 0;
    const distCategorias = {};

    clinicas.forEach((c) => {
      somaLimiteAprovado += c.limite_aprovado || 0;
      somaLimiteSugerido += c.limite_sugerido || 0;
      somaVolume += c.valor_total_emitido_periodo || 0;

      if (
        c.inadimplencia_media_periodo !== null &&
        c.inadimplencia_media_periodo !== undefined
      ) {
        somaInadimplencia += c.inadimplencia_media_periodo;
        countInadimplencia += 1;
      }

      if (c.categoria_risco) {
        distCategorias[c.categoria_risco] =
          (distCategorias[c.categoria_risco] || 0) + 1;
      } else {
        distCategorias["-"] = (distCategorias["-"] || 0) + 1;
      }
    });

    const inadimplenciaMedia =
      countInadimplencia > 0
        ? somaInadimplencia / countInadimplencia
        : null;

    return {
      totalClinicas,
      totalLimiteAprovado: somaLimiteAprovado,
      totalLimiteSugerido: somaLimiteSugerido,
      inadimplenciaMedia,
      volumeAcumulado: somaVolume,
      distCategorias,
    };
  }, [clinicas]);

  // ===========================
  // 3) Filtragem
  // ===========================
  const filtradas = useMemo(() => {
    return clinicas.filter((c) => {
      const nomeOk = (c.clinica_nome || "")
        .toLowerCase()
        .includes(filtroNome.toLowerCase());

      const catOk =
        filtroCategoria === "todas" ||
        (c.categoria_risco || "").toUpperCase() === filtroCategoria;

      const sc = c.score_credito ?? 0;
      const scoreOk = sc >= scoreMin;

      return nomeOk && catOk && scoreOk;
    });
  }, [clinicas, filtroNome, filtroCategoria, scoreMin]);

  // ===========================
  // Formatadores
  // ===========================
  const fmt = (v) =>
    v !== null && v !== undefined
      ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "-";

  const fmtPct = (v) =>
    v !== null && v !== undefined ? `${(v * 100).toFixed(1)}%` : "-";

  // ===========================
  // Badge categoria
  // ===========================
  function CategoriaBadge({ cat }) {
    const colors = {
      A: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
      B: "bg-sky-500/15 text-sky-300 border-sky-500/40",
      C: "bg-amber-500/15 text-amber-300 border-amber-500/40",
      D: "bg-orange-500/15 text-orange-300 border-orange-500/40",
      E: "bg-rose-500/15 text-rose-300 border-rose-500/40",
      "-": "bg-slate-700/40 text-slate-300 border-slate-600",
    };

    const label = cat || "-";

    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[11px] border inline-flex items-center gap-1 ${
          colors[label] || colors["-"]
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            label === "A"
              ? "bg-emerald-400"
              : label === "B"
              ? "bg-sky-400"
              : label === "C"
              ? "bg-amber-400"
              : label === "D"
              ? "bg-orange-400"
              : label === "E"
              ? "bg-rose-400"
              : "bg-slate-400"
          }`}
        />
        {label}
      </span>
    );
  }

  // ===========================
  // Skeleton Loader
  // ===========================
  const SkeletonCard = () => (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-32 bg-slate-800 rounded" />
        <div className="h-4 w-10 bg-slate-800 rounded-full" />
      </div>
      <div className="h-3 w-24 bg-slate-800 rounded mb-4" />
      <div className="space-y-2">
        <div className="h-3 w-40 bg-slate-800 rounded" />
        <div className="h-3 w-32 bg-slate-800 rounded" />
        <div className="h-3 w-36 bg-slate-800 rounded" />
        <div className="h-3 w-28 bg-slate-800 rounded" />
        <div className="h-3 w-44 bg-slate-800 rounded" />
      </div>
      <div className="mt-4 h-8 w-full bg-slate-800 rounded-xl" />
    </div>
  );

  // ===========================
  // Clínica selecionada (memo)
  // ===========================
  const clinicaSelecionada = useMemo(() => {
    if (!clinicaId || clinicaId === "todas") return null;
    return clinicas.find((c) => c.clinica_id === clinicaId) || null;
  }, [clinicas, clinicaId]);

  // ===========================
  // Revogação de limite
  // ===========================
  async function confirmRevoke() {
    try {
      if (!clinicaSelecionada) return;

      const payload = {
        limite_aprovado: null,
        observacao: "Limite revogado pelo painel de portfólio",
        aprovado_por: profile?.nome || profile?.email || "admin",
      };

      const r = await fetch(
        `${API_BASE_URL}/clinicas/${clinicaSelecionada.clinica_id}/limite_aprovado`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!r.ok) throw new Error("Erro ao revogar limite");

      await reloadDashboard();
      setClinicaId("todas");
      setShowConfirmRevoke(false);
    } catch (error) {
      console.error("Erro ao revogar limite:", error);
    }
  }

  // ===========================
  // RENDER
  // ===========================
  return (
    <>
      <section className="space-y-6">
        {/* Título + Ação */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-slate-200 text-lg font-semibold tracking-tight">
              Portfólio de Clínicas
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Visão consolidada de risco, limite e histórico financeiro das
              clínicas.
            </p>
          </div>

          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 bg-slate-900/80 hover:border-sky-500/60 hover:text-sky-200 transition"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros avançados
          </button>
        </div>

        {/* Resumo do portfólio */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-3">
            <p className="text-[11px] text-slate-500">Total de clínicas</p>
            <p className="text-slate-100 text-xl font-semibold mt-1">
              {loadingDashboard ? "..." : resumo.totalClinicas}
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-3">
            <p className="text-[11px] text-slate-500">
              Limite aprovado (total)
            </p>
            <p className="text-emerald-300 text-sm font-semibold mt-1">
              {loadingDashboard ? "..." : fmt(resumo.totalLimiteAprovado)}
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-3">
            <p className="text-[11px] text-slate-500">
              Limite sugerido (total)
            </p>
            <p className="text-sky-300 text-sm font-semibold mt-1">
              {loadingDashboard ? "..." : fmt(resumo.totalLimiteSugerido)}
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-3">
            <p className="text-[11px] text-slate-500">
              Inadimplência média do portfólio
            </p>
            <p className="text-rose-300 text-sm font-semibold mt-1">
              {loadingDashboard ? "..." : fmtPct(resumo.inadimplenciaMedia)}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-10 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-sky-500"
                placeholder="Buscar clínica por nome..."
                value={filtroNome}
                onChange={(e) => setFiltroNome(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Score mínimo</span>
                <span className="text-sky-300 font-medium">
                  {scoreMin.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={scoreMin}
                onChange={(e) => setScoreMin(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-slate-500 mr-1">Categoria de risco:</span>
            {["todas", "A", "B", "C", "D", "E"].map((cat) => {
              const isActive = filtroCategoria === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setFiltroCategoria(cat)}
                  className={`px-2.5 py-1 rounded-full border text-[11px] transition ${
                    isActive
                      ? "border-sky-500 bg-sky-500/10 text-sky-200"
                      : "border-slate-700 text-slate-300 hover:border-sky-500/60 hover:text-sky-200"
                  }`}
                >
                  {cat === "todas" ? "Todas" : `Categoria ${cat}`}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-xs space-y-3"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <p className="text-slate-400">
                  Aqui podemos adicionar futuramente filtros por faixa de
                  limite, inadimplência, volume, etc. (estrutura já pronta).
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Lista de Clínicas */}
        {loadingDashboard ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Nenhuma clínica encontrada com os filtros atuais.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtradas.map((c) => {
              const diffLimite =
                (c.limite_sugerido || 0) - (c.limite_aprovado || 0);
              const destaqueLimite =
                diffLimite > 0 &&
                (c.categoria_risco === "A" || c.categoria_risco === "B");

              return (
                <motion.div
                  key={c.clinica_id}
                  className={`relative bg-slate-900/80 border rounded-2xl p-5 shadow-lg cursor-pointer group transition ${
                    destaqueLimite
                      ? "border-sky-500/60 shadow-sky-900/40"
                      : "border-slate-800 hover:border-sky-500/40"
                  }`}
                  whileHover={{ y: -2 }}
                  onClick={() => setClinicaId(c.clinica_id)}
                >
                  {/* Barra lateral */}
                  <div
                    className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${
                      c.categoria_risco === "A"
                        ? "bg-emerald-500/80"
                        : c.categoria_risco === "B"
                        ? "bg-sky-500/80"
                        : c.categoria_risco === "C"
                        ? "bg-amber-500/80"
                        : c.categoria_risco === "D"
                        ? "bg-orange-500/80"
                        : c.categoria_risco === "E"
                        ? "bg-rose-500/80"
                        : "bg-slate-600/80"
                    }`}
                  />

                  <div className="flex items-start justify-between gap-3 pl-1">
                    <div className="flex-1">
                      <p className="text-slate-200 font-semibold text-sm group-hover:text-sky-300 line-clamp-2">
                        {c.clinica_nome}
                      </p>
                      {c.cnpj && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          {c.cnpj}
                        </p>
                      )}
                    </div>

                    <CategoriaBadge cat={c.categoria_risco} />
                  </div>

                  {/* Score */}
                  <div className="mt-4 flex flex-col pl-1">
                    <span className="text-[11px] text-slate-500">Score</span>
                    <span className="text-sky-300 font-medium text-sm -mt-0.5">
                      {c.score_credito?.toFixed(3) || "-"}
                    </span>
                  </div>
                  <div className="mt-4 space-y-1.5 text-xs text-slate-300 pl-1">
                    <p>
                      <span className="text-slate-500">
                        Limite aprovado:
                      </span>{" "}
                      <span className="text-emerald-300">
                        {fmt(c.limite_aprovado)}
                      </span>
                    </p>

                    <p>
                      <span className="text-slate-500">
                        Limite sugerido:
                      </span>{" "}
                      <span className="text-sky-300">
                        {fmt(c.limite_sugerido)}
                      </span>
                    </p>

                    <p>
                      <span className="text-slate-500">Inadimplência:</span>{" "}
                      <span className="text-rose-300">
                        {fmtPct(c.inadimplencia_media_periodo)}
                      </span>
                    </p>

                    <p>
                      <span className="text-slate-500">
                        Volume acumulado:
                      </span>{" "}
                      <span className="text-sky-300">
                        {fmt(c.valor_total_emitido_periodo)}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/dashboard?clinica=${c.clinica_id}`);
                    }}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] border border-sky-500 text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 transition"
                  >
                    Abrir Dashboard
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Painel lateral */}
      {clinicaSelecionada && (
        <PainelClinica
          clinica={clinicaSelecionada}
          fmt={fmt}
          fmtPct={fmtPct}
          onClose={() => setClinicaId("todas")}
          onRevokeClick={() => setShowConfirmRevoke(true)}
          onAprovarEditar={() => setPanelLimiteAberto(true)}
          onVerDashboard={() =>
            navigate(`/admin/dashboard?clinica=${clinicaSelecionada.clinica_id}`)
          }
        />
      )}

      {/* Modal de confirmação de revogação */}
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
            {clinicaSelecionada && (
              <p className="text-slate-400 text-sm mt-2">
                Tem certeza que deseja revogar o limite de crédito da clínica{" "}
                <span className="font-bold text-slate-200">
                  {clinicaSelecionada.clinica_nome}
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
