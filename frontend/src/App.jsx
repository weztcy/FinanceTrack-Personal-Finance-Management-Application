import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Providers, useAuth } from "./lib/context";
import { Loading, ErrorState } from "./components/ui";
import Layout from "./components/Layout";
import AuthPage from "./pages/Auth";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Categories = lazy(() => import("./pages/Categories"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Recurring = lazy(() => import("./pages/Recurring"));
const Goals = lazy(() => import("./pages/Goals"));
const Bills = lazy(() => import("./pages/Bills"));
const Reports = lazy(() => import("./pages/Reports"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
function AppRoutes() {
  const { user, loading, authError, loadUser } = useAuth();
  if (loading)
    return (
      <div className="initial-loading">
        <Loading />
      </div>
    );
  if (authError) return <ErrorState message={authError} retry={loadUser} />;
  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" /> : <AuthPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" /> : <AuthPage mode="register" />}
      />
      <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
      <Route path="/reset-password" element={<AuthPage mode="reset" />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
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
      <Providers>
        <Suspense fallback={<Loading />}>
          <AppRoutes />
        </Suspense>
      </Providers>
    </BrowserRouter>
  );
}
