import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================
  // FUNÇÃO DE LOGIN
  // =========================
  async function signIn(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) return { error };

    setUser(data.user);
    await loadProfile(data.user.id);

    return { error: null };
  }

  function signOut() {
    supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  // =========================
  // CARREGAR PERFIL
  // =========================
  async function loadProfile(userId) {
    console.log("🔍 Carregando perfil para:", userId);

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    console.log("➡️ Perfil:", data, "erro:", error);

    setProfile(data);
  }

  // =========================
  // INICIALIZAR SESSÃO
  // =========================
  useEffect(() => {
    let active = true;

    async function init() {
      console.log("🔄 Iniciando sessão...");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log("➡️ Sessão restaurada:", session);

      if (!active) return;

      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      }

      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("📡 Evento Auth:", event, session);

      if (!active) return;

      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================
  // RETORNAR AO CONTEXTO
  // =========================
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
