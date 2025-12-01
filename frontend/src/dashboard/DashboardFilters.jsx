import React from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "../DashboardContext";
import Card from "../components/ui/Card";
import Select from "../components/ui/Select";
import { MESES } from "../utils/theme";
import { formatMesRef } from "../utils/formatters";

const ANOS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));


export default function DashboardFilters() {
  const {
    clinicas,
    loadingClinicas,
    clinicaId,
    setClinicaId,
    janelaMeses,
    setJanelaMeses,
    periodoInicio,
    setPeriodoInicio,
    periodoFim,
    setPeriodoFim,
    dados,
  } = useDashboard();

  
  const navigate = useNavigate();

  const handleClinicaChange = (newClinicaId) => {
    setClinicaId(newClinicaId);
    const newSearch = newClinicaId === 'todas' ? '' : `?clinica=${newClinicaId}`;
    navigate(`/admin/dashboard${newSearch}`, { replace: true });
  };

  const listaClinicas = Array.isArray(clinicas) ? clinicas : [];

  const inicioAno = periodoInicio?.split("-")[0] ?? "";
  const inicioMes = periodoInicio?.split("-")[1] ?? "";

  const fimAno = periodoFim?.split("-")[0] ?? "";
  const fimMes = periodoFim?.split("-")[1] ?? "";

  const periodoCustom = !!(periodoInicio && periodoFim);

  const periodoMin = dados?.filtros?.periodo?.min_mes_ref;
  const periodoMax = dados?.filtros?.periodo?.max_mes_ref;

  return (
    <Card className="p-6 mb-6">
      {/* Título */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-200">
          Filtros do Painel
        </h2>

        <p className="text-[11px] text-slate-500">
          {periodoMin && periodoMax ? (
            <>
              Dados disponíveis:{" "}
              <span className="text-sky-300 font-medium">
                {formatMesRef(periodoMin)} — {formatMesRef(periodoMax)}
              </span>
            </>
          ) : (
            "Carregando período..."
          )}
        </p>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* CLÍNICA */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Clínica
          </span>

          <Select
            value={clinicaId ?? "todas"}
            onChange={handleClinicaChange}
            loading={loadingClinicas}
            options={[
              { label: "Todas as clínicas", value: "todas" },
              ...listaClinicas.map((c) => ({
                label: c.nome,
                value: c.id,
              })),
            ]}
          />



          {loadingClinicas && (
            <span className="text-[10px] text-slate-500">Carregando...</span>
          )}
        </div>

        {/* JANELA TEMPORAL */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Janela móvel
          </span>

          <Select
            disabled={periodoCustom}
            value={janelaMeses}
            onChange={setJanelaMeses}
            options={[
              { label: "Últimos 6 meses", value: 6 },
              { label: "Últimos 12 meses", value: 12 },
              { label: "Últimos 24 meses", value: 24 },
            ]}
          />

          {periodoCustom && (
            <span className="text-[10px] text-amber-400">
              Janela desativada: período personalizado ativo.
            </span>
          )}
        </div>

        {/* PERÍODO PERSONALIZADO */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Período personalizado
          </span>

          {/* Linha 1 */}
          <div className="flex items-center gap-3">
            <Select
              value={inicioMes}
              onChange={(mes) => {
                if (!mes) {
                  setPeriodoInicio("");
                  return;
                }
                setPeriodoInicio(`${inicioAno || ANOS[0]}-${mes}`);
              }}
              options={[{ label: "Mês", value: "" }, ...MESES.map(m => ({ label: m.label, value: m.value }))]}
            />

            <Select
              value={inicioAno}
              onChange={(ano) => {
                if (!ano) {
                  setPeriodoInicio("");
                  return;
                }
                setPeriodoInicio(`${ano}-${inicioMes || "01"}`);
              }}
              options={[{ label: "Ano", value: "" }, ...ANOS.map((a) => ({ label: a, value: a }))]}
            />
          </div>

          {/* Linha 2 */}
          <div className="flex items-center gap-3 mt-2">
            <Select
              value={fimMes}
              onChange={(mes) => {
                if (!mes) {
                  setPeriodoFim("");
                  return;
                }
                setPeriodoFim(`${inicioAno || ANOS[0]}-${mes}`);
              }}
              options={[{ label: "Mês", value: "" }, ...MESES.map(m => ({ label: m.label, value: m.value }))]}
            />

            <Select
              value={fimAno}
              onChange={(ano) => {
                if (!ano) {
                  setPeriodoFim("");
                  return;
                }
                setPeriodoFim(`${ano}-${fimMes || "12"}`);
              }}
              options={[{ label: "Ano", value: "" }, ...ANOS.map((a) => ({ label: a, value: a }))]}
            />
          </div>

          <span className="text-[10px] text-slate-500 mt-1">
            Preencha início e fim para ativar o período personalizado.
          </span>

          {periodoCustom && (
            <button
              onClick={() => {
                setPeriodoInicio("");
                setPeriodoFim("");
              }}
              className="mt-2 w-full px-3 py-1.5 rounded-md text-xs border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
            >
              Limpar período
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
