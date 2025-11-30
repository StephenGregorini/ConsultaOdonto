// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

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

function LoginPage() {
  return <Login />;
}


export default function App() {
  return (
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

{/* ÁREA ADMIN (usa AdminShell + Outlet) */}
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
