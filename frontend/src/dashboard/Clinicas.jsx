import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Clinicas() {
  const [clinicas, setClinicas] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_BASE = "http://127.0.0.1:8000";

  // ===========================
  // 1) Carregar lista de clínicas
  // ===========================
  async function carregarClinicas() {
    try {
      setLoading(true);

      const r = await fetch(`${API_BASE}/dashboard/clinicas`);

      if (!r.ok) throw new Error("Erro ao buscar clínicas");

      const lista = await r.json();

      if (!Array.isArray(lista)) {
        console.warn("Formato inesperado:", lista);
        setClinicas([]);
      } else {
        setClinicas(lista);
      }

    } catch (e) {
      console.error("Erro ao carregar clínicas:", e);
      setClinicas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarClinicas();
  }, []);

  // ===========================
  // Filtragem
  // ===========================
  const filtradas = clinicas.filter((c) =>
    (c.nome || "").toLowerCase().includes(filtro.toLowerCase())
  );

  // ===========================
  // Badge categoria (placeholder)
  // ===========================
  function CategoriaBadge({ cat }) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-700/40 text-slate-300 border border-slate-600">
        {cat || "-"}
      </span>
    );
  }

  // ===========================
  // Render
  // ===========================
  return (
    <section className="space-y-6">

      <h2 className="text-slate-300 text-sm uppercase font-semibold tracking-wide">
        Portfólio de Clínicas
      </h2>

      {/* Busca */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-10 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-sky-500"
          placeholder="Buscar clínica..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-slate-500 text-sm">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <p className="text-slate-500 text-sm">Nenhuma clínica encontrada.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {filtradas.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-sky-500/40 transition group shadow-lg"
            >
              <p className="text-slate-200 font-semibold text-lg group-hover:text-sky-300">
                {c.nome}
              </p>

              <p className="text-[11px] text-slate-500 mt-1">{c.cnpj}</p>

              <button
                onClick={() => navigate(`/admin/dashboard?clinica=${c.id}`)}
                className="mt-4 w-full px-3 py-2 rounded-xl text-[12px] border border-sky-500 text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 transition"
              >
                Abrir Dashboard
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
