import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { inboxAPI, socialAPI, authAPI } from '../services/api';
import ClientTeamManagement from './client/TeamManagement';
import ClientBilling from './client/Billing';
import ClientPermissions from './client/RolePermissions';

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

async function uploadToImgbb(file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const form = new FormData();
  form.append('key', IMGBB_API_KEY);
  form.append('image', base64);
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Error al subir imagen');
  return (await res.json()).data.url;
}

// ── Logos SVG de canales ───────────────────────────────────────────────────────
const WhatsAppLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const InstagramLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const TelegramLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// ── Estilos de canales ─────────────────────────────────────────────────────────
const CHANNEL_STYLES = {
  whatsapp:  { bg: 'bg-green-500',  light: 'bg-green-50  dark:bg-green-900/20',  text: 'text-green-600',  border: 'border-green-200 dark:border-green-800' },
  instagram: { bg: 'bg-gradient-to-br from-purple-500 to-pink-500', light: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600', border: 'border-pink-200 dark:border-pink-800' },
  facebook:  { bg: 'bg-blue-600',   light: 'bg-blue-50   dark:bg-blue-900/20',   text: 'text-blue-600',   border: 'border-blue-200 dark:border-blue-800' },
};

const STATUS_BADGE = {
  activo:       'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactivo:     'bg-gray-100  text-gray-500  dark:bg-gray-800',
  desconectado: 'bg-gray-100  text-gray-500  dark:bg-gray-800',
  error:        'bg-red-100   text-red-600   dark:bg-red-900/30   dark:text-red-400',
};

const inputCls = 'w-full h-12 px-4 bg-gray-50 dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 dark:text-white placeholder-text-sub-light transition-all';

// ── Submenú lateral ───────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'general',   label: 'General',            icon: 'settings' },
  { id: 'canales',   label: 'Canales Conectados',  icon: 'hub' },
  { id: 'equipo',    label: 'Equipo',              icon: 'group' },
  { id: 'permisos',  label: 'Permisos',            icon: 'security' },
  { id: 'factura',   label: 'Facturación',         icon: 'receipt_long' },
  { id: 'seguridad', label: 'Seguridad',           icon: 'lock' },
];

// ── Settings ──────────────────────────────────────────────────────────────────
const Settings = ({ role = 'admin' }) => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const empresaId = user?.empresa_id;
  const isClient = role === 'admin_empresa' || role === 'usuario_empresa' || role === 'client';

  const [activeTab, setActiveTab] = useState('general');

  // ── Seguridad: cambio de contraseña ──
  const [pwForm, setPwForm]     = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg,    setPwMsg]    = useState(null); // { type: 'success'|'error', text }
  const [pwShow,   setPwShow]   = useState({ current: false, next: false, confirm: false });

  // ── Perfil ──
  const [profile, setProfile] = useState({
    name:  user?.nombre  || user?.name  || 'Mi cuenta',
    email: user?.email   || '',
  });
  const fileInputRef = useRef(null);

  // ── Logo empresa ──
  const savedLogoUrl = user?.empresa?.logo || user?.logo_empresa || '';
  const [logoUrl,     setLogoUrl]     = useState(savedLogoUrl);
  const [logoPreview, setLogoPreview] = useState(savedLogoUrl);
  const [logoFile,    setLogoFile]    = useState(null);
  const [logoSaving,  setLogoSaving]  = useState(false);
  const [logoMsg,     setLogoMsg]     = useState(null);
  const logoFileRef = useRef(null);

  // ── WhatsApp canales ──
  const [waCanales,   setWaCanales]   = useState([]);
  const [waLoading,   setWaLoading]   = useState(false);
  const [waShowForm,  setWaShowForm]  = useState(false);
  const [waEditing,   setWaEditing]   = useState(null);
  const [waSaving,    setWaSaving]    = useState(false);
  const [waMsg,       setWaMsg]       = useState(null);
  const [waConfirm,   setWaConfirm]   = useState(null);
  const [waForm, setWaForm] = useState({ nombre: '', phone_number_id: '', access_token: '', business_account_id: '' });

  // ── Social canales (IG / FB) ──
  const makeSocial = () => ({ canales: [], loading: false, showForm: false, editing: null, saving: false, msg: null, confirm: null, form: { nombre: '', page_id: '', access_token: '' } });
  const [ig, setIg] = useState(makeSocial());
  const [fb, setFb] = useState(makeSocial());

  const setSocial = (tipo, patch) => tipo === 'instagram' ? setIg(s => ({ ...s, ...patch })) : setFb(s => ({ ...s, ...patch }));
  const getSocial = (tipo) => tipo === 'instagram' ? ig : fb;

  // ── Carga inicial ──
  useEffect(() => {
    if (!isClient || !empresaId) return;
    loadWa();
    loadSocial('instagram');
    loadSocial('facebook');
  }, [empresaId]);

  const loadWa = async () => {
    setWaLoading(true);
    try {
      const res = await inboxAPI.getCanales(empresaId);
      setWaCanales(Array.isArray(res.canales ?? res.data ?? res) ? (res.canales ?? res.data ?? res) : []);
    } catch { setWaCanales([]); }
    finally { setWaLoading(false); }
  };

  const loadSocial = async (tipo) => {
    setSocial(tipo, { loading: true });
    try {
      const res = await socialAPI.getCanales(empresaId, tipo);
      const list = res.canales ?? res.data ?? res ?? [];
      setSocial(tipo, { canales: Array.isArray(list) ? list : [], loading: false });
    } catch { setSocial(tipo, { canales: [], loading: false }); }
  };

  // ── WA handlers ──
  const waOpenNew  = () => { setWaEditing(null); setWaForm({ nombre: '', phone_number_id: '', access_token: '', business_account_id: '' }); setWaMsg(null); setWaShowForm(true); };
  const waOpenEdit = (c) => { setWaEditing(c); setWaForm({ nombre: c.nombre, phone_number_id: c.phone_number_id, access_token: c.access_token, business_account_id: c.business_account_id }); setWaMsg(null); setWaShowForm(true); };
  const waDelete   = async (id) => {
    try { await inboxAPI.deleteCanal(empresaId, id); loadWa(); } catch (e) { alert(e.message); }
    finally { setWaConfirm(null); }
  };
  const waSave = async (e) => {
    e.preventDefault(); setWaSaving(true); setWaMsg(null);
    try {
      waEditing ? await inboxAPI.updateCanal(empresaId, waEditing.id, waForm) : await inboxAPI.createCanal(empresaId, waForm);
      setWaMsg({ type: 'success', text: waEditing ? 'Canal actualizado.' : 'Canal creado.' });
      setWaShowForm(false); setWaEditing(null); loadWa();
    } catch (err) { setWaMsg({ type: 'error', text: err.response?.data?.message || 'Error al guardar.' }); }
    finally { setWaSaving(false); }
  };

  // ── Social handlers ──
  const socOpenNew  = (tipo) => setSocial(tipo, { editing: null, form: { nombre: '', page_id: '', access_token: '' }, msg: null, showForm: true });
  const socOpenEdit = (tipo, c) => setSocial(tipo, { editing: c, form: { nombre: c.nombre, page_id: c.page_id, access_token: c.access_token }, msg: null, showForm: true });
  const socDelete   = async (tipo, id) => {
    try { await socialAPI.deleteCanal(id); loadSocial(tipo); } catch (e) { alert(e.message); }
    finally { setSocial(tipo, { confirm: null }); }
  };
  const socSave = async (e, tipo) => {
    e.preventDefault();
    const s = getSocial(tipo);
    setSocial(tipo, { saving: true, msg: null });
    try {
      s.editing ? await socialAPI.updateCanal(s.editing.id, { ...s.form, tipo }) : await socialAPI.createCanal(empresaId, { ...s.form, tipo });
      setSocial(tipo, { saving: false, msg: { type: 'success', text: s.editing ? 'Canal actualizado.' : 'Canal creado.' }, showForm: false, editing: null });
      loadSocial(tipo);
    } catch (err) {
      setSocial(tipo, { saving: false, msg: { type: 'error', text: err.response?.data?.message || 'Error al guardar.' } });
    }
  };

  // ── Logo handlers ──
  const handleLogoFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setLogoFile(f); setLogoUrl(''); setLogoMsg(null);
    const r = new FileReader(); r.onloadend = () => setLogoPreview(r.result); r.readAsDataURL(f);
  };
  const handleSaveLogo = async () => {
    if (!logoFile && !logoUrl.trim()) return;
    setLogoSaving(true); setLogoMsg(null);
    try {
      let url = logoUrl.trim();
      if (logoFile) { setLogoMsg({ type: 'info', text: 'Subiendo...' }); url = await uploadToImgbb(logoFile); setLogoUrl(url); setLogoPreview(url); setLogoFile(null); }
      if (empresaId) localStorage.setItem(`empresa_logo_${empresaId}`, url);
      try { await inboxAPI.updateCompanyLogo(empresaId, url); } catch {}
      updateUser({ empresa: { ...(user?.empresa || {}), logo: url } });
      setLogoMsg({ type: 'success', text: 'Logo guardado.' });
    } catch (err) { setLogoMsg({ type: 'error', text: err.message }); }
    finally { setLogoSaving(false); }
  };

  // ── Componentes de canal ──────────────────────────────────────────────────────
  const ChannelCard = ({ nombre, tipo, estado = 'activo', meta, logo, onEdit, onDisconnect, onConnect, confirmId, setConfirm }) => {
    const st = CHANNEL_STYLES[tipo] || CHANNEL_STYLES.whatsapp;
    const isActive = estado === 'activo';
    const isError  = estado === 'error';
    return (
      <div className={`bg-white dark:bg-surface-dark rounded-2xl border ${isError ? 'border-red-200 dark:border-red-800' : 'border-border-light dark:border-border-dark'} p-5 flex flex-col gap-4 relative overflow-hidden`}>
        {/* Status badge top-right */}
        <div className="flex items-start justify-between">
          <div className={`size-12 rounded-2xl flex items-center justify-center text-white ${st.bg} shadow-lg`}>
            {logo}
          </div>
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${isActive ? STATUS_BADGE.activo : isError ? STATUS_BADGE.error : STATUS_BADGE.desconectado}`}>
            <span className={`size-1.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : isError ? 'bg-red-500' : 'bg-gray-400'}`} />
            {isActive ? 'Activo' : isError ? 'Error' : 'Desconectado'}
          </span>
        </div>

        <div>
          <p className="font-black text-text-main-light dark:text-white text-sm">{nombre}</p>
          {meta && <p className="text-[11px] text-text-sub-light mt-1">{meta}</p>}
        </div>

        <div className="flex gap-2 mt-auto">
          {isActive || isError ? (
            <>
              {onEdit && (
                <button onClick={onEdit} className="flex-1 py-2 rounded-xl border border-border-light dark:border-border-dark text-xs font-bold text-text-main-light dark:text-white hover:bg-background-light dark:hover:bg-background-dark transition-all">
                  {isError ? 'Configurar' : 'Editar'}
                </button>
              )}
              {isError ? (
                <button onClick={onEdit} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all">Reintentar</button>
              ) : confirmId ? (
                <div className="flex gap-1 flex-1">
                  <button onClick={onDisconnect} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold">Sí</button>
                  <button onClick={() => setConfirm(null)} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-text-sub-light">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirm(true)} className="flex-1 py-2 rounded-xl border border-red-200 dark:border-red-900 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                  Desconectar
                </button>
              )}
            </>
          ) : (
            <button onClick={onConnect} className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all">
              Conectar ahora
            </button>
          )}
        </div>
      </div>
    );
  };

  const CanalForm = ({ tipo, label, color, fields, onSubmit, saving, msg, form, setForm, onClose }) => (
    <form onSubmit={onSubmit} className={`bg-white dark:bg-surface-dark p-6 rounded-2xl border-2 ${color} space-y-5`}>
      <div className="flex items-center justify-between">
        <h4 className="font-black text-text-main-light dark:text-white">{label}</h4>
        <button type="button" onClick={onClose} className="size-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-text-sub-light hover:text-red-500 transition-colors">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(f => (
          <div key={f.key} className={f.full ? 'md:col-span-2' : ''}>
            <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest block mb-1.5">{f.label}</label>
            <input required={f.required !== false} type={f.type || 'text'} value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} className={inputCls} />
            {f.hint && <p className="text-[10px] text-text-sub-light mt-1">{f.hint}</p>}
          </div>
        ))}
      </div>
      {msg && <p className={`text-xs font-bold ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all">
          {saving ? 'Guardando...' : 'Guardar canal'}
        </button>
        <button type="button" onClick={onClose} className="px-6 py-2.5 border border-border-light dark:border-border-dark rounded-xl text-xs font-bold text-text-sub-light hover:bg-background-light dark:hover:bg-background-dark transition-all">
          Cancelar
        </button>
      </div>
    </form>
  );

  // ── Render tabs ───────────────────────────────────────────────────────────────
  const renderCanales = () => {
    const igSocial = ig;
    const fbSocial = fb;

    const PROXIMOS = [
      { key: 'telegram',  label: 'Telegram',       sub: 'Bot API',        color: 'bg-sky-500',    logo: <TelegramLogo /> },
      { key: 'email',     label: 'Email / Gmail',   sub: 'SMTP / OAuth',   color: 'bg-red-500',    logo: <span className="material-symbols-outlined text-[20px]">mail</span> },
      { key: 'sms',       label: 'SMS Gateway',     sub: 'Twilio / Vonage',color: 'bg-orange-500', logo: <span className="material-symbols-outlined text-[20px]">sms</span> },
      { key: 'webchat',   label: 'Webchat',         sub: 'Widget web',     color: 'bg-indigo-500', logo: <span className="material-symbols-outlined text-[20px]">chat_bubble</span> },
      { key: 'tiktok',    label: 'TikTok Shop',     sub: 'Mensajes',       color: 'bg-[#010101]',  logo: <span className="material-symbols-outlined text-[20px]">smart_display</span> },
      { key: 'linkedin',  label: 'LinkedIn',        sub: 'Sales Nav',      color: 'bg-blue-700',   logo: <span className="material-symbols-outlined text-[20px]">work</span> },
    ];

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-text-main-light dark:text-white">Canales Conectados</h2>
            <p className="text-sm text-text-sub-light mt-1 max-w-lg">
              Visualiza y administra todos tus canales de comunicación desde un solo lugar. Conecta nuevas plataformas para expandir tu alcance omnicanal.
            </p>
          </div>
          <button
            onClick={() => { setWaShowForm(true); setWaEditing(null); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow shadow-blue-600/20 shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_link</span>
            Conectar Nuevo
          </button>
        </div>

        {/* Estado global */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-text-sub-light uppercase tracking-widest">Estado global</span>
          <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            Operativo
          </span>
        </div>

        {/* Canales activos */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-blue-600 text-[18px] material-symbols-outlined">hub</span>
            <h3 className="text-sm font-black text-text-main-light dark:text-white uppercase tracking-wider">Tus Canales Activos</h3>
          </div>

          {waLoading ? (
            <div className="flex items-center gap-2 p-4 text-text-sub-light">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500" />
              <span className="text-sm">Cargando canales...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* WhatsApp channels */}
              {waCanales.length > 0 ? waCanales.map(c => (
                <ChannelCard key={c.id}
                  nombre={c.nombre} tipo="whatsapp"
                  estado={c.activo ? 'activo' : 'inactivo'}
                  meta={c.phone_number_id ? `ID: ${c.phone_number_id.slice(0, 8)}...` : ''}
                  logo={<WhatsAppLogo />}
                  onEdit={() => waOpenEdit(c)}
                  onDisconnect={() => waDelete(c.id)}
                  confirmId={waConfirm === c.id}
                  setConfirm={(v) => setWaConfirm(v ? c.id : null)}
                />
              )) : (
                <div
                  onClick={() => { setWaShowForm(true); setWaEditing(null); }}
                  className="bg-white dark:bg-surface-dark rounded-2xl border-2 border-dashed border-green-200 dark:border-green-900 p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all min-h-[160px]"
                >
                  <div className="size-12 rounded-2xl bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                    <WhatsAppLogo />
                  </div>
                  <p className="text-xs font-black text-green-600 text-center">Conectar WhatsApp Business</p>
                </div>
              )}

              {/* Instagram channels */}
              {igSocial.canales.length > 0 ? igSocial.canales.map(c => (
                <ChannelCard key={c.id}
                  nombre={c.nombre} tipo="instagram"
                  estado={c.activo ? 'activo' : 'inactivo'}
                  meta={c.page_id ? `@${c.page_id.slice(0, 12)}` : ''}
                  logo={<InstagramLogo />}
                  onEdit={() => { socOpenEdit('instagram', c); }}
                  onDisconnect={() => socDelete('instagram', c.id)}
                  confirmId={igSocial.confirm === c.id}
                  setConfirm={(v) => setSocial('instagram', { confirm: v ? c.id : null })}
                />
              )) : (
                <div
                  onClick={() => socOpenNew('instagram')}
                  className="bg-white dark:bg-surface-dark rounded-2xl border-2 border-dashed border-pink-200 dark:border-pink-900 p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-all min-h-[160px]"
                >
                  <div className="size-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
                    <InstagramLogo />
                  </div>
                  <p className="text-xs font-black text-pink-600 text-center">Conectar Instagram Direct</p>
                </div>
              )}

              {/* Facebook channels */}
              {fbSocial.canales.length > 0 ? fbSocial.canales.map(c => (
                <ChannelCard key={c.id}
                  nombre={c.nombre} tipo="facebook"
                  estado={c.activo ? 'activo' : 'inactivo'}
                  meta={c.page_id ? `Page: ${c.page_id.slice(0, 10)}...` : ''}
                  logo={<FacebookLogo />}
                  onEdit={() => socOpenEdit('facebook', c)}
                  onDisconnect={() => socDelete('facebook', c.id)}
                  confirmId={fbSocial.confirm === c.id}
                  setConfirm={(v) => setSocial('facebook', { confirm: v ? c.id : null })}
                />
              )) : (
                <div
                  onClick={() => socOpenNew('facebook')}
                  className="bg-white dark:bg-surface-dark rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-900 p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all min-h-[160px]"
                >
                  <div className="size-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                    <FacebookLogo />
                  </div>
                  <p className="text-xs font-black text-blue-600 text-center">Conectar Facebook Messenger</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Formulario WhatsApp */}
        {waShowForm && (
          <CanalForm
            tipo="whatsapp" label={waEditing ? 'Editar canal WhatsApp' : 'Nuevo canal WhatsApp'}
            color="border-green-200 dark:border-green-900"
            form={waForm} setForm={setWaForm}
            onSubmit={waSave} saving={waSaving} msg={waMsg}
            onClose={() => { setWaShowForm(false); setWaEditing(null); setWaMsg(null); }}
            fields={[
              { key: 'nombre',               label: 'Nombre del canal',         placeholder: 'Canal Principal',      required: true },
              { key: 'phone_number_id',       label: 'Phone Number ID',          placeholder: '123456789012345',      required: true },
              { key: 'business_account_id',   label: 'WABA ID',                  placeholder: '987654321098765',      required: true },
              { key: 'access_token',          label: 'Access Token (Meta)',       placeholder: 'EAAxxxxxxxx...',       required: true, type: 'password', full: true, hint: 'Token permanente de Meta Business Suite.' },
            ]}
          />
        )}

        {/* Formulario Instagram */}
        {igSocial.showForm && (
          <CanalForm
            tipo="instagram" label={igSocial.editing ? 'Editar canal Instagram' : 'Nuevo canal Instagram Direct'}
            color="border-pink-200 dark:border-pink-900"
            form={igSocial.form} setForm={f => setSocial('instagram', { form: typeof f === 'function' ? f(igSocial.form) : f })}
            onSubmit={e => socSave(e, 'instagram')} saving={igSocial.saving} msg={igSocial.msg}
            onClose={() => setSocial('instagram', { showForm: false, editing: null, msg: null })}
            fields={[
              { key: 'nombre',       label: 'Nombre del canal',   placeholder: 'Instagram Principal',  required: true },
              { key: 'page_id',      label: 'Instagram Account ID / Page ID', placeholder: '123456789012345', required: true },
              { key: 'access_token', label: 'Page Access Token',  placeholder: 'EAAxxxxxxxx...',        required: true, type: 'password', full: true, hint: 'Token de larga duración desde Meta Business Suite.' },
            ]}
          />
        )}

        {/* Formulario Facebook */}
        {fbSocial.showForm && (
          <CanalForm
            tipo="facebook" label={fbSocial.editing ? 'Editar canal Facebook' : 'Nuevo canal Facebook Messenger'}
            color="border-blue-200 dark:border-blue-900"
            form={fbSocial.form} setForm={f => setSocial('facebook', { form: typeof f === 'function' ? f(fbSocial.form) : f })}
            onSubmit={e => socSave(e, 'facebook')} saving={fbSocial.saving} msg={fbSocial.msg}
            onClose={() => setSocial('facebook', { showForm: false, editing: null, msg: null })}
            fields={[
              { key: 'nombre',       label: 'Nombre del canal',   placeholder: 'Página principal',     required: true },
              { key: 'page_id',      label: 'Facebook Page ID',   placeholder: '123456789012345',       required: true },
              { key: 'access_token', label: 'Page Access Token',  placeholder: 'EAAxxxxxxxx...',        required: true, type: 'password', full: true, hint: 'Token de larga duración desde Meta Business Suite.' },
            ]}
          />
        )}

        {/* Próximos canales */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-text-main-light dark:text-white uppercase tracking-wider">Canales</h3>
            <button className="text-xs font-bold text-blue-600 hover:underline">Ver catálogo completo</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {PROXIMOS.map(ch => (
              <div key={ch.key} className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-4 flex flex-col items-center gap-3 group hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-default">
                <div className={`size-10 rounded-xl flex items-center justify-center text-white ${ch.color} shadow`}>
                  {ch.logo}
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-text-main-light dark:text-white">{ch.label}</p>
                  <p className="text-[10px] text-text-sub-light">{ch.sub}</p>
                </div>
                <div className="size-6 rounded-full border-2 border-border-light dark:border-border-dark flex items-center justify-center text-text-sub-light group-hover:border-blue-400 group-hover:text-blue-500 transition-all">
                  <span className="material-symbols-outlined text-[14px]">add</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderGeneral = () => (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black text-text-main-light dark:text-white">General</h2>
        <p className="text-sm text-text-sub-light mt-1">Gestiona tu perfil y la identidad visual de tu empresa.</p>
      </div>

      {/* Perfil */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6 space-y-5">
        <h3 className="text-sm font-black text-text-main-light dark:text-white">Mi Perfil</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest block mb-1.5">Nombre</label>
            <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest block mb-1.5">Email</label>
            <input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <button className="px-6 py-2.5 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-all">
          Guardar cambios
        </button>
      </div>

      {/* Logo empresa */}
      {isClient && (
        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6 space-y-5">
          <h3 className="text-sm font-black text-text-main-light dark:text-white">Logo de la Empresa</h3>
          <div className="flex items-center gap-6">
            <div
              onClick={() => logoFileRef.current?.click()}
              className="size-20 rounded-2xl border-2 border-dashed border-border-light dark:border-border-dark overflow-hidden bg-background-light dark:bg-background-dark flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all group relative flex-shrink-0"
            >
              {logoPreview
                ? <img src={logoPreview} className="w-full h-full object-contain p-1" onError={() => setLogoPreview('')} />
                : <span className="material-symbols-outlined text-3xl text-text-sub-light">business</span>
              }
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[20px]">upload</span>
              </div>
            </div>
            <input type="file" ref={logoFileRef} hidden accept="image/*" onChange={handleLogoFile} />
            <div className="flex-1 space-y-3">
              {!logoFile && (
                <input type="url" value={logoUrl} onChange={e => { setLogoUrl(e.target.value); setLogoPreview(e.target.value); setLogoFile(null); }} placeholder="https://tudominio.com/logo.png" className={inputCls} />
              )}
              {logoFile && (
                <div className="flex items-center gap-2 h-12 px-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                  <span className="material-symbols-outlined text-blue-500 text-[16px]">image</span>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 truncate">{logoFile.name}</span>
                  <button onClick={() => { setLogoFile(null); setLogoPreview(savedLogoUrl); }} className="ml-auto text-blue-400 hover:text-blue-600">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}
              {logoMsg && <p className={`text-xs font-bold ${logoMsg.type === 'success' ? 'text-green-600' : logoMsg.type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>{logoMsg.text}</p>}
              <button onClick={handleSaveLogo} disabled={logoSaving || (!logoFile && !logoUrl.trim())} className="px-6 py-2.5 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all">
                {logoSaving ? 'Guardando...' : 'Guardar logo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderEquipo   = () => <ClientTeamManagement />;
  const renderPermisos = () => <ClientPermissions />;
  const renderFactura  = () => <ClientBilling />;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);

    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    if (pwForm.next.length < 8) {
      setPwMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    setPwSaving(true);
    try {
      await authAPI.changePassword(pwForm.current, pwForm.next);
      setPwMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      const status = err?.response?.status;
      const msg    = err?.response?.data?.message || err?.response?.data?.error || '';
      setPwMsg({
        type: 'error',
        text: status === 401 ? 'La contraseña actual es incorrecta.'
            : status === 400 ? (msg || 'Datos inválidos. Revisa los campos.')
            : msg || 'Error al cambiar la contraseña. Intenta de nuevo.',
      });
    } finally {
      setPwSaving(false);
    }
  };

  const renderSeguridad = () => (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black text-text-main-light dark:text-white">Seguridad</h2>
        <p className="text-sm text-text-sub-light mt-1">Controla el acceso y protege tu cuenta.</p>
      </div>

      {/* Cambiar contraseña */}
      <form onSubmit={handleChangePassword} className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-blue-600/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-600 text-[18px]">lock_reset</span>
          </div>
          <h3 className="text-sm font-black text-text-main-light dark:text-white">Cambiar contraseña</h3>
        </div>

        <div className="space-y-4">
          {[
            { key: 'current', label: 'Contraseña actual' },
            { key: 'next',    label: 'Nueva contraseña',            hint: 'Mínimo 8 caracteres.' },
            { key: 'confirm', label: 'Confirmar nueva contraseña' },
          ].map(({ key, label, hint }) => (
            <div key={key}>
              <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest block mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={pwShow[key] ? 'text' : 'password'}
                  value={pwForm[key]}
                  onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="••••••••"
                  required
                  className={inputCls + ' pr-12'}
                />
                <button
                  type="button"
                  onClick={() => setPwShow(s => ({ ...s, [key]: !s[key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub-light hover:text-text-main-light dark:hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {pwShow[key] ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {hint && <p className="text-[10px] text-text-sub-light mt-1">{hint}</p>}
            </div>
          ))}
        </div>

        {pwMsg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold ${
            pwMsg.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            <span className="material-symbols-outlined text-[16px]">
              {pwMsg.type === 'success' ? 'check_circle' : 'error'}
            </span>
            {pwMsg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {pwSaving
            ? <><span className="material-symbols-outlined text-[16px] animate-spin">refresh</span> Actualizando...</>
            : <><span className="material-symbols-outlined text-[16px]">lock_reset</span> Actualizar contraseña</>
          }
        </button>
      </form>

      {/* 2FA */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-yellow-600 text-[20px]">security</span>
          </div>
          <div>
            <p className="text-sm font-black text-text-main-light dark:text-white">Autenticación en dos pasos</p>
            <p className="text-xs text-text-sub-light">Añade una capa extra de seguridad a tu cuenta.</p>
          </div>
        </div>
        <span className="text-[10px] font-black px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-text-sub-light uppercase">Próximamente</span>
      </div>
    </div>
  );

  const RENDERS = { general: renderGeneral, canales: renderCanales, equipo: renderEquipo, permisos: renderPermisos, factura: renderFactura, seguridad: renderSeguridad };

  return (
    <div className="flex h-full bg-background-light dark:bg-background-dark">

      {/* ── Submenú lateral ── */}
      <aside className="w-56 shrink-0 border-r border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex flex-col py-6 px-3 gap-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left w-full ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow shadow-blue-600/20'
                : 'text-text-sub-light hover:text-text-main-light dark:hover:text-white hover:bg-background-light dark:hover:bg-background-dark'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </aside>

      {/* ── Contenido ── */}
      <main className={`flex-1 overflow-y-auto ${['equipo','permisos','factura'].includes(activeTab) ? '' : 'p-8'}`}>
        {(RENDERS[activeTab] || renderGeneral)()}
      </main>
    </div>
  );
};

export default Settings;
