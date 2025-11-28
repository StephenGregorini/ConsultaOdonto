import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, loading } = useAuth();

  console.log("🔐 [Route] Estado atual:", { user, profile, loading });

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <p className="text-slate-400">Verificando autenticação...</p>
      </div>
    );
  }

  if (!user) {
    console.log("🚫 [Route] Sem usuário, redirecionando.");
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !profile) {
    console.log("🔄 [Route] Carregando perfil para admin...");
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <p className="text-slate-400">Carregando permissões...</p>
      </div>
    );
  }

  if (requireAdmin && profile?.role !== "admin") {
    console.log("⛔ [Route] Usuário não é admin.");
    return <Navigate to="/" replace />;
  }

  console.log("✅ [Route] Acesso autorizado.");
  return children;
}
