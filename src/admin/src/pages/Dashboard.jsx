
import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { adminAPI } from '../../../services/api';

// ── helpers ───────────────────────────────────────────────────────────────────

function normalize(raw, ...keys) {
  if (Array.isArray(raw)) return raw;
  for (const k of keys) if (Array.isArray(raw?.[k])) return raw[k];
  if (raw?.data) return normalize(raw.data, ...keys);
  return [];
}

function buildMonthlyGrowth(items, months = 6) {
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    result.push({
      mes: d.toLocaleDateString('es-ES', { month: 'short' }),
      key: `${d.getFullYear()}-${d.getMonth()}`,
      nuevas: 0,
    });
  }
  items.forEach(e => {
    const raw = e.created_at;
    if (!raw) return;
    const d = new Date(raw);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const slot = result.find(r => r.key === key);
    if (slot) slot.nuevas++;
  });
  // cumulative total
  let sum = 0;
  return result.map(r => {
    sum += r.nuevas;
    return { mes: r.mes, nuevas: r.nuevas, total: sum };
  });
}

function buildMrrMonthly(pagos, months = 6) {
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    result.push({
      mes: d.toLocaleDateString('es-ES', { month: 'short' }),
      key: `${d.getFullYear()}-${d.getMonth()}`,
      mrr: 0,
    });
  }
  pagos.forEach(p => {
    const raw = p.fecha || p.fecha_pago || p.created_at;
    if (!raw) return;
    const d = new Date(raw);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const slot = result.find(r => r.key === key);
    if (slot) slot.mrr += Number(p.monto ?? p.amount ?? 0);
  });
  return result.map(({ mes, mrr }) => ({ mes, mrr }));
}

function buildPlanDist(empresas, planes) {
  // Map plan_id → name from planes list
  const planMap = {};
  planes.forEach(p => { planMap[p.id] = p.nombre ?? p.name ?? `Plan ${p.id}`; });

  const counts = {};
  empresas.forEach(e => {
    const planName = planMap[e.plan_id ?? e.id_plan] ?? e.plan ?? e.nombre_plan ?? 'Sin plan';
    counts[planName] = (counts[planName] || 0) + 1;
  });

  const colors = ['#94A3B8', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#312E81'];
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      pct: Math.round((value / empresas.length) * 100) || 0,
      color: colors[i % colors.length],
    }));
}

function buildEstadoDist(empresas) {
  const counts = { activo: 0, inactivo: 0, suspendido: 0 };
  empresas.forEach(e => {
    const s = (e.estado ?? 'activo').toLowerCase();
    if (s in counts) counts[s]++;
    else counts.activo++;
  });
  return [
    { name: 'Activas',     value: counts.activo,     color: '#22C55E' },
    { name: 'Inactivas',   value: counts.inactivo,   color: '#94A3B8' },
    { name: 'Suspendidas', value: counts.suspendido,  color: '#EF4444' },
  ].filter(d => d.value > 0);
}

function buildSectorDist(empresas) {
  const counts = {};
  empresas.forEach(e => {
    const s = e.sector ?? e.industria ?? e.rubro;
    if (!s) return;
    counts[s] = (counts[s] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([sector, total]) => ({ sector, total }));
}

function buildWeeklyMessages(stats) {
  // Try to use stats.mensajes_semana if backend provides it
  if (Array.isArray(stats?.mensajes_semana)) return stats.mensajes_semana;
  // Fallback: single value spread across days with mild variance
  const total = stats?.total_mensajes ?? stats?.mensajes_hoy ?? 0;
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const weights = [0.13, 0.16, 0.15, 0.18, 0.20, 0.10, 0.08];
  return days.map((dia, i) => ({
    dia,
    enviados:  Math.round(total * weights[i] * 0.6) || 0,
    recibidos: Math.round(total * weights[i] * 0.4) || 0,
  }));
}

const ESTADO_COLORS = {
  activo:   'bg-green-100 text-green-700',
  prueba:   'bg-amber-100 text-amber-700',
  trial:    'bg-amber-100 text-amber-700',
  inactivo: 'bg-red-100 text-red-600',
  suspendido:'bg-red-100 text-red-600',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const StatCard = ({ label, value, trend, icon, positive = true, color = '#2563EB', loading }) => (
  <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-4">
      <p className="text-[10px] font-black text-text-sub-light dark:text-text-sub-dark uppercase tracking-widest">{label}</p>
      <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
        <span className="material-symbols-outlined text-[20px]" style={{ color }}>{icon}</span>
      </div>
    </div>
    {loading
      ? <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      : (
        <div className="flex items-end justify-between gap-2">
          <h3 className="text-2xl font-black text-text-main-light dark:text-white tracking-tight">{value}</h3>
          {trend && (
            <span className={`flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-lg mb-0.5 ${positive ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              <span className="material-symbols-outlined text-[12px]">{positive ? 'trending_up' : 'trending_down'}</span>
              {trend}
            </span>
          )}
        </div>
      )
    }
  </div>
);

const Card = ({ title, subtitle, children, loading, badge }) => (
  <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6">
    <div className="flex items-start justify-between mb-5">
      <div>
        <h3 className="font-black text-text-main-light dark:text-white text-[15px]">{title}</h3>
        {subtitle && <p className="text-[11px] text-text-sub-light mt-0.5">{subtitle}</p>}
      </div>
      {badge && (
        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 tracking-wider">{badge}</span>
      )}
    </div>
    {loading
      ? <div className="h-52 bg-border-light dark:bg-border-dark rounded-xl animate-pulse" />
      : children
    }
  </div>
);

const TTip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-text-sub-light mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-black" style={{ color: p.color ?? p.fill ?? '#2563EB' }}>
          {p.name}: {prefix}{p.value?.toLocaleString()}{suffix}
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

// ── Dashboard ──────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const [stats,    setStats]    = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [planes,   setPlanes]   = useState([]);
  const [pagos,    setPagos]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [lastUpd,  setLastUpd]  = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    const [sRes, eRes, pRes, pgRes] = await Promise.allSettled([
      adminAPI.getStats(),
      adminAPI.getCompanies(),
      adminAPI.getPlans(),
      adminAPI.getPagos(),
    ]);
    if (sRes.status === 'fulfilled')  setStats(sRes.value?.data ?? sRes.value);
    if (eRes.status === 'fulfilled')  setEmpresas(normalize(eRes.value, 'empresas', 'data'));
    if (pRes.status === 'fulfilled')  setPlanes(normalize(pRes.value, 'planes', 'data'));
    if (pgRes.status === 'fulfilled') setPagos(normalize(pgRes.value, 'pagos', 'data'));
    setLastUpd(new Date());
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Derived series ──────────────────────────────────────────────────────────

  const companyGrowth = useMemo(() => buildMonthlyGrowth(empresas),    [empresas]);
  const mrrData       = useMemo(() => buildMrrMonthly(pagos),          [pagos]);
  const planDist      = useMemo(() => buildPlanDist(empresas, planes),  [empresas, planes]);
  const estadoDist    = useMemo(() => buildEstadoDist(empresas),        [empresas]);
  const sectorDist    = useMemo(() => buildSectorDist(empresas),        [empresas]);
  const weeklyMsgs    = useMemo(() => buildWeeklyMessages(stats),       [stats]);

  // planMap computed once for table
  const planMap = useMemo(() => {
    const m = {};
    planes.forEach(p => { m[p.id] = p.nombre ?? p.name ?? `Plan ${p.id}`; });
    return m;
  }, [planes]);

  const recentEmpresas = useMemo(() =>
    [...empresas]
      .sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0))
      .slice(0, 6),
    [empresas]
  );

  // fetch user counts for recent companies
  const [userCounts, setUserCounts] = useState({});
  useEffect(() => {
    if (recentEmpresas.length === 0) return;
    Promise.allSettled(
      recentEmpresas.map(e =>
        adminAPI.getUsers(e.empresa_id).then(res => ({
          id: e.empresa_id,
          count: normalize(res, 'usuarios', 'data').length,
        }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { if (r.status === 'fulfilled') map[r.value.id] = r.value.count; });
      setUserCounts(map);
    });
  }, [recentEmpresas]);

  // ── KPI values ─────────────────────────────────────────────────────────────

  const totalEmpresas = stats?.total_empresas ?? stats?.empresas ?? empresas.length;
  const totalUsuarios = stats?.total_usuarios ?? stats?.usuarios ?? 0;
  const totalMrr      = stats?.mrr ?? stats?.total_mrr ?? pagos.reduce((s, p) => s + Number(p.monto ?? p.amount ?? 0), 0);
  const totalMensajes = stats?.total_mensajes ?? stats?.mensajes ?? stats?.mensajes_hoy ?? 0;
  const churnRate     = stats?.churn_rate ?? stats?.churn ?? null;
  const retencion     = stats?.retencion ?? stats?.retention ?? (churnRate != null ? (100 - churnRate).toFixed(1) : null);

  const mrrActual = mrrData.at(-1)?.mrr || totalMrr;
  const mrrPrev   = mrrData.at(-2)?.mrr || 0;
  const mrrGrowth = mrrPrev > 0 ? (((mrrActual - mrrPrev) / mrrPrev) * 100).toFixed(1) : null;

  const noMsgData  = weeklyMsgs.every(d => d.enviados === 0 && d.recibidos === 0);
  const noPlanData = planDist.length === 0;

  const fmtMoney = (v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-[1400px] mx-auto pb-20">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-main-light dark:text-white">Dashboard General</h1>
          <p className="text-sm text-text-sub-light mt-0.5">Vista global de la plataforma</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpd && (
            <span className="text-[11px] text-text-sub-light hidden md:block">
              Act. {lastUpd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={fetchAll}
            disabled={loading}
            className="size-9 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-center justify-center hover:border-primary transition-all disabled:opacity-40"
            title="Actualizar"
          >
            <span className={`material-symbols-outlined text-[18px] text-text-sub-light ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Empresas"      value={totalEmpresas?.toLocaleString() ?? '—'} trend={null}                icon="domain"     color="#2563EB" loading={loading} />
        <StatCard label="Usuarios"      value={totalUsuarios?.toLocaleString() ?? '—'} trend={null}                icon="group"      color="#8B5CF6" loading={loading} />
        <StatCard label="MRR"           value={mrrActual ? fmtMoney(mrrActual) : '—'}  trend={mrrGrowth ? `${mrrGrowth}%` : null} positive={mrrGrowth >= 0} icon="payments" color="#10B981" loading={loading} />
        <StatCard label="Mensajes hoy"  value={totalMensajes?.toLocaleString() ?? '—'} trend={null}                icon="chat"       color="#F59E0B" loading={loading} />
        <StatCard label="Churn rate"    value={churnRate != null ? `${churnRate}%` : '—'} trend={null}             icon="person_off" color="#EF4444" positive={false}  loading={loading} />
        <StatCard label="Retención"     value={retencion != null ? `${retencion}%` : '—'} trend={null}             icon="verified"   color="#2563EB" loading={loading} />
      </div>

      {/* Row 1: Crecimiento + MRR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card title="Crecimiento de Plataforma" subtitle="Nuevas empresas registradas por mes" loading={loading}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={companyGrowth} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
              <Tooltip content={<TTip />} />
              <Area type="monotone" dataKey="nuevas" name="Nuevas" stroke="#2563EB" strokeWidth={2.5} fill="url(#gE)" dot={{ fill: '#2563EB', r: 3 }} />
              <Area type="monotone" dataKey="total"  name="Total acum." stroke="#8B5CF6" strokeWidth={2} strokeDasharray="4 2" fill="url(#gT)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3">
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-blue-600" /><span className="text-[11px] text-text-sub-light">Nuevas este mes</span></div>
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-violet-500" /><span className="text-[11px] text-text-sub-light">Total acumulado</span></div>
          </div>
        </Card>

        <Card title="Evolución MRR" subtitle="Ingresos recurrentes mensuales" loading={loading} badge={pagos.length === 0 ? 'Sin pagos' : undefined}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mrrData} margin={{ top: 0, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={v => `₲${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<TTip prefix="$" />} />
              <Area type="monotone" dataKey="mrr" name="MRR" stroke="#10B981" strokeWidth={2.5} fill="url(#gM)" dot={{ fill: '#10B981', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light dark:border-border-dark">
            <div>
              <p className="text-[10px] text-text-sub-light uppercase tracking-widest font-black">MRR actual</p>
              <p className="text-xl font-black text-green-600">{mrrActual ? fmtMoney(mrrActual) : '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-text-sub-light uppercase tracking-widest font-black">Crecimiento M/M</p>
              <p className="text-xl font-black text-text-main-light dark:text-white">
                {mrrGrowth != null ? `${mrrGrowth >= 0 ? '+' : ''}${mrrGrowth}%` : '—'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Mensajes semana + Planes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2">
          <Card title="Volumen de Mensajes" subtitle="Enviados vs. recibidos — esta semana" loading={loading} badge={noMsgData ? 'Sin datos' : undefined}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyMsgs} barSize={18} barGap={4} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip content={<TTip />} />
                <Bar dataKey="enviados"  name="Enviados"  fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recibidos" name="Recibidos" fill="#93C5FD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-3">
              <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-blue-600" /><span className="text-[11px] text-text-sub-light">Enviados</span></div>
              <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-blue-300" /><span className="text-[11px] text-text-sub-light">Recibidos</span></div>
            </div>
          </Card>
        </div>

        <Card title="Distribución de Planes" subtitle="Empresas por plan activo" loading={loading} badge={noPlanData ? 'Sin datos' : undefined}>
          {planDist.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={planDist} cx="50%" cy="50%" innerRadius={42} outerRadius={72} dataKey="value" strokeWidth={2} stroke="transparent" labelLine={false} label={PieLabel}>
                    {planDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} empresas`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2.5 mt-2">
                {planDist.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-sm" style={{ background: d.color }} />
                      <span className="text-xs text-text-sub-light truncate max-w-[100px]">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: d.color }} />
                      </div>
                      <span className="text-xs font-black text-text-main-light dark:text-white w-8 text-right">{d.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-text-sub-light">
              <span className="material-symbols-outlined text-[36px] opacity-30">pie_chart</span>
              <p className="text-xs font-bold">Sin empresas registradas</p>
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Sector + Últimas empresas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        <div className="lg:col-span-2">
          <Card title="Empresas por Sector" subtitle="Requiere campo sector en la tabla" loading={loading}>
            {/* Estado chips */}
            {estadoDist.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {estadoDist.map(d => (
                  <span key={d.name} className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full" style={{ background: d.color + '18', color: d.color }}>
                    <span className="size-1.5 rounded-full" style={{ background: d.color }} />
                    {d.value} {d.name}
                  </span>
                ))}
              </div>
            )}
            {sectorDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sectorDist} layout="vertical" barSize={14} margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="sector" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} width={90} />
                  <Tooltip content={<TTip />} />
                  <Bar dataKey="total" name="Empresas" fill="#2563EB" radius={[0, 4, 4, 0]}>
                    {sectorDist.map((_, i) => (
                      <Cell key={i} fill={`hsl(${220 + i * 10}, 75%, ${55 + i * 3}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-text-sub-light">
                <span className="material-symbols-outlined text-[36px] opacity-30">category</span>
                <p className="text-xs font-bold text-center">Sin datos de sector</p>
                <p className="text-[10px] text-center opacity-60">Agrega el campo <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">sector</code> a la tabla empresas.</p>
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card title="Últimas Empresas Registradas" subtitle="Nuevos clientes" loading={loading}>
            {recentEmpresas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 gap-2 text-text-sub-light">
                <span className="material-symbols-outlined text-[36px] opacity-30">domain</span>
                <p className="text-xs font-bold">Sin empresas registradas</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light dark:border-border-dark">
                      {['Empresa','Plan','Usuarios','Estado','Fecha'].map(h => (
                        <th key={h} className={`pb-3 text-[10px] font-black uppercase tracking-widest text-text-sub-light ${h === 'Empresa' ? 'text-left' : h === 'Fecha' ? 'text-right' : 'text-center'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {recentEmpresas.map((e, i) => {
                      const nombre  = e.nombre ?? `Empresa ${e.empresa_id}`;
                      const plan    = planMap[e.plan_id] ?? e.plan ?? e.nombre_plan ?? '—';
                      const estado  = (e.estado ?? 'activo').toLowerCase();
                      const usuarios = userCounts[e.empresa_id] ?? '…';
                      const fecha   = e.created_at;
                      const fechaLabel = fecha
                        ? new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                        : '—';
                      const planColor = ['#94A3B8','#3B82F6','#2563EB','#1D4ED8'][i % 4];
                      return (
                        <tr key={e.empresa_id ?? i} className="hover:bg-background-light dark:hover:bg-white/5 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="size-7 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center text-[11px] font-black shrink-0">
                                {nombre.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-text-main-light dark:text-white text-xs truncate max-w-[120px]">{nombre}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: planColor + '20', color: planColor }}>
                              {plan}
                            </span>
                          </td>
                          <td className="py-3 text-center text-xs font-bold text-text-sub-light">{usuarios}</td>
                          <td className="py-3 text-center">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full capitalize ${ESTADO_COLORS[estado] ?? 'bg-gray-100 text-gray-600'}`}>
                              {estado}
                            </span>
                          </td>
                          <td className="py-3 text-right text-[11px] text-text-sub-light">{fechaLabel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
