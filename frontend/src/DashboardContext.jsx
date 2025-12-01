import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useDashboardData } from "./utils/useDashboardData";
import { useClinicas } from "./utils/useClinicas";

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
  const { profile } = useAuth();
  const location = useLocation();
  
  const [clinicaId, setClinicaId] = useState("todas");
  const [janelaMeses, setJanelaMeses] = useState(12);
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const clinicaParam = params.get("clinica");
    setClinicaId(clinicaParam || "todas");
  }, [location.search]);

  const { clinicas, loading: loadingClinicas } = useClinicas();
  const {
    dados,
    erro,
    loading: loadingDashboard,
    reload: reloadDashboard,
  } = useDashboardData({
    clinicaId,
    janelaMeses,
    inicio: periodoInicio,
    fim: periodoFim,
  });

  const [panelLimiteAberto, setPanelLimiteAberto] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const value = {
    profile,
    
    clinicas,
    loadingClinicas,
    clinicaId,
    setClinicaId,

    janelaMeses,
    setJanelaMeses,
    periodoInicio,
    setPeriodoInicio,
    periodoFim,
    setPeriodoFim,

    dados,
    erro,
    loadingDashboard,
    reloadDashboard,

    panelLimiteAberto,
    setPanelLimiteAberto,
    
    activeTab,
    setActiveTab,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
