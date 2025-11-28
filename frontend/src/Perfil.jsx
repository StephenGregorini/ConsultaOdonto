import React from "react";
import Layout from "./Layout";
import { useAuth } from "./AuthContext";

export default function Perfil() {
  const { user, profile } = useAuth();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-100 mb-10">
          Meu <span className="text-sky-400">perfil</span>
        </h1>

        <p className="text-slate-400 text-sm sm:text-base mb-8">
          Informações da sua conta no MedSimples. Futuramente poderemos adicionar
          edição de nome, senha, papel, unidades associadas e permissões.
        </p>

        <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-6 sm:p-7 space-y-6">

          {/* EMAIL */}
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Email</span>
            <span className="text-sky-300 text-sm font-medium">
              {user?.email}
            </span>
          </div>

          {/* NOME */}
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Nome</span>
            <span className="text-slate-200 text-sm font-medium">
              {profile?.nome || "—"}
            </span>
          </div>

          {/* PAPEL */}
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Papel</span>
            <span
              className={`text-sm font-medium ${
                profile?.role === "admin" ? "text-emerald-300" : "text-slate-300"
              }`}
            >
              {profile?.role || "—"}
            </span>
          </div>

          {/* ID */}
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">ID do usuário</span>
            <span className="text-slate-600 text-sm font-mono">
              {user?.id}
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
