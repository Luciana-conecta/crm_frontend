import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { ThemeProvider } from './src/contexts/ThemeContext';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './src/pages/Login';
import Settings from './src/pages/Settings';

import AdminDashboard from './src/admin/src/pages/Dashboard';
import Adminempresas from './src/admin/src/pages/Companies';
import AdminPlans from './src/admin/src/pages/Plans';
import AdminBilling from './src/admin/src/pages/Billing';
import AdminAutomations from './src/admin/src/pages/Automations';

import ClientInbox from './src/pages/client/Inbox';
import ClientContacts from './src/pages/client/Contacts';
import ClientCampaigns from './src/pages/client/Campaigns';
import ClientAutomation from './src/pages/client/Automation';
import ClientAgentWorkspace from './src/pages/client/AgentWorkspace';
import ClientTeamManagement from './src/pages/client/TeamManagement';
import ClientPermissions from './src/pages/client/RolePermissions';
import ClientBilling from './src/pages/client/Billing';
import ClientAIAssistant from './src/pages/client/AIAssistant';
import Help from './src/pages/Help';


function AppLayout({
  children,
  role,
  onLogout,
  isAuthenticated,
  isImpersonating,
  onStopImpersonation
}) {
  const location = useLocation();

  const isLoginPage = location.pathname === '/login' || location.hash.includes('/login');

  if (isLoginPage) return <>{children}</>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark transition-colors duration-300">
      <Sidebar
        role={role}
        onLogout={onLogout}
        isImpersonating={isImpersonating}
      />

      <div className="flex-1 flex flex-col h-full min-w-0">
        {isImpersonating && (
          <div className="h-9 flex items-center justify-between px-6 shrink-0 z-50" style={{ backgroundColor: '#2C2C2C' }}>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#094970' }}>
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              Modo Auditoría — Super Admin
            </div>
            <button
              onClick={onStopImpersonation}
              className="text-white/60 hover:text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-white/10"
            >
              ← Volver al Panel
            </button>
          </div>
        )}

        <Header role={role} />

        <main className="flex-1 overflow-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, userRole, loading, logout, impersonatedEmpresa, startImpersonation, stopImpersonation } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  const effectiveRole = impersonatedEmpresa ? 'admin_empresa' : userRole;

  const handleImpersonate = (empresa) => {
    startImpersonation(empresa);
    navigate('/inbox');
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    navigate('/dashboard');
  };

  return (
    <AppLayout
      role={effectiveRole}
      onLogout={logout}
      isAuthenticated={isAuthenticated}
      isImpersonating={!!impersonatedEmpresa}
      onStopImpersonation={handleStopImpersonation}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/settings" element={<Settings role={effectiveRole} />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/empresas" element={<Adminempresas onImpersonate={handleImpersonate} />} />
        <Route path="/plans" element={<AdminPlans />} />
        <Route path="/billing" element={<AdminBilling />} />
        <Route path="/admin-automations" element={<AdminAutomations />} />
        <Route path="/inbox" element={<ClientInbox />} />
        <Route path="/contacts" element={<ClientContacts />} />
        <Route path="/campaigns" element={<ClientCampaigns />} />
        <Route path="/automation" element={<ClientAutomation />} />
        <Route path="/workspace" element={<ClientAgentWorkspace />} />
        <Route path="/team"        element={<Navigate to="/settings" replace />} />
        <Route path="/permissions" element={<Navigate to="/settings" replace />} />
        <Route path="/my-billing"  element={<Navigate to="/settings" replace />} />
        <Route path="/ai-assistant" element={<ClientAIAssistant />} />
        <Route path="/help" element={<Help />} />
        <Route path="/" element={<Navigate to={userRole === 'super_admin' ? '/dashboard' : '/inbox'} replace />} />
        <Route path="*" element={<Navigate to={userRole === 'super_admin' ? '/dashboard' : '/inbox'} replace />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
