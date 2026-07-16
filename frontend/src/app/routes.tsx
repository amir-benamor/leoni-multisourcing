import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import { AppShellLayout } from "../layouts/AppShellLayout";
import { AdminShellLayout } from "../layouts/AdminShellLayout";
import DashboardPage from "../pages/app/DashboardPage";
import ExploreStatusPage from "../pages/app/ExploreStatusPage";
import ComponentDetailPage from "../pages/app/ComponentDetailPage";
import MsRedirectPage from "../pages/app/MsRedirectPage";
import SelectComponentPage from "../pages/app/SelectComponentPage";
import BusinessCasePage from "../pages/app/BusinessCasePage";
import ImportDataPage from "../pages/app/ImportDataPage";
import HistoryPage from "../pages/app/HistoryPage";
import SettingsPage from "../pages/app/SettingsPage";
import M1Page from "../pages/app/M1Page";
import M1PartPage from "../pages/app/M1PartPage";
import M1PartsPage from "../pages/app/M1PartsPage";
import M1MaterialGroupPage from "../pages/app/M1MaterialGroupPage";
import M2Page from "../pages/app/M2Page";
import M2PartPage from "../pages/app/M2PartPage";
import M2PartsPage from "../pages/app/M2PartsPage";
import M2MaterialGroupPage from "../pages/app/M2MaterialGroupPage";
import M2SupplierPage from "../pages/app/M2SupplierPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import AdminUserRequestsPage from "../pages/admin/AdminUserRequestsPage";
import AdminAccessPermissionsPage from "../pages/admin/AdminAccessPermissionsPage";
import AdminAuditLogPage from "../pages/admin/AdminAuditLogPage";
import { canAccessAppRoute, getDefaultAppRoute, getDefaultUserRoute, getSession, isUserRole } from "../lib/authSession";

interface AppRoutesProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

function AppGuard({ theme, onToggleTheme }: AppRoutesProps) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  return <AppShellLayout theme={theme} onToggleTheme={onToggleTheme} />;
}

function AdminGuard({ theme, onToggleTheme }: AppRoutesProps) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== "admin") {
    if (isUserRole(session.role)) {
      return <Navigate to={getDefaultUserRoute(session.role)} replace />;
    }
    return <Navigate to="/login" replace />;
  }
  return <AdminShellLayout theme={theme} onToggleTheme={onToggleTheme} />;
}

function UserRouteGate() {
  const session = getSession();
  const location = useLocation();

  if (!session) return <Navigate to="/login" replace />;
  if (!canAccessAppRoute(session.role, location.pathname)) {
    return <Navigate to={getDefaultAppRoute(session.role)} replace />;
  }
  return <Outlet />;
}

function UserIndexRedirect() {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={getDefaultAppRoute(session.role)} replace />;
}

function LegacyUserRedirect({ to }: { to: string }) {
  const session = getSession();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace />;
  if (!canAccessAppRoute(session.role, to)) {
    return <Navigate to={getDefaultAppRoute(session.role)} replace />;
  }
  const target = `${to}${location.search}${location.hash}`;
  return <Navigate to={target} replace />;
}

function LegacyComponentRedirect() {
  const session = getSession();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace />;
  if (!canAccessAppRoute(session.role, location.pathname)) {
    return <Navigate to={getDefaultAppRoute(session.role)} replace />;
  }
  const nextPath = location.pathname.replace("/app/component", "/app/m3/component");
  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />;
}

function M3FallbackRedirect() {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role === "admin" || session.role === "role3") return <Navigate to="/app/m3/dashboard" replace />;
  return <Navigate to={session.role === "role2" ? "/app/m2" : "/app/m1"} replace />;
}

export function AppRoutes({ theme, onToggleTheme }: AppRoutesProps) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage theme={theme} onToggleTheme={onToggleTheme} />} />
        <Route path="/signup" element={<SignupPage theme={theme} onToggleTheme={onToggleTheme} />} />

        <Route path="/app" element={<AppGuard theme={theme} onToggleTheme={onToggleTheme} />}>
          <Route index element={<UserIndexRedirect />} />

          <Route element={<UserRouteGate />}>
            <Route path="m1" element={<M1Page />} />
            <Route path="m1/part" element={<M1PartPage />} />
            <Route path="m1/parts" element={<M1PartsPage />} />
            <Route path="m1/material-group" element={<M1MaterialGroupPage />} />
            <Route path="m2" element={<M2Page />} />
            <Route path="m2/part" element={<M2PartPage />} />
            <Route path="m2/parts" element={<M2PartsPage />} />
            <Route path="m2/material-group" element={<M2MaterialGroupPage />} />
            <Route path="m2/supplier" element={<M2SupplierPage />} />
            <Route path="m3">
              <Route index element={<M3FallbackRedirect />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="explore" element={<ExploreStatusPage />} />
              <Route path="component" element={<SelectComponentPage />} />
              <Route path="component/:id" element={<ComponentDetailPage />} />
              <Route path="business-case" element={<BusinessCasePage />} />
            </Route>

            <Route path="ms/:msNumber" element={<MsRedirectPage />} />
            <Route path="import" element={<ImportDataPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="dashboard" element={<LegacyUserRedirect to="/app/m3/dashboard" />} />
          <Route path="explore" element={<LegacyUserRedirect to="/app/m3/explore" />} />
          <Route path="suppliers" element={<LegacyUserRedirect to="/app/m3/dashboard" />} />
          <Route path="component" element={<LegacyUserRedirect to="/app/m3/component" />} />
          <Route path="component/:id" element={<LegacyComponentRedirect />} />
          <Route path="business-case" element={<LegacyUserRedirect to="/app/m3/business-case" />} />
        </Route>

        <Route path="/admin" element={<AdminGuard theme={theme} onToggleTheme={onToggleTheme} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="user-requests" element={<AdminUserRequestsPage />} />
          <Route path="users" element={<AdminUserRequestsPage />} />
          <Route path="access-permissions" element={<AdminAccessPermissionsPage />} />
          <Route path="master-data" element={<Navigate to="/admin/access-permissions" replace />} />
          <Route path="import-monitor" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="imports" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="audit-log" element={<AdminAuditLogPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
