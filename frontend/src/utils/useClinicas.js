import { useState, useEffect } from "react";
import { API_BASE_URL } from "../apiConfig";

export function useClinicas() {
  const [clinicas, setClinicas] = useState([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    try {
      setLoading(true);

      // 🔥 Correção: usar API_BASE_URL, NÃO 127.0.0.1
      const res = await fetch(`${API_BASE_URL}/dashboard/clinicas`);

      if (!res.ok) {
        console.error("Erro ao buscar clínicas:", res.status);
        setClinicas([]);
        return;
      }

      const json = await res.json();
      setClinicas(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("Erro ao carregar clínicas:", err);
      setClinicas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return { clinicas, loading, reloadClinicas: carregar };
}
