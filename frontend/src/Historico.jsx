import React, { useEffect, useState } from "react";
import Layout from "./Layout";

export default function Historico() {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);

  async function carregarHistorico() {
    try {
      const res = await fetch("http://127.0.0.1:8000/historico");
      const json = await res.json();
      setHistorico(json);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
  }, []);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-100 mb-10">
          Histórico de <span className="text-sky-400">importações</span>
        </h1>

        {carregando ? (
          <p className="text-slate-300">Carregando...</p>
        ) : historico.length === 0 ? (
          <p className="text-slate-400">Nenhuma importação encontrada.</p>
        ) : (
          <div className="space-y-4">
            {historico.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5"
              >
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-slate-100 font-semibold text-sm sm:text-base">
                    {item.clinicas?.nome || "Clínica não encontrada"}
                  </h2>

                  <span className="text-[11px] bg-slate-800 text-slate-300 rounded-full px-2 py-1">
                    {new Date(item.criado_em).toLocaleString("pt-BR")}
                  </span>
                </div>

                <div className="text-slate-400 text-xs sm:text-sm space-y-1">
                  <div>
                    <span className="text-slate-500">Arquivo:</span>{" "}
                    <span className="text-sky-300">
                      {item.arquivo_nome || "Arquivo não informado"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">Total de registros:</span>{" "}
                    <span className="text-sky-300">
                      {item.total_registros ?? 0}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">Boletos emitidos:</span>{" "}
                    <span className="text-emerald-300">
                      {item.total_boletos_emitidos ?? 0}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">Inadimplência:</span>{" "}
                    <span className="text-rose-300">
                      {item.total_inadimplencia ?? 0}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">Status:</span>{" "}
                    <span className="text-emerald-300">
                      {item.status || "concluido"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
