import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import Logo from "./assets/logo_escuro.svg";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
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

    // 🔥 Login OK → joga pra home
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur shadow-xl">
        <div className="flex justify-center mb-6">
          <img src={Logo} className="h-12 opacity-90" alt="MedSimples" />
        </div>

        <h1 className="text-xl font-semibold text-center text-slate-100 mb-6">
          Login · MedSimples
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          {erro && (
            <p className="text-red-400 text-sm text-center">{erro}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold py-2.5 transition"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
