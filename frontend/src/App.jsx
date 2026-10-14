import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { MenuPage } from './pages/MenuPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { TablesPage } from './pages/TablesPage';
import { KitchenPage } from './pages/KitchenPage';
import { ShiftsPage } from './pages/ShiftsPage';
import { useAppStore } from './store';

export function App() {
  useEffect(() => {
    // Sync store with live Express + MongoDB Atlas backend
    useAppStore.getState().syncWithBackend();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Portal Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Application Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Default Redirect to /dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Core Application Routes */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pos" element={<POSPage defaultTab="register" />} />
            <Route path="/orders" element={<POSPage defaultTab="history" />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/kitchen" element={<KitchenPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/accounts" element={<ExpensesPage />} />
            <Route path="/shifts" element={<ShiftsPage />} />
            <Route path="/register" element={<ShiftsPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/menus" element={<MenuPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/analytics" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<SettingsPage />} />

            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
