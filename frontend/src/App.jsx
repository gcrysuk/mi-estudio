import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ModalProvider } from "./contexts/ModalContext";
import { UndoProvider } from "./context/UndoContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./components/layout/Layout";
import AuthLayout from "./components/layout/AuthLayout";
import Login from "./pages/auth/Login";
import RegistroPage from "./pages/auth/RegistroPage";
import VerificarEmailPage from "./pages/auth/VerificarEmailPage";
import AdminUsuariosPage from "./pages/admin/AdminUsuariosPage";
import PerfilPage from "./pages/perfil/PerfilPage";
import Dashboard from "./pages/dashboard/Dashboard";
import PersonasList from "./pages/personas/PersonasList";
import CarpetasList from "./pages/carpetas/CarpetasList";
import CarpetaDetail from "./pages/carpetas/CarpetaDetail";
import MovimientosList from "./pages/movimientos/MovimientosList";
import MovimientosGlobal from "./pages/movimientos/MovimientosGlobal";
import OrganismosList from "./pages/organismos/OrganismosList";
import TiposList from "./pages/tipos/TiposList";
import CalendarioPage from "./pages/calendario/CalendarioPage";
import PapeleraPage from "./pages/papelera/PapeleraPage";
import KanbanPage from "./pages/kanban/KanbanPage";
import KanbanConfigPage from "./pages/kanban/KanbanConfigPage";
import NotificacionesPage from "./pages/notificaciones/NotificacionesPage";
import ResumenPage from "./pages/resumen/ResumenPage";
import useAuthStore from "./stores/authStore";
import ModalGlobal from './components/modals/ModalGlobal';


function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <ThemeProvider>
      <UndoProvider>
      <ModalProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
              maxWidth: '360px',
            },
            success: {
              duration: 3000,
              icon: null,
              style: {
                background: '#fff',
                color: '#1f2937',
                borderLeft: '4px solid #10B981',
              },
            },
            error: {
              duration: 4000,
              icon: null,
              style: {
                background: '#fff',
                color: '#1f2937',
                borderLeft: '4px solid #EF4444',
              },
            },
          }}
        />
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route path="/verificar-email" element={<VerificarEmailPage />} />
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
              <Route path="/papelera" element={<PapeleraPage />} />
              <Route path="/kanban" element={<KanbanPage />} />
              <Route path="/kanban/config" element={<KanbanConfigPage />} />
              <Route path="/notificaciones" element={<NotificacionesPage />} />
              <Route path="/resumen" element={<ResumenPage />} />
              <Route path="/perfil" element={<PerfilPage />} />
              <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />

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
