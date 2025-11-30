import React from "react";
import { useDashboard } from "../DashboardContext";
import DashboardHeader from "./DashboardHeader";
import DashboardFilters from "./DashboardFilters";
import Overview from "./Overview";
import DecisaoCredito from "./DecisaoCredito";
import Comportamento from "./Comportamento";
import Carteira from "./Carteira";
import SidebarLimite from "./SidebarLimite";
import Tabs from "../components/ui/Tabs";
import { API_BASE_URL } from "../apiConfig";

const TABS = [
  { id: "overview", label: "Visão Geral" },
  { id: "decisao", label: "Decisão de Crédito" },
  { id: "comportamento", label: "Comportamento" },
  { id: "carteira", label: "Carteira" },
];

export default function Dashboard() {
  const { 
    dados, 
    loadingDashboard, 
    erro, 
    panelLimiteAberto, 
    setPanelLimiteAberto, 
    activeTab, 
    setActiveTab 
  } = useDashboard();

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/export-dashboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dados),
      });

      if (!response.ok) {
        throw new Error("Failed to export data.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dashboard_data.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Erro ao exportar dados: " + error.message);
    }
  };

  return (
    <div className="w-full space-y-8">
      <DashboardHeader onExport={handleExport} />
      <DashboardFilters />
      
      <Tabs tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />

      {loadingDashboard && <p>Carregando...</p>}
      {erro && <p className="text-rose-400">{erro}</p>}

      {dados && !loadingDashboard && !erro && (
        <>
          {activeTab === "overview" && <Overview />}
          {activeTab === "decisao" && <DecisaoCredito />}
          {activeTab === "comportamento" && <Comportamento />}
          {activeTab === "carteira" && <Carteira />}
        </>
      )}

      <SidebarLimite
        open={panelLimiteAberto}
        onClose={() => setPanelLimiteAberto(false)}
      />
    </div>
  );
}
