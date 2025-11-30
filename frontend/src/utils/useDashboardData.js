import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../apiConfig";

async function fetchHistoricoLimites(clinicaId) {
  if (!clinicaId || clinicaId === "todas") return [];
  try {
    const res = await fetch(`${API_BASE_URL}/clinicas/${clinicaId}/limites`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("Erro ao carregar histórico de limites:", e);
    return [];
  }
}

export function useDashboardData({ clinicaId, janelaMeses, inicio, fim }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    try {
      setLoading(true);
      setErro(null);

      const params = new URLSearchParams();

      if (inicio && fim) {
        params.set("inicio", inicio);
        params.set("fim", fim);
      } else {
        params.set("meses", janelaMeses || 12);
      }

      if (clinicaId && clinicaId !== "todas") {
        params.set("clinica_id", clinicaId);
      }

      const url = `${API_BASE_URL}/dashboard?${params.toString()}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const dashboardData = await res.json();
      const historico = await fetchHistoricoLimites(clinicaId);

      setDados({ ...dashboardData, historico_limite: historico });
    } catch (e) {
      console.error("Erro ao carregar dashboard:", e);
      setErro("Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicaId, janelaMeses, inicio, fim]);

  return {
    dados,
    erro,
    loading,
    reload: carregar,
  };
}
