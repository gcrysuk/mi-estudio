import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ModalProvider } from "./contexts/ModalContext";
import { UndoProvider } from "./context/UndoContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./components/layout/Layout";
import AuthLayout from "./components/layout/AuthLayout";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import PersonasList from "./pages/personas/PersonasList";
import CarpetasList from "./pages/carpetas/CarpetasList";
import CarpetaDetail from "./pages/carpetas/CarpetaDetail";
import MovimientosList from "./pages/movimientos/MovimientosList";
import MovimientosGlobal from "./pages/movimientos/MovimientosGlobal";
import OrganismosList from "./pages/organismos/OrganismosList";
import TiposList from "./pages/tipos/TiposList";
import CalendarioPage from "./pages/calendario/CalendarioPage";
import useAuthStore from "./stores/authStore";
import ModalGlobal from './components/modals/ModalGlobal';


function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <ThemeProvider>
      <UndoProvider>
      <ModalProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/personas" element={<PersonasList />} />
              <Route path="/carpetas" element={<CarpetasList />} />
              <Route path="/carpetas/:id" element={<CarpetaDetail />} />
              <Route path="/carpetas/:carpetaId/movimientos" element={<MovimientosList />} />
              <Route path="/movimientos" element={<MovimientosGlobal />} />
              <Route path="/organismos" element={<OrganismosList />} />
              <Route path="/tipos" element={<TiposList />} />
              <Route path="/calendario" element={<CalendarioPage />} />

            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        </Routes>
	<ModalGlobal />
      </ModalProvider>
      </UndoProvider>
    </ThemeProvider>
  );
}

export default App;
