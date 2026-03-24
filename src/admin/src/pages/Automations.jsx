
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../../../src/services/api';
import apiClient from '../../../../src/services/api';

/* IDs de templates — deben coincidir con los del cliente */
const TEMPLATE_IDS = [
  { id: 'wa-auto-reply',       label: 'Respuesta Automática WhatsApp', icon: 'chat',                  color: 'text-green-500',   bg: 'bg-green-50 dark:bg-green-900/20' },
  { id: 'new-contact-notify',  label: 'Alerta de Nuevo Contacto',       icon: 'person_add',            color: 'text-primary',     bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'follow-up-reminder',  label: 'Recordatorio de Seguimiento',    icon: 'schedule',              color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'daily-report',        label: 'Reporte Diario Automático',      icon: 'summarize',             color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { id: 'csat-survey',         label: 'Encuesta de Satisfacción',       icon: 'star_rate',             color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-900/20' },
  { id: 'sheets-sync',         label: 'Sync con Google Sheets',         icon: 'table_chart',           color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { id: 'unread-alert',        label: 'Alerta Mensaje sin Respuesta',   icon: 'notification_important', color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20' },
  { id: 'auto-assign',         label: 'Asignación Automática de Agente',icon: 'manage_accounts',       color: 'text-cyan-500',    bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
];

const N8N_CFG_KEY = 'crm_admin_n8n_config';
const saveN8nCfg  = (cfg) => localStorage.setItem(N8N_CFG_KEY, JSON.stringify(cfg));
const loadN8nCfg  = () => { try { return JSON.parse(localStorage.getItem(N8N_CFG_KEY)) ?? null; } catch { return null; } };

const INPUT_CLS = 'w-full h-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 font-semibold text-sm text-text-main-light dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all';

/* ─────────────────────────────────────────
   Componente
───────────────────────────────────────── */
const AdminAutomations = () => {
  /* n8n config de Insignia */
  const [n8nCfg, setN8nCfg]           = useState(loadN8nCfg);
  const [n8nForm, setN8nForm]         = useState({ url: '', apiKey: '' });
  const [n8nConnecting, setN8nConnecting] = useState(false);
  const [n8nError, setN8nError]       = useState('');
  const [showCfgForm, setShowCfgForm] = useState(false);

  /* Workflows en n8n (para elegir cuál es el template master) */
  const [n8nWorkflows, setN8nWorkflows] = useState([]);
  const [loadingWf, setLoadingWf]       = useState(false);

  /* Mapa templateId → n8nWorkflowId */
  const [mapping, setMapping]     = useState({});
  const [savingMap, setSavingMap] = useState(false);
  const [mapSaved, setMapSaved]   = useState(false);

  /* Workflows activos por empresa */
  const [companyWorkflows, setCompanyWorkflows] = useState([]);
  const [loadingCwf, setLoadingCwf]             = useState(false);
  const [filterEmpresa, setFilterEmpresa]       = useState('');
  const [empresas, setEmpresas]                 = useState([]);

  useEffect(() => {
    if (n8nCfg) {
      setN8nForm({ url: n8nCfg.url, apiKey: n8nCfg.apiKey });
      fetchN8nWorkflows(n8nCfg);
      loadMapping();
    }
    loadCompanyWorkflows();
    adminAPI.getCompanies().then(r => setEmpresas(r.data || [])).catch(() => {});
  }, []);

  /* ── n8n ── */
  const fetchN8nWorkflows = async (cfg) => {
    setLoadingWf(true);
    setN8nError('');
    try {
      const base = cfg.url.replace(/\/$/, '');
      const res  = await fetch(`${base}/api/v1/workflows?limit=100`, {
        headers: { 'X-N8N-API-KEY': cfg.apiKey },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setN8nWorkflows(data.data ?? data ?? []);
    } catch (err) {
      setN8nError(err.message.includes('fetch') ? 'No se pudo conectar a n8n. Revisá la URL y el CORS.' : err.message);
    } finally {
      setLoadingWf(false);
    }
  };

  const handleN8nConnect = async (e) => {
    e.preventDefault();
    setN8nConnecting(true);
    setN8nError('');
    const cfg = { url: n8nForm.url.trim().replace(/\/$/, ''), apiKey: n8nForm.apiKey.trim() };
    try {
      const base = cfg.url.replace(/\/$/, '');
      const res  = await fetch(`${base}/api/v1/workflows?limit=5`, {
        headers: { 'X-N8N-API-KEY': cfg.apiKey },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      saveN8nCfg(cfg);
      setN8nCfg(cfg);
      setShowCfgForm(false);
      fetchN8nWorkflows(cfg);
      // Guardar también en backend para que pueda usarlo en activación
      await apiClient.post('/admin/n8n-config', cfg).catch(() => {});
    } catch (err) {
      setN8nError(err.message.includes('fetch') ? 'No se pudo conectar. Verificá la URL y que n8n permite CORS.' : err.message);
    } finally {
      setN8nConnecting(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem(N8N_CFG_KEY);
    setN8nCfg(null);
    setN8nWorkflows([]);
    setN8nForm({ url: '', apiKey: '' });
    setN8nError('');
  };

  /* ── Mapping template → workflow master ── */
  const loadMapping = async () => {
    try {
      const res = await apiClient.get('/admin/n8n-template-mapping');
      setMapping(res.data?.data || res.data || {});
    } catch {
      // Silently fail — se guarda en localStorage como fallback
      const local = localStorage.getItem('crm_n8n_mapping');
      if (local) setMapping(JSON.parse(local));
    }
  };

  const handleSaveMapping = async () => {
    setSavingMap(true);
    try {
      await apiClient.post('/admin/n8n-template-mapping', { mapping });
    } catch {
      // Fallback local
    }
    localStorage.setItem('crm_n8n_mapping', JSON.stringify(mapping));
    setMapSaved(true);
    setTimeout(() => setMapSaved(false), 3000);
    setSavingMap(false);
  };

  /* ── Company workflows ── */
  const loadCompanyWorkflows = async () => {
    setLoadingCwf(true);
    try {
      const res = await apiClient.get('/admin/workflows');
      setCompanyWorkflows(res.data?.data || res.data || []);
    } catch {
      setCompanyWorkflows([]);
    } finally {
      setLoadingCwf(false);
    }
  };

  const handleForceDeactivate = async (wf) => {
    if (!confirm(`¿Forzar desactivación del workflow "${wf.name}"?`)) return;
    try {
      await apiClient.delete(`/admin/workflows/${wf.id}`);
      loadCompanyWorkflows();
    } catch { alert('Error al desactivar.'); }
  };

  const filteredCwf = filterEmpresa
    ? companyWorkflows.filter(w => String(w.empresa_id) === filterEmpresa)
    : companyWorkflows;

  const tmplMap = Object.fromEntries(TEMPLATE_IDS.map(t => [t.id, t]));

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-12 pb-20">

      {/* Header */}
      <div>
        <h1 className="text-4xl font-black">Automatizaciones</h1>
        <p className="text-text-sub-light mt-2 text-lg">Configurá n8n, mapeá los templates y monitoreá los flujos de tus clientes.</p>
      </div>

      {/* ── 1. Conexión n8n (cuenta de Insignia) ── */}
      <section className="space-y-5">
        <div className="flex items-center gap-3 border-b border-border-light dark:border-border-dark pb-4">
          <div className="size-10 rounded-2xl bg-[#ea4b71]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] text-[#ea4b71]">hub</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black">Cuenta n8n de Insignia</h2>
            <p className="text-xs text-text-sub-light mt-0.5">Esta es TU cuenta n8n. Los clientes nunca acceden a ella.</p>
          </div>
          {n8nCfg && (
            <span className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase tracking-widest">
              <span className="size-2 bg-green-500 rounded-full shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
              Conectado
            </span>
          )}
        </div>

        {!n8nCfg && !showCfgForm && (
          <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-border-light dark:border-border-dark p-10 flex flex-col items-center text-center gap-5">
            <div className="size-16 rounded-3xl bg-[#ea4b71]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px] text-[#ea4b71]">hub</span>
            </div>
            <div>
              <p className="font-black text-lg">n8n no configurado</p>
              <p className="text-sm text-text-sub-light mt-1 max-w-md">Conectá tu cuenta n8n para poder clonar workflows y activarlos automáticamente cuando un cliente activa un template.</p>
            </div>
            <button
              onClick={() => setShowCfgForm(true)}
              className="h-12 bg-[#ea4b71] text-white px-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add_link</span>
              Configurar n8n
            </button>
          </div>
        )}

        {!n8nCfg && showCfgForm && (
          <form onSubmit={handleN8nConnect} className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-border-light dark:border-border-dark p-8 max-w-lg space-y-5">
            <h3 className="font-black text-lg">Configuración n8n</h3>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">URL de tu instancia n8n</label>
              <input required placeholder="https://n8n.tudominio.com" value={n8nForm.url} onChange={e => setN8nForm(p => ({...p, url: e.target.value}))} className={INPUT_CLS} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">API Key</label>
              <input required type="password" placeholder="••••••••••••••••••" value={n8nForm.apiKey} onChange={e => setN8nForm(p => ({...p, apiKey: e.target.value}))} className={INPUT_CLS} />
              <p className="text-[10px] text-text-sub-light">En n8n: <strong>Settings → API → Create API Key</strong></p>
            </div>
            {n8nError && <p className="text-sm text-red-500 font-bold">{n8nError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={n8nConnecting} className="flex-1 h-12 bg-[#ea4b71] text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
                {n8nConnecting ? <><span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Conectando...</> : 'Conectar'}
              </button>
              <button type="button" onClick={() => { setShowCfgForm(false); setN8nError(''); }} className="h-12 px-5 border-2 border-gray-200 dark:border-gray-700 rounded-2xl text-text-sub-light font-black text-xs uppercase tracking-widest transition">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {n8nCfg && (
          <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-border-light dark:border-border-dark p-6 flex items-center gap-5">
            <div className="size-12 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-green-500">check_circle</span>
            </div>
            <div className="flex-1">
              <p className="font-black text-sm">Conectado a n8n</p>
              <p className="text-xs text-text-sub-light mt-0.5 truncate">{n8nCfg.url}</p>
              <p className="text-[10px] text-text-sub-light mt-0.5">{n8nWorkflows.length} workflows disponibles como templates</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => fetchN8nWorkflows(n8nCfg)} disabled={loadingWf} className="h-9 px-4 bg-gray-100 dark:bg-gray-800 rounded-xl font-black text-[10px] uppercase text-text-sub-light hover:text-primary transition flex items-center gap-1.5 disabled:opacity-50">
                <span className={`material-symbols-outlined text-[16px] ${loadingWf ? 'animate-spin' : ''}`}>refresh</span>
                Actualizar
              </button>
              <button onClick={() => { setShowCfgForm(true); setN8nCfg(null); }} className="h-9 px-4 bg-gray-100 dark:bg-gray-800 rounded-xl font-black text-[10px] uppercase text-text-sub-light hover:text-primary transition">
                Cambiar
              </button>
              <button onClick={handleDisconnect} className="h-9 px-4 rounded-xl border-2 border-red-200 dark:border-red-900 text-red-500 font-black text-[10px] uppercase hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                Desconectar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── 2. Mapeo template → workflow master ── */}
      {n8nCfg && (
        <section className="space-y-5">
          <div className="flex items-center gap-3 border-b border-border-light dark:border-border-dark pb-4">
            <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-primary">alt_route</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black">Mapeo de Templates</h2>
              <p className="text-xs text-text-sub-light mt-0.5">Para cada template, elegí cuál workflow de tu n8n se usa como base para clonar.</p>
            </div>
            <button
              onClick={handleSaveMapping}
              disabled={savingMap}
              className={`h-10 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition flex items-center gap-2 ${
                mapSaved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:opacity-90'
              } disabled:opacity-50`}
            >
              {savingMap ? (
                <><span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
              ) : mapSaved ? (
                <><span className="material-symbols-outlined text-[16px]">check</span>Guardado</>
              ) : (
                'Guardar mapeo'
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMPLATE_IDS.map(t => (
              <div key={t.id} className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-5 flex items-center gap-4">
                <div className={`size-10 rounded-xl ${t.bg} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined text-[20px] ${t.color}`}>{t.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-text-main-light dark:text-white truncate">{t.label}</p>
                  <p className="text-[10px] text-text-sub-light mt-0.5">ID: {t.id}</p>
                </div>
                <select
                  value={mapping[t.id] || ''}
                  onChange={e => setMapping(p => ({ ...p, [t.id]: e.target.value }))}
                  className="h-10 px-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white min-w-[180px]"
                >
                  <option value="">— Sin asignar —</option>
                  {n8nWorkflows.map(wf => (
                    <option key={wf.id} value={wf.id}>{wf.name} (#{wf.id})</option>
                  ))}
                </select>
                {mapping[t.id] && (
                  <span className="size-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-[14px]">check</span>
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-500 text-[18px] shrink-0 mt-0.5">info</span>
            <p className="text-xs text-text-sub-light leading-relaxed">
              Cuando un cliente activa un template, el backend clona el workflow seleccionado, inyecta las credenciales del cliente y lo activa en tu n8n. <strong>Cada empresa tiene su propio workflow aislado.</strong>
            </p>
          </div>
        </section>
      )}

      {/* ── 3. Workflows activos por empresa ── */}
      <section className="space-y-5">
        <div className="flex items-center gap-3 border-b border-border-light dark:border-border-dark pb-4">
          <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] text-primary">account_tree</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black">Workflows por Empresa</h2>
            <p className="text-xs text-text-sub-light mt-0.5">Todos los flujos activos de tus clientes. Podés forzar la desactivación si es necesario.</p>
          </div>
          <button onClick={loadCompanyWorkflows} disabled={loadingCwf} className="h-9 px-4 bg-gray-100 dark:bg-gray-800 rounded-xl font-black text-[10px] uppercase text-text-sub-light hover:text-primary transition flex items-center gap-1.5 disabled:opacity-50">
            <span className={`material-symbols-outlined text-[16px] ${loadingCwf ? 'animate-spin' : ''}`}>refresh</span>
            Actualizar
          </button>
        </div>

        {/* Filtro empresa */}
        <select
          value={filterEmpresa}
          onChange={e => setFilterEmpresa(e.target.value)}
          className="h-11 px-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-sm font-bold dark:text-white"
        >
          <option value="">Todas las empresas</option>
          {empresas.map(e => (
            <option key={e.empresa_id} value={String(e.empresa_id)}>{e.nombre}</option>
          ))}
        </select>

        {loadingCwf ? (
          <div className="flex items-center justify-center py-16">
            <span className="size-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredCwf.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-border-light dark:border-border-dark p-14 text-center">
            <span className="material-symbols-outlined text-[48px] text-gray-200 dark:text-gray-800">account_tree</span>
            <p className="text-sm font-bold text-text-sub-light mt-3">
              {companyWorkflows.length === 0 ? 'Aún no hay workflows activos. Los clientes los activarán desde su panel.' : 'Sin resultados para el filtro seleccionado.'}
            </p>
          </div>
        ) : (
          <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-border-light dark:border-border-dark overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark">
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Empresa</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Template</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Workflow n8n</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Estado</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Activado</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {filteredCwf.map(wf => {
                  const tmpl = tmplMap[wf.template_id];
                  return (
                    <tr key={wf.id} className="border-b border-border-light dark:border-border-dark last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                      <td className="px-6 py-4">
                        <p className="font-black text-sm">{wf.empresa_nombre || `Empresa #${wf.empresa_id}`}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {tmpl && (
                            <div className={`size-7 rounded-lg ${tmpl.bg} flex items-center justify-center shrink-0`}>
                              <span className={`material-symbols-outlined text-[14px] ${tmpl.color}`}>{tmpl.icon}</span>
                            </div>
                          )}
                          <p className="text-sm font-bold text-text-sub-light">{tmpl?.label || wf.template_id}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-text-sub-light font-mono">#{wf.n8n_workflow_id || '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${
                          wf.active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>
                          {wf.active ? 'Activo' : 'Pausado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-sub-light">
                        {wf.created_at ? new Date(wf.created_at).toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleForceDeactivate(wf)}
                          className="size-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition"
                          title="Forzar desactivación"
                        >
                          <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminAutomations;
