import React from "react";
import Layout from "./Layout";

export default function Clinicas() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto">

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-100 mb-8">
          Clínicas <span className="text-sky-400">cadastradas</span>
        </h1>

        <p className="text-slate-400 mb-6 text-sm sm:text-base">
          Aqui será exibida a lista de clínicas importadas do sistema, com
          vínculos, dados consolidados e indicadores financeiros.
        </p>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
          <p className="text-slate-500 text-sm">
            (Página vazia — aguardando dados do backend)
          </p>
        </div>

      </div>
    </Layout>
  );
}
