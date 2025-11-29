import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Upload from "./Upload";
import Historico from "./Historico";
import Dashboard from "./dashboard/Dashboard";
import Clinicas from "./dashboard/Clinicas";
import Dados from "./dashboard/Dados";
import Login from "./Login";
import Perfil from "./Perfil";

import Layout from "./Layout";
import ProtectedRoute from "./ProtectedRoute";
import AdminShell from "./AdminShell";

import { DashboardProvider } from "./DashboardContext";

function LoginPage() {
  return <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* 🔥 Agora TODO o app tem acesso ao DashboardProvider
          e ele NUNCA é desmontado ao trocar de rotas */}
      <DashboardProvider>
        <Routes>

          {/* LOGIN */}
          <Route path="/login" element={<LoginPage />} />

          {/* ÁREA PÚBLICA */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Upload />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/historico"
            element={
              <ProtectedRoute>
                <Layout>
                  <Historico />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* ÁREA ADMIN */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminShell />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clinicas" element={<Clinicas />} />
            <Route path="dados" element={<Dados />} />
          </Route>

          {/* PERFIL */}
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Layout>
                  <Perfil />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* DEFAULT */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardProvider>
    </BrowserRouter>
  );
}
