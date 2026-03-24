// @refresh reset
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { useNotifications } from '../src/contexts/NotificationContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { clientAPI, inboxAPI } from '../src/services/api';

const PAGE_LABELS = {
  '/dashboard':        'Dashboard',
  '/workspace':        'Mi Panel',
  '/inbox':            'Mensajes',
  '/contacts':         'Contactos',
  '/team':             'Mi Equipo',
  '/permissions':      'Permisos',
  '/campaigns':        'Campañas',
  '/automation':       'Automatización',
  '/my-billing':       'Plan & Pagos',
  '/ai-assistant':     'Asistente IA',
  '/settings':         'Configuración',
  '/help':             'Centro de Ayuda',
  '/empresas':         'Empresas',
  '/plans':            'Planes',
  '/billing':          'Facturación',
  '/admin-automations':'Automatizaciones',
};

const fmtTime = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1)  return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `hace ${diffH}h`;
  return d.toLocaleDateString('es-PY', { day: '2-digit', month: 'short' });
};

// ── Buscador global ───────────────────────────────────────────────────────────
const GlobalSearch = ({ empresaId, isClient }) => {
  const navigate   = useNavigate();
  const wrapperRef = useRef(null);

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState({ contacts: [], conversations: [] });
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const debounceRef = useRef(null);

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    if (!q.trim() || !empresaId || !isClient) {
      setResults({ contacts: [], conversations: [] });
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);

    const lower = q.toLowerCase();

    const [ctRes, convRes] = await Promise.allSettled([
      clientAPI.getContacts(empresaId),
      inboxAPI.getConversations(empresaId, {}),
    ]);

    // Filtrar contactos
    let contacts = [];
    if (ctRes.status === 'fulfilled') {
      const all = Array.isArray(ctRes.value)
        ? ctRes.value
        : (ctRes.value?.contactos ?? ctRes.value?.data ?? []);
      contacts = all.filter(c => {
        const nombre   = (c.nombre || c.name || '').toLowerCase();
        const email    = (c.email || '').toLowerCase();
        const telefono = (c.telefono || c.phone || '').toLowerCase();
        return nombre.includes(lower) || email.includes(lower) || telefono.includes(lower);
      }).slice(0, 4);
    }

    // Filtrar conversaciones
    let conversations = [];
    if (convRes.status === 'fulfilled') {
      const all = Array.isArray(convRes.value)
        ? convRes.value
        : (convRes.value?.conversaciones ?? convRes.value?.data ?? []);
      conversations = all.filter(c => {
        const nombre   = (c.contacto_nombre || c.telefono_whatsapp || '').toLowerCase();
        const preview  = (c.ultimo_mensaje || '').toLowerCase();
        return nombre.includes(lower) || preview.includes(lower);
      }).slice(0, 4);
    }

    setResults({ contacts, conversations });
    setLoading(false);
  }, [empresaId, isClient]);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setOpen(false); setResults({ contacts: [], conversations: [] }); return; }
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const handleSelect = (type, item) => {
    setQuery('');
    setOpen(false);
    setResults({ contacts: [], conversations: [] });
    if (type === 'contact')      navigate('/contacts');
    if (type === 'conversation') navigate('/inbox');
  };

  const hasResults = results.contacts.length > 0 || results.conversations.length > 0;
  const showEmpty  = open && !loading && query.trim() && !hasResults;

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-sm ml-2">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sub-light dark:text-text-sub-dark text-[18px]">
          {loading ? 'progress_activity' : 'search'}
        </span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder="Buscar contactos, mensajes..."
          className={`w-full pl-9 pr-4 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all dark:text-white placeholder-text-sub-light text-text-main-light ${loading ? 'animate-pulse' : ''}`}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); setResults({ contacts: [], conversations: [] }); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub-light hover:text-text-main-light"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
      </div>

      {/* Dropdown resultados */}
      {open && (hasResults || showEmpty) && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-surface-dark rounded-2xl shadow-xl border border-border-light dark:border-border-dark overflow-hidden z-50">

          {/* Contactos */}
          {results.contacts.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-text-sub-light">
                Contactos
              </p>
              {results.contacts.map((c) => {
                const nombre = c.nombre || c.name || 'Sin nombre';
                const sub    = c.email || c.telefono || c.phone || '';
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelect('contact', c)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-left"
                  >
                    <div className="size-8 rounded-full bg-blue-600/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {nombre[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-main-light dark:text-white truncate">{nombre}</p>
                      {sub && <p className="text-[11px] text-text-sub-light truncate">{sub}</p>}
                    </div>
                    <span className="material-symbols-outlined text-[14px] text-text-sub-light">arrow_forward</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Conversaciones */}
          {results.conversations.length > 0 && (
            <div className={results.contacts.length > 0 ? 'border-t border-border-light dark:border-border-dark' : ''}>
              <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-text-sub-light">
                Conversaciones
              </p>
              {results.conversations.map((c) => {
                const nombre  = c.contacto_nombre || c.telefono_whatsapp || 'Desconocido';
                const preview = c.ultimo_mensaje || '';
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelect('conversation', c)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-left"
                  >
                    <div className="size-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-main-light dark:text-white truncate">{nombre}</p>
                      {preview && <p className="text-[11px] text-text-sub-light truncate">{preview}</p>}
                    </div>
                    <span className="material-symbols-outlined text-[14px] text-text-sub-light">arrow_forward</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Sin resultados */}
          {showEmpty && (
            <div className="px-4 py-6 flex flex-col items-center gap-2 text-text-sub-light">
              <span className="material-symbols-outlined text-[32px] opacity-30">search_off</span>
              <p className="text-xs">Sin resultados para "<strong>{query}</strong>"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Header ────────────────────────────────────────────────────────────────────
const Header = ({ role }) => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const panelRef  = useRef(null);
  const { user }  = useAuth();

  const empresaId  = user?.empresa_id || user?.empresa?.id;
  const isClient   = user?.tipo_usuario !== 'super_admin' && user?.tipo_usuario !== 'admin';

  const {
    notifications, unreadCount,
    panelOpen, setPanelOpen,
    markAllRead, markRead, clearAll,
  } = useNotifications();

  const { theme, toggleTheme } = useTheme();

  const pageTitle = PAGE_LABELS[location.pathname] || location.pathname.split('/').pop()?.toUpperCase() || 'PANEL';

  // Cerrar panel notificaciones al click fuera
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    if (panelOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen, setPanelOpen]);

  const handleNotifClick = (n) => {
    markRead(n.id);
    setPanelOpen(false);
    if (n.type === 'message') navigate('/inbox');
    else if (n.type === 'contact') navigate('/contacts');
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark sticky top-0 z-30 shrink-0 transition-colors">

      {/* Izquierda: título + búsqueda */}
      <div className="flex items-center gap-4 flex-1">
        <button className="md:hidden text-text-sub-light dark:text-white">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="hidden sm:block text-[13px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-widest shrink-0">
          {pageTitle}
        </span>

        {/* Buscador: solo para usuarios cliente */}
        {isClient && empresaId
          ? <GlobalSearch empresaId={empresaId} isClient={isClient} />
          : <div className="flex-1 max-w-sm ml-2" />
        }
      </div>

      {/* Derecha: notificaciones */}
      <div className="flex items-center gap-2 ml-4">
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setPanelOpen(v => !v)}
            className="p-2 text-text-sub-light dark:text-text-sub-dark hover:bg-background-light dark:hover:bg-background-dark rounded-xl relative transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {panelOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-surface-dark rounded-2xl shadow-xl border border-border-light dark:border-border-dark overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-main-light dark:text-white">Notificaciones</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-600/10 text-primary text-[10px] font-bold rounded-full">
                      {unreadCount} nuevas
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[10px] font-semibold text-primary hover:underline">
                      Marcar leídas
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={clearAll} className="text-[10px] font-semibold text-text-sub-light hover:text-red-500">
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-2 text-text-sub-light">
                    <span className="material-symbols-outlined text-[40px] opacity-20">notifications_off</span>
                    <p className="text-xs">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors text-left border-b border-border-light/50 dark:border-border-dark/50 last:border-0 ${!n.read ? 'bg-blue-600/5' : ''}`}
                    >
                      <div className={`size-8 rounded-xl flex items-center justify-center flex-shrink-0 ${n.type === 'message' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        <span className="material-symbols-outlined text-[16px]">
                          {n.type === 'message' ? 'chat' : 'person_add'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-bold truncate ${!n.read ? 'text-text-main-light dark:text-white' : 'text-text-sub-light'}`}>
                            {n.title}
                          </p>
                          <span className="text-[9px] text-text-sub-light flex-shrink-0">{fmtTime(n.ts)}</span>
                        </div>
                        <p className="text-[11px] text-text-sub-light truncate mt-0.5">{n.body}</p>
                      </div>
                      {!n.read && <div className="size-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />}
                    </button>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="px-4 py-2.5 border-t border-border-light dark:border-border-dark">
                  <p className="text-[10px] text-text-sub-light text-center">Actualizando cada 25 segundos</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toggle tema claro / oscuro */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="p-2 text-text-sub-light dark:text-text-sub-dark hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition-all relative group"
        >
          <span className="material-symbols-outlined text-[20px]">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
          {/* Tooltip */}
          <span className="absolute right-0 top-full mt-1.5 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-[10px] font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </span>
        </button>

        <button
          onClick={() => navigate('/help')}
          className="p-2 text-text-sub-light dark:text-text-sub-dark hover:bg-background-light dark:hover:bg-background-dark rounded-xl transition-all"
          title="Centro de ayuda"
        >
          <span className="material-symbols-outlined text-[20px]">help_outline</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
