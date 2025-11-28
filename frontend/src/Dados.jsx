import React from "react";
import Layout from "./Layout";

export default function Dados() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto">

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-100 mb-8">
          Explorar <span className="text-sky-400">dados</span>
        </h1>

        <p className="text-slate-400 mb-6 text-sm sm:text-base">
          Esta página permitirá visualizar tabelas do Supabase, fazer drill-down
          e navegar pelos dados importados (boletos, inadimplência, parcelas,
          valor médio, atraso etc.).
        </p>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
          <p className="text-slate-500 text-sm">
            (Página vazia — estrutura pronta para o futuro explorador de dados)
          </p>
        </div>

      </div>
    </Layout>
  );
}
