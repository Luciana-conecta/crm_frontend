
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { clientAPI, inboxAPI } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
} from 'recharts';

const C = {
  primary: '#2563EB',
  green:   '#22C55E',
  blue:    '#3B82F6',
  amber:   '#F59E0B',
  red:     '#EF4444',
  purple:  '#8B5CF6',
  indigo:  '#6366F1',
};

const PERIOD_FILTERS = [
  { key: 'today', label: 'Hoy' },
  { key: 'week',  label: '7 días' },
  { key: 'month', label: '30 días' },
];

// Demo data shown when real data is absent
const DEMO_CONTACTS_DAILY = [
  { name: 'Lun', valor: 3 }, { name: 'Mar', valor: 7 }, { name: 'Mié', valor: 5 },
  { name: 'Jue', valor: 9 }, { name: 'Vie', valor: 12 }, { name: 'Sáb', valor: 6 }, { name: 'Dom', valor: 4 },
];
const DEMO_CONVOS_DAILY = [
  { name: 'Lun', valor: 8 }, { name: 'Mar', valor: 14 }, { name: 'Mié', valor: 11 },
  { name: 'Jue', valor: 18 }, { name: 'Vie', valor: 22 }, { name: 'Sáb', valor: 9 }, { name: 'Dom', valor: 6 },
];
const DEMO_HOURLY = [
  { hora: '8h', msgs: 12 }, { hora: '9h', msgs: 28 }, { hora: '10h', msgs: 45 },
  { hora: '11h', msgs: 38 }, { hora: '12h', msgs: 22 }, { hora: '13h', msgs: 15 },
  { hora: '14h', msgs: 31 }, { hora: '15h', msgs: 52 }, { hora: '16h', msgs: 44 },
  { hora: '17h', msgs: 35 }, { hora: '18h', msgs: 20 }, { hora: '19h', msgs: 10 },
];
const DEMO_PIE = [
  { name: 'Abiertas', value: 8, color: C.amber },
  { name: 'Resueltas', value: 24, color: C.green },
];
const DEMO_RESPONSE = [
  { label: '< 5 min', count: 42 },
  { label: '5–15 min', count: 28 },
  { label: '15–60 min', count: 14 },
  { label: '> 1 hora', count: 6 },
];

function isInPeriod(dateStr, period) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  if (period === 'today') return d.toDateString() === now.toDateString();
  if (period === 'week')  { const t = new Date(now); t.setDate(now.getDate() - 7);  return d >= t; }
  if (period === 'month') { const t = new Date(now); t.setMonth(now.getMonth() - 1); return d >= t; }
  return true;
}

function buildDailyData(items, dateField, days = 7) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      name: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
      key: d.toDateString(),
      valor: 0,
    });
  }
  items.forEach(item => {
    const raw = item[dateField] || item.created_at || item.fecha_creacion;
    if (!raw) return;
    const key = new Date(raw).toDateString();
    const slot = result.find(r => r.key === key);
    if (slot) slot.valor++;
  });
  return result.map(({ name, valor }) => ({ name, valor }));
}

function normalizeList(raw, ...keys) {
  if (Array.isArray(raw)) return raw;
  for (const k of keys) if (Array.isArray(raw?.[k])) return raw[k];
  return [];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const KpiCard = ({ label, value, icon, color, sub, loading }) => (
  <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black text-text-sub-light dark:text-text-sub-dark uppercase tracking-widest">{label}</span>
      <div className="size-8 rounded-xl flex items-center justify-center" style={{ background: color + '1A' }}>
        <span className="material-symbols-outlined text-[18px]" style={{ color }}>{icon}</span>
      </div>
    </div>
    {loading
      ? <div className="h-8 w-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      : (
        <div>
          <div className="text-3xl font-black tracking-tighter text-text-main-light dark:text-white">{value}</div>
          {sub && <div className="text-[11px] text-text-sub-light mt-0.5">{sub}</div>}
        </div>
      )
    }
  </div>
);

const ChartCard = ({ title, subtitle, children, loading, badge }) => (
  <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6">
    <div className="flex items-start justify-between mb-5">
      <div>
        <h3 className="font-black text-text-main-light dark:text-white text-[15px]">{title}</h3>
        {subtitle && <p className="text-[11px] text-text-sub-light mt-0.5">{subtitle}</p>}
      </div>
      {badge && (
        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 tracking-wider">
          {badge}
        </span>
      )}
    </div>
    {loading
      ? <div className="h-48 bg-border-light dark:bg-border-dark rounded-xl animate-pulse" />
      : children
    }
  </div>
);

const TTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-text-sub-light mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-black" style={{ color: p.color ?? p.fill ?? C.primary }}>
          {p.name ?? ''}: {p.value}
        </p>
      ))}
    </div>
  );
};

const RADIAN = Math.PI / 180;
const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 800 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
];

// ─── Main Component ───────────────────────────────────────────────────────────

const AgentWorkspace = () => {
  const { user, impersonatedEmpresa } = useAuth();

  const extractId = (v) => {
    if (v == null) return null;
    if (typeof v === 'object') return v.empresa_id ?? v.id ?? v.id_empresa ?? null;
    return v;
  };
  const empresaId =
    extractId(impersonatedEmpresa) ||
    extractId(user?.empresa_id) ||
    user?.empresa?.id ||
    localStorage.getItem('crm_empresa_id');

  const [period,         setPeriod]         = useState('week');
  const [contacts,       setContacts]       = useState([]);
  const [openConvos,     setOpenConvos]     = useState([]);
  const [resolvedConvos, setResolvedConvos] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [lastUpdated,    setLastUpdated]    = useState(null);
  const [error,          setError]          = useState(null);

  const fetchAll = async () => {
    if (!empresaId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const [cRes, oRes, rRes] = await Promise.allSettled([
      clientAPI.getContacts(empresaId),
      inboxAPI.getConversations(empresaId, { estado: 'abierto' }),
      inboxAPI.getConversations(empresaId, { estado: 'resuelto' }),
    ]);
    if (cRes.status === 'fulfilled') setContacts(normalizeList(cRes.value, 'data', 'contactos'));
    if (oRes.status === 'fulfilled') setOpenConvos(normalizeList(oRes.value, 'conversaciones', 'data'));
    if (rRes.status === 'fulfilled') setResolvedConvos(normalizeList(rRes.value, 'conversaciones', 'data'));
    if ([cRes, oRes, rRes].every(r => r.status === 'rejected')) setError('No se pudieron cargar los datos.');
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [empresaId]);

  // ─── Derived data ──────────────────────────────────────────────────────────
  const hasRealData = contacts.length > 0 || openConvos.length > 0 || resolvedConvos.length > 0;

  const filteredContacts = useMemo(
    () => contacts.filter(c => isInPeriod(c.created_at ?? c.fecha_creacion, period)),
    [contacts, period]
  );
  const filteredResolved = useMemo(
    () => resolvedConvos.filter(c => isInPeriod(c.updated_at ?? c.fecha_actualizacion ?? c.created_at, period)),
    [resolvedConvos, period]
  );

  const totalOpen     = openConvos.length;
  const totalResolved = resolvedConvos.length;
  const totalConvos   = totalOpen + totalResolved;
  const resolutionRate = totalConvos > 0 ? Math.round((totalResolved / totalConvos) * 100) : 0;

  const contactsDaily = useMemo(
    () => hasRealData ? buildDailyData(contacts, 'created_at', 7) : DEMO_CONTACTS_DAILY,
    [contacts, hasRealData]
  );
  const convosDaily = useMemo(
    () => hasRealData
      ? buildDailyData([...openConvos, ...resolvedConvos], 'created_at', 7)
      : DEMO_CONVOS_DAILY,
    [openConvos, resolvedConvos, hasRealData]
  );
  const convoPieData = useMemo(() => {
    const d = [
      { name: 'Abiertas',  value: totalOpen,     color: C.amber },
      { name: 'Resueltas', value: totalResolved,  color: C.green },
    ].filter(x => x.value > 0);
    return d.length > 0 ? d : DEMO_PIE;
  }, [totalOpen, totalResolved]);

  const recentConvos = useMemo(() => {
    return [...openConvos, ...resolvedConvos]
      .sort((a, b) =>
        new Date(b.updated_at ?? b.ultimo_mensaje ?? b.created_at ?? 0) -
        new Date(a.updated_at ?? a.ultimo_mensaje ?? a.created_at ?? 0)
      ).slice(0, 6);
  }, [openConvos, resolvedConvos]);

  const recentContacts = useMemo(() => {
    return [...contacts]
      .sort((a, b) =>
        new Date(b.created_at ?? b.fecha_creacion ?? 0) -
        new Date(a.created_at ?? a.fecha_creacion ?? 0)
      ).slice(0, 5);
  }, [contacts]);

  const userName  = user?.nombre ?? user?.name ?? 'Usuario';
  const todayLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayCap   = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-[1400px] mx-auto pb-20">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-main-light dark:text-white">
            Hola, {userName}
          </h1>
          <p className="text-sm text-text-sub-light mt-0.5">{todayCap}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-1 gap-0.5">
            {PERIOD_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setPeriod(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === f.key
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-sub-light hover:text-text-main-light dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            title="Actualizar datos"
            className="size-9 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-center justify-center hover:border-primary transition-all disabled:opacity-40"
          >
            <span className={`material-symbols-outlined text-[18px] text-text-sub-light ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
          {lastUpdated && (
            <span className="text-[11px] text-text-sub-light hidden md:block">
              Act. {lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-3 text-sm font-semibold">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      )}

      {!hasRealData && !loading && (
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 rounded-2xl px-5 py-3 text-sm font-semibold">
          <span className="material-symbols-outlined text-[20px]">info</span>
          Los gráficos muestran datos de ejemplo. Se actualizarán con tus datos reales cuando comiences a usar el CRM.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Nuevos Contactos"        value={filteredContacts.length || contacts.length} icon="person_add" color={C.primary} sub={`${contacts.length} total registrados`} loading={loading} />
        <KpiCard label="Conversaciones Abiertas" value={totalOpen}               icon="forum"      color={C.amber}  sub="Pendientes de respuesta"          loading={loading} />
        <KpiCard label="Mensajes Resueltos"      value={filteredResolved.length} icon="task_alt"   color={C.green}  sub={`${totalResolved} total histórico`} loading={loading} />
        <KpiCard label="Tasa de Resolución"      value={`${resolutionRate}%`}    icon="analytics"  color={C.blue}   sub={`sobre ${totalConvos} conversaciones`} loading={loading} />
      </div>

      {/* Row 1: Contactos trend + Conversaciones trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <ChartCard title="Nuevos Contactos" subtitle="Últimos 7 días" loading={loading} badge={!hasRealData ? 'Demo' : undefined}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={contactsDaily} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradContacts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.primary} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip content={<TTip />} />
              <Area type="monotone" dataKey="valor" name="Contactos" stroke={C.primary} strokeWidth={2.5} fill="url(#gradContacts)" dot={{ fill: C.primary, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Conversaciones" subtitle="Últimos 7 días" loading={loading} badge={!hasRealData ? 'Demo' : undefined}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={convosDaily} barSize={22} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip content={<TTip />} />
              <Bar dataKey="valor" name="Conversaciones" fill={C.amber} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Actividad por hora + Estado + Tiempos de respuesta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2">
          <ChartCard title="Actividad por Hora" subtitle="Mensajes recibidos durante el día" loading={loading} badge={!hasRealData ? 'Demo' : undefined}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={DEMO_HOURLY} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip content={<TTip />} />
                <Line type="monotone" dataKey="msgs" name="Mensajes" stroke={C.indigo} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: C.indigo }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Estado Conversaciones" subtitle="Distribución actual" loading={loading} badge={!hasRealData ? 'Demo' : undefined}>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={convoPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={70} labelLine={false} label={PieLabel} dataKey="value">
                {convoPieData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 mt-2">
            {convoPieData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-[11px] text-text-sub-light">{d.name}</span>
                </div>
                <span className="text-[11px] font-black text-text-main-light dark:text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Row 3: Tiempo de respuesta + Conversaciones recientes + Últimos contactos */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        <div className="lg:col-span-2">
          <ChartCard title="Tiempo de Primera Respuesta" subtitle="Distribución de tiempos" loading={loading} badge={!hasRealData ? 'Demo' : undefined}>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={DEMO_RESPONSE} layout="vertical" barSize={14} margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} width={70} />
                <Tooltip content={<TTip />} />
                <Bar dataKey="count" name="Conversaciones" radius={[0, 4, 4, 0]}>
                  {DEMO_RESPONSE.map((_, i) => (
                    <Cell key={i} fill={[C.green, C.blue, C.amber, C.red][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Conversaciones recientes */}
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-text-main-light dark:text-white text-[15px]">Conversaciones Recientes</h3>
            <a href="/inbox" className="text-xs font-bold text-primary hover:underline">Ver todas →</a>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="size-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-2.5 w-1/2 bg-gray-100 dark:bg-gray-800 rounded" />
                  </div>
                  <div className="h-5 w-14 bg-gray-100 dark:bg-gray-800 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-sub-light">
              <span className="material-symbols-outlined text-[40px]">chat_bubble</span>
              <p className="text-sm font-bold">Sin conversaciones aún</p>
              <p className="text-xs text-center">Conecta un canal de WhatsApp en Configuración para empezar.</p>
            </div>
          ) : (
            <div className="divide-y divide-border-light dark:divide-border-dark -mx-2">
              {recentConvos.map((conv, i) => {
                const nombre   = conv.contacto_nombre ?? conv.nombre ?? conv.nombre_contacto ?? 'Desconocido';
                const telefono = conv.numero ?? conv.telefono ?? conv.numero_telefono ?? 'WhatsApp';
                const estado   = conv.estado ?? 'abierta';
                const isOpen   = estado === 'abierta' || estado === 'abierto';
                const fecha    = conv.updated_at ?? conv.ultimo_mensaje ?? conv.created_at;
                const fechaLabel = fecha
                  ? new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                  : '';
                return (
                  <div key={conv.id ?? i} className="flex items-center gap-3 py-3 px-2 hover:bg-background-light dark:hover:bg-white/5 rounded-xl transition-colors">
                    <div className={`size-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-main-light dark:text-white truncate">{nombre}</p>
                      <p className="text-[11px] text-text-sub-light truncate">{telefono}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isOpen ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {isOpen ? 'Abierta' : 'Resuelta'}
                      </span>
                      {fechaLabel && <span className="text-[10px] text-text-sub-light">{fechaLabel}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimos contactos */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-text-main-light dark:text-white text-[15px]">Últimos Contactos</h3>
            <a href="/contacts" className="text-xs font-bold text-primary hover:underline">Ver →</a>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-2.5 w-2/3 bg-gray-100 dark:bg-gray-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-sub-light">
              <span className="material-symbols-outlined text-[40px]">contacts</span>
              <p className="text-sm font-bold">Sin contactos aún</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 -mx-2">
              {recentContacts.map((c, i) => {
                const nombre = c.nombre ?? c.name ?? 'Sin nombre';
                const sub    = c.email ?? c.numero_telefono ?? c.telefono ?? '';
                const fecha  = c.created_at ?? c.fecha_creacion ?? '';
                const fechaLabel = fecha
                  ? new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                  : '';
                return (
                  <div key={c.id ?? c.id_contactos ?? i} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-background-light dark:hover:bg-white/5 transition-colors">
                    <div className={`size-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-main-light dark:text-white truncate">{nombre}</p>
                      {sub && <p className="text-[11px] text-text-sub-light truncate">{sub}</p>}
                    </div>
                    {fechaLabel && (
                      <span className="text-[10px] text-text-sub-light shrink-0">{fechaLabel}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AgentWorkspace;
