
import { NavLink } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import superAdminLogo from './image/logo1.png';

const SUPER_ADMIN_LOGO = superAdminLogo;

const adminNav = [
  { path: '/dashboard', label: 'Dashboard Global', icon: 'dashboard' },
  { path: '/empresas', label: 'Empresas Clientes', icon: 'domain' },
  { path: '/plans', label: 'Planes y Precios', icon: 'credit_card' },
  { path: '/billing', label: 'Facturación', icon: 'receipt_long' },
  { path: '/admin-automations', label: 'Automatizaciones', icon: 'account_tree' },
  { path: '/settings', label: 'Sistema', icon: 'settings' },
];

const clientNav = [
  { path: '/workspace',    label: 'Mi Panel',        icon: 'person_pin' },
  { path: '/inbox',        label: 'Mensajes',         icon: 'inbox' },
  { path: '/contacts',     label: 'Contactos',        icon: 'people' },
  { path: '/campaigns',    label: 'Mis Campañas',     icon: 'campaign' },
  { path: '/automation',   label: 'Automatización',   icon: 'account_tree' },
  { path: '/ai-assistant', label: 'Asistente IA',     icon: 'smart_toy', badge: 'NEW' },
  { path: '/settings',     label: 'Configuración',    icon: 'settings' },
];

const ADMIN_EMPRESA_ONLY = [];

const Sidebar = ({ role, onLogout }) => {
  const { user, impersonatedEmpresa } = useAuth();
  const isAdmin = !impersonatedEmpresa && (role === 'super_admin' || role === 'admin');
  const isAdminEmpresa = role === 'admin_empresa';

  const navItems = (isAdmin ? adminNav : clientNav).filter(item =>
    !ADMIN_EMPRESA_ONLY.includes(item.path) || isAdminEmpresa
  );

  console.log('[Sidebar] user object:', user);

  const logoSrc = impersonatedEmpresa
    ? (impersonatedEmpresa.logo || SUPER_ADMIN_LOGO)
    : isAdmin
      ? SUPER_ADMIN_LOGO
      : (user?.empresa?.logo || user?.logo_empresa || user?.empresa_logo || SUPER_ADMIN_LOGO);

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 transition-colors duration-300 bg-surface-light dark:bg-[#2C2C2C] border-r border-border-light dark:border-transparent">

      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border-light dark:border-white/10">
        <img
          src={logoSrc}
          alt="Logo"
          className="w-10 h-10 rounded-xl object-contain shrink-0 bg-white dark:bg-white/10 p-1 border border-border-light dark:border-white/10"
          onError={(e) => { e.currentTarget.src = SUPER_ADMIN_LOGO; }}
        />
        <div className="min-w-0">
          <p className="text-[13px] font-black text-text-main-light dark:text-white truncate leading-tight">
            {impersonatedEmpresa?.nombre
              ?? user?.empresa?.nombre
              ?? user?.empresa_nombre
              ?? user?.nombre_empresa
              ?? user?.company?.name
              ?? user?.company_name
              ?? (user?.email ? user.email.split('@')[1]?.split('.')[0] : null)
              ?? 'Mi Empresa'}
          </p>
          <p className="text-[10px] text-text-sub-light dark:text-white/40 truncate leading-tight mt-0.5">
            Powered by Conecta CRM
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-text-sub-light dark:text-white/50 hover:text-text-main-light dark:hover:text-white hover:bg-background-light dark:hover:bg-white/8'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="text-[13px] font-semibold">{item.label}</span>
            </div>
            {item.badge && (
              <span className="bg-red-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md leading-none">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-border-light dark:border-white/10">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-sub-light dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 transition-all w-full"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-[13px] font-semibold">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
