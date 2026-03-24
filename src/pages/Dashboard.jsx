import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { clientAPI, inboxAPI } from '../services/api';

// ─── Utilidades ──────────────────────────────────────────────────────────────

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: 'short' });
};

const fmtTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
};

// Agrupa una lista de items por semana (últimas 8 semanas)
const groupByWeek = (items, dateField = 'created_at') => {
  const weeks = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - i * 7 - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(now.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);
    const label = `S${8 - i}`;
    const count = items.filter((it) => {
      const d = new Date(it[dateField] || it.createdAt || it.fecha_creacion);
      return d >= start && d <= end;
    }).length;
    weeks.push({ name: label, value: count });
  }
  return weeks;
};

// ─── Componentes internos ─────────────────────────────────────────────────────

const KPICard = ({ label, value, sub, icon, color = 'primary', loading }) => {
  const colors = {
    primary:  { bg: 'bg-primary/10',       text: 'text-primary' },
    green:    { bg: 'bg-green-100',         text: 'text-green-600' },
    amber:    { bg: 'bg-amber-100',         text: 'text-amber-600' },
    blue:     { bg: 'bg-blue-100',          text: 'text-blue-600' },
  };
  const c = colors[color] || colors.primary;
  return (
    <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-gray-400">{label}</span>
        <div className={`p-2 rounded-xl ${c.bg} ${c.text}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mt-1" />
      ) : (
        <p className="text-3xl font-black text-text-main-light dark:text-white tracking-tight">{value ?? '—'}</p>
      )}
      {sub && <p className="text-xs text-text-sub-light dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
};

const EstadoBadge = ({ estado }) => {
  const map = {
    abierto:   'bg-green-100 text-green-700',
    resuelto:  'bg-blue-100 text-blue-700',
    pendiente: 'bg-amber-100 text-amber-700',
    cerrado:   'bg-gray-100 text-gray-600',
  };
  const cls = map[estado?.toLowerCase()] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${cls}`}>
      {estado || 'N/A'}
    </span>
  );
};

// ─── Dashboard principal ──────────────────────────────────────────────────────

const Dashboard = () => {
  const { user } = useAuth();
  const empresaId = user?.empresa_id || user?.empresa?.id;
  const nombreEmpresa = user?.empresa?.nombre || user?.nombre_empresa || 'tu empresa';

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // Datos reales
  const [contacts, setContacts]           = useState([]);
  const [convAbiertas, setConvAbiertas]   = useState([]);
  const [convResueltas, setConvResueltas] = useState([]);
  const [convPendientes, setConvPendientes] = useState([]);

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      clientAPI.getContacts(empresaId),
      inboxAPI.getConversations(empresaId, { estado: 'abierto' }),
      inboxAPI.getConversations(empresaId, { estado: 'resuelto' }),
      inboxAPI.getConversations(empresaId, { estado: 'pendiente' }),
    ]);

    // Extraer datos con manejo individual de errores
    const extractList = (result, keys = []) => {
      if (result.status === 'rejected') return [];
      const d = result.value;
      for (const k of keys) if (Array.isArray(d?.[k])) return d[k];
      if (Array.isArray(d)) return d;
      return [];
    };

    const ctts  = extractList(results[0], ['contactos', 'data', 'contacts']);
    const abts  = extractList(results[1], ['conversaciones', 'data', 'conversations']);
    const ress  = extractList(results[2], ['conversaciones', 'data', 'conversations']);
    const pends = extractList(results[3], ['conversaciones', 'data', 'conversations']);

    setContacts(ctts);
    setConvAbiertas(abts);
    setConvResueltas(ress);
    setConvPendientes(pends);

    // Si todas fallaron con 401, mostrar error
    const allFailed = results.every(r => r.status === 'rejected');
    if (allFailed) {
      setError('No se pudieron cargar los datos. Verificá tu sesión.');
    }

    setLoading(false);
  }, [empresaId]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // ── Métricas derivadas ──────────────────────────────────────────────────────
  const totalContactos = contacts.length;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const nuevosHoy = contacts.filter(c => {
    const d = new Date(c.created_at || c.createdAt || c.fecha_creacion || 0);
    return d >= hoy;
  }).length;

  const semanaStart = new Date(hoy);
  semanaStart.setDate(hoy.getDate() - 7);
  const nuevosSemana = contacts.filter(c => {
    const d = new Date(c.created_at || c.createdAt || c.fecha_creacion || 0);
    return d >= semanaStart;
  }).length;

  // Chart contactos por semana
  const chartContactos = groupByWeek(contacts, 'created_at');

  // Chart conversaciones por estado
  const totalConvs = convAbiertas.length + convResueltas.length + convPendientes.length;
  const chartEstados = [
    { name: 'Abiertas',   value: convAbiertas.length,   color: '#22C55E' },
    { name: 'Pendientes', value: convPendientes.length,  color: '#F59E0B' },
    { name: 'Resueltas',  value: convResueltas.length,   color: '#3B82F6' },
  ].filter(i => i.value > 0);

  // Conversaciones recientes (mezcla de abiertas + pendientes, ordenadas por fecha)
  const recientes = [...convAbiertas, ...convPendientes]
    .sort((a, b) => {
      const da = new Date(a.ultimo_mensaje_at || a.updated_at || a.createdAt || 0);
      const db = new Date(b.ultimo_mensaje_at || b.updated_at || b.createdAt || 0);
      return db - da;
    })
    .slice(0, 8);

  // Contactos recientes
  const contactosRecientes = [...contacts]
    .sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0))
    .slice(0, 5);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-main-light dark:text-white">
            Mi Panel
          </h1>
          <p className="text-text-sub-light dark:text-gray-400 text-sm mt-0.5">
            Datos en tiempo real de <span className="font-semibold text-text-main-light dark:text-gray-200">{nombreEmpresa}</span>
          </p>
        </div>
        <button
          onClick={loadDashboard}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-semibold disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Actualizar
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          {error} — <button onClick={loadDashboard} className="underline font-semibold">Reintentar</button>
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Contactos"
          value={totalContactos}
          sub={nuevosSemana > 0 ? `+${nuevosSemana} esta semana` : 'Sin nuevos esta semana'}
          icon="contacts"
          color="primary"
          loading={loading}
        />
        <KPICard
          label="Nuevos Hoy"
          value={nuevosHoy}
          sub="contactos creados hoy"
          icon="person_add"
          color="green"
          loading={loading}
        />
        <KPICard
          label="Conversaciones Abiertas"
          value={convAbiertas.length}
          sub={convPendientes.length > 0 ? `${convPendientes.length} pendientes` : 'Sin pendientes'}
          icon="forum"
          color="blue"
          loading={loading}
        />
        <KPICard
          label="Resueltas"
          value={convResueltas.length}
          sub={`de ${totalConvs} conversaciones`}
          icon="check_circle"
          color="amber"
          loading={loading}
        />
      </div>

      {/* ── Fila media: gráfico contactos + estados ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfico de crecimiento de contactos */}
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="font-bold text-text-main-light dark:text-white">Contactos Nuevos</h3>
              <p className="text-xs text-text-sub-light dark:text-gray-400 mt-0.5">Por semana — últimas 8 semanas</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-primary">{nuevosSemana}</p>
              <p className="text-[10px] font-bold uppercase text-text-sub-light dark:text-gray-500">Esta semana</p>
            </div>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : totalContactos === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-text-sub-light dark:text-gray-500 gap-2">
              <span className="material-symbols-outlined text-[40px] opacity-30">contacts</span>
              <p className="text-sm">Aún no hay contactos registrados</p>
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartContactos}>
                  <defs>
                    <linearGradient id="gradContact" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#D4A574" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#D4A574" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [v, 'Contactos nuevos']}
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#D4A574"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gradContact)"
                    dot={{ fill: '#D4A574', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#C08A58' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Estado de conversaciones */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm flex flex-col">
          <h3 className="font-bold text-text-main-light dark:text-white mb-1">Estado de Conversaciones</h3>
          <p className="text-xs text-text-sub-light dark:text-gray-400 mb-5">{totalConvs} en total</p>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : totalConvs === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-text-sub-light dark:text-gray-500 gap-2">
              <span className="material-symbols-outlined text-[40px] opacity-30">forum</span>
              <p className="text-sm">Sin conversaciones aún</p>
            </div>
          ) : (
            <>
              {/* Mini bar chart */}
              <div className="h-36 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartEstados} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip
                      formatter={(v, n) => [v, n]}
                      contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartEstados.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Leyenda */}
              <div className="flex flex-col gap-2 mt-auto">
                {[
                  { label: 'Abiertas',   count: convAbiertas.length,   color: '#22C55E' },
                  { label: 'Pendientes', count: convPendientes.length,  color: '#F59E0B' },
                  { label: 'Resueltas',  count: convResueltas.length,   color: '#3B82F6' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-text-sub-light dark:text-gray-400">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 w-16 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${totalConvs > 0 ? (item.count / totalConvs) * 100 : 0}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <span className="text-xs font-bold text-text-main-light dark:text-white w-4 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Fila inferior: conversaciones recientes + contactos recientes ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Conversaciones recientes */}
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
            <h3 className="font-bold text-text-main-light dark:text-white">Conversaciones Recientes</h3>
            <span className="text-xs text-text-sub-light dark:text-gray-400 font-medium">
              {convAbiertas.length + convPendientes.length} activas
            </span>
          </div>

          {loading ? (
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : recientes.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-text-sub-light dark:text-gray-500 gap-2">
              <span className="material-symbols-outlined text-[48px] opacity-20">chat_bubble</span>
              <p className="text-sm">Sin conversaciones activas</p>
            </div>
          ) : (
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {recientes.map((conv, i) => {
                const nombre = conv.contacto_nombre || conv.nombre_contacto || conv.contact_name || 'Desconocido';
                const telefono = conv.telefono || conv.phone || conv.contacto_telefono || '';
                const ultimo = conv.ultimo_mensaje || conv.last_message || conv.preview || '';
                const fecha = conv.ultimo_mensaje_at || conv.updated_at || conv.createdAt;
                const noLeidos = conv.mensajes_no_leidos || conv.unread_count || 0;
                return (
                  <div key={conv.id || i} className="px-6 py-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {getInitials(nombre)}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-text-main-light dark:text-white truncate">{nombre}</p>
                        <EstadoBadge estado={conv.estado} />
                      </div>
                      {telefono && <p className="text-xs text-text-sub-light dark:text-gray-500">{telefono}</p>}
                      {ultimo && <p className="text-xs text-text-sub-light dark:text-gray-500 truncate mt-0.5">{ultimo}</p>}
                    </div>
                    {/* Derecha */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-text-sub-light dark:text-gray-500">{fmtDate(fecha)}</span>
                      {noLeidos > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                          {noLeidos}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Contactos recientes */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
            <h3 className="font-bold text-text-main-light dark:text-white">Últimos Contactos</h3>
            <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">{totalContactos} total</span>
          </div>

          {loading ? (
            <div className="divide-y divide-border-light dark:divide-border-dark flex-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28" />
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-36" />
                  </div>
                </div>
              ))}
            </div>
          ) : contactosRecientes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-text-sub-light dark:text-gray-500 gap-2 py-12">
              <span className="material-symbols-outlined text-[40px] opacity-20">person</span>
              <p className="text-sm">Sin contactos aún</p>
            </div>
          ) : (
            <div className="divide-y divide-border-light dark:divide-border-dark flex-1">
              {contactosRecientes.map((c, i) => {
                const nombre = c.nombre || c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sin nombre';
                const email = c.email || c.correo || '';
                const tel = c.telefono || c.phone || '';
                const fecha = c.created_at || c.createdAt || c.fecha_creacion;
                return (
                  <div key={c.id || i} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                      {getInitials(nombre)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-main-light dark:text-white truncate">{nombre}</p>
                      <p className="text-[11px] text-text-sub-light dark:text-gray-500 truncate">{email || tel || '—'}</p>
                    </div>
                    <span className="text-[10px] text-text-sub-light dark:text-gray-500 flex-shrink-0">{fmtDate(fecha)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {contactosRecientes.length > 0 && (
            <div className="px-5 py-3 border-t border-border-light dark:border-border-dark">
              <a href="/contacts" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                Ver todos los contactos
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
