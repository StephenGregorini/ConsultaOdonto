import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import Logo from "./assets/logo_escuro.svg";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    const { error } = await signIn(email, senha);
    setLoading(false);

    if (error) {
      setErro("Email ou senha incorretos.");
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-slate-900/70 border border-slate-800 rounded-3xl p-10 backdrop-blur-2xl shadow-[0_0_80px_-10px_rgba(0,0,0,0.6)]">

        {/* Logo */}
        <div className="flex justify-center mb-2">
          <img src={Logo} className="h-12 opacity-95" alt="MedSimples" />
        </div>

        {/* Títulos */}
        <div className="text-center my-4">
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Acesso seguro ao Score de Crédito
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Campo Email */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Email
            </label>

            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 outline-none transition"
                placeholder="voce@clinica.com"
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Senha
            </label>

            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />

              <input
                type={mostrarSenha ? "text" : "password"}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 outline-none transition"
                placeholder="••••••••"
              />

              {/* Toggle de visibilidade */}
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {erro && (
            <p className="text-red-400 text-sm text-center">{erro}</p>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-300 text-slate-950 font-semibold py-3 transition shadow-lg shadow-sky-500/20"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
