import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import Upload from "./Upload";
import Historico from "./Historico";
import Dashboard from "./Dashboard";
import Login from "./Login";
import Clinicas from "./Clinicas";
import Dados from "./Dados";
import Perfil from "./Perfil";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "./AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  return <Login onLogin={() => navigate("/")} />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Upload />
          </ProtectedRoute>
        }
      />

      <Route
        path="/historico"
        element={
          <ProtectedRoute>
            <Historico />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requireAdmin>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/clinicas"
        element={
          <ProtectedRoute requireAdmin>
            <Clinicas />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dados"
        element={
          <ProtectedRoute requireAdmin>
            <Dados />
          </ProtectedRoute>
        }
      />

      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Perfil />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to={user ? "/" : "/login"} replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
