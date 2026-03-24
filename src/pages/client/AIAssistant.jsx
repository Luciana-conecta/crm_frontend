import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { aiAPI } from '../../services/api';

// ── Constantes ────────────────────────────────────────────────────────────────
const TONOS = [
  { value: 'profesional', label: 'Profesional', desc: 'Formal y directo, transmite confianza' },
  { value: 'amigable',    label: 'Amigable',    desc: 'Cálido y cercano, pero serio' },
  { value: 'formal',      label: 'Formal',      desc: 'Corporativo y riguroso' },
  { value: 'casual',      label: 'Casual',      desc: 'Relajado y conversacional' },
];

const INDUSTRIAS = [
  'Tecnología', 'Retail / Comercio', 'Salud', 'Educación', 'Inmobiliaria',
  'Gastronomía', 'Finanzas', 'Logística', 'Marketing', 'Consultoría', 'Otro',
];

const INTENT_LABELS = {
  consulta_precio:    { label: 'Consulta de precio',  color: 'bg-yellow-100 text-yellow-700' },
  pedido_demo:        { label: 'Solicitud de demo',   color: 'bg-blue-100 text-blue-700' },
  queja:              { label: 'Queja / Reclamo',     color: 'bg-red-100 text-red-700' },
  interes_general:    { label: 'Interés general',     color: 'bg-gray-100 text-gray-700' },
  intencion_compra:   { label: 'Intención de compra', color: 'bg-green-100 text-green-700' },
};

const DEFAULT_CONFIG = {
  activo: false,
  tono: 'profesional',
  descripcion_negocio: '',
  industria: '',
  productos: [],
  faqs: [],
  reglas_escalamiento: [
    { condicion: 'intencion_compra', descripcion: 'Cuando el cliente muestra intención clara de compra' },
    { condicion: 'queja',            descripcion: 'Cuando el cliente expresa una queja seria' },
  ],
  instrucciones_adicionales: '',
};

const STORAGE_KEY = 'crm_ai_config_';

// ── Helpers ───────────────────────────────────────────────────────────────────
const Section = ({ icon, title, subtitle, children }) => (
  <div className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6 space-y-5">
    <div className="flex items-start gap-3">
      <div className="size-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div>
        <h3 className="text-sm font-black text-text-main-light dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-text-sub-light mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const Field = ({ label, children, hint }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-text-sub-light uppercase tracking-wider">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-text-sub-light">{hint}</p>}
  </div>
);

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm text-text-main-light dark:text-white placeholder-text-sub-light focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all";

// ── Componente principal ───────────────────────────────────────────────────────
const AIAssistant = () => {
  const { user, impersonatedEmpresa } = useAuth();
  const empresaId = impersonatedEmpresa?.empresa_id || impersonatedEmpresa?.id || user?.empresa_id;

  const [config, setConfig]     = useState(DEFAULT_CONFIG);
  const [draft, setDraft]       = useState(DEFAULT_CONFIG); // copia editable
  const [isEditing, setIsEditing] = useState(false);
  const [hasData, setHasData]   = useState(false); // si ya hay datos guardados
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [activeTab, setActiveTab] = useState('negocio');

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Cargar config ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }

    const loadConfig = async () => {
      try {
        // Backend devuelve { success, data: { config, productos, faqs, reglas } }
        const res = await aiAPI.getConfig(empresaId);
        const { config: cfg, productos, faqs, reglas } = res.data || res;
        const loaded = {
          ...DEFAULT_CONFIG,
          ...(cfg || {}),
          productos: productos || [],
          faqs:      faqs      || [],
          reglas_escalamiento: reglas || [],
        };
        setConfig(loaded);
        setDraft(loaded);
        // Si hay descripción o productos, hay datos reales → modo vista
        const tieneData = !!(cfg?.descripcion_negocio || (productos?.length > 0) || (faqs?.length > 0));
        setHasData(tieneData);
        setIsEditing(!tieneData);
        localStorage.setItem(STORAGE_KEY + empresaId, JSON.stringify(loaded));
      } catch {
        const cached = localStorage.getItem(STORAGE_KEY + empresaId);
        if (cached) {
          try {
            const parsed = { ...DEFAULT_CONFIG, ...JSON.parse(cached) };
            setConfig(parsed);
            setDraft(parsed);
            const tieneData = !!(parsed.descripcion_negocio || parsed.productos?.length);
            setHasData(tieneData);
            setIsEditing(!tieneData);
          } catch {}
        } else {
          setIsEditing(true); // sin datos → modo edición directo
        }
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [empresaId]);

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!empresaId) return;
    setSaving(true);

    // Armar payload que espera el backend
    const payload = {
      config: {
        activo:                    draft.activo,
        tono:                      draft.tono,
        industria:                 draft.industria,
        descripcion_negocio:       draft.descripcion_negocio,
        instrucciones_adicionales: draft.instrucciones_adicionales,
      },
      productos: draft.productos,
      faqs:      draft.faqs,
      reglas:    draft.reglas_escalamiento,
    };

    // Guardar en localStorage como caché
    localStorage.setItem(STORAGE_KEY + empresaId, JSON.stringify(draft));
    try {
      await aiAPI.saveConfig(empresaId, payload);
      setConfig(draft);
      setHasData(true);
      setIsEditing(false);
      showToast('Configuración guardada correctamente');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || '';
      showToast(msg || 'Error al guardar. Intenta de nuevo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit   = () => { setDraft({ ...config }); setIsEditing(true); };
  const handleCancel = () => { setDraft({ ...config }); setIsEditing(false); };

  // ── Helpers de estado (operan sobre draft) ───────────────────────────────────
  const set = (key, value) => setDraft(prev => ({ ...prev, [key]: value }));

  const addProducto = () =>
    set('productos', [...draft.productos, { nombre: '', descripcion: '', precio: '' }]);
  const removeProducto = (i) =>
    set('productos', draft.productos.filter((_, idx) => idx !== i));
  const updateProducto = (i, field, val) =>
    set('productos', draft.productos.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  const addFaq = () =>
    set('faqs', [...draft.faqs, { pregunta: '', respuesta: '' }]);
  const removeFaq = (i) =>
    set('faqs', draft.faqs.filter((_, idx) => idx !== i));
  const updateFaq = (i, field, val) =>
    set('faqs', draft.faqs.map((f, idx) => idx === i ? { ...f, [field]: val } : f));

  const addRegla = () =>
    set('reglas_escalamiento', [...draft.reglas_escalamiento, { condicion: 'intencion_compra', descripcion: '' }]);
  const removeRegla = (i) =>
    set('reglas_escalamiento', draft.reglas_escalamiento.filter((_, idx) => idx !== i));
  const updateRegla = (i, field, val) =>
    set('reglas_escalamiento', draft.reglas_escalamiento.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  // ── Tabs ──────────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'negocio',    label: 'Negocio',       icon: 'store' },
    { id: 'productos',  label: 'Productos',     icon: 'inventory_2' },
    { id: 'faqs',       label: 'FAQ',           icon: 'quiz' },
    { id: 'escalamiento', label: 'Escalamiento', icon: 'support_agent' },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background-light dark:bg-background-dark">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2 transition-all ${
          toast.type === 'warning'
            ? 'bg-yellow-500 text-white'
            : toast.type === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-green-500 text-white'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'warning' ? 'warning' : toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shrink-0">
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <span className="material-symbols-outlined text-white text-[22px]">smart_toy</span>
          </div>
          <div>
            <h1 className="text-lg font-black text-text-main-light dark:text-white">Asistente de IA</h1>
            <p className="text-xs text-text-sub-light">Configura el asistente para WhatsApp y Email</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle activo — siempre visible, opera sobre config guardado */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              config.activo ? 'text-green-600' : 'text-text-sub-light'
            }`}>
              {config.activo ? 'Activo' : 'Inactivo'}
            </span>
            <button
              type="button"
              onClick={async () => {
                const nuevoActivo = !config.activo;
                const nuevoConfig = { ...config, activo: nuevoActivo };
                setConfig(nuevoConfig);
                setDraft(nuevoConfig);
                // Guardar solo el cambio de activo inmediatamente
                try {
                  await aiAPI.saveConfig(empresaId, {
                    config: { activo: nuevoActivo, tono: config.tono, industria: config.industria, descripcion_negocio: config.descripcion_negocio, instrucciones_adicionales: config.instrucciones_adicionales },
                    productos: config.productos, faqs: config.faqs, reglas: config.reglas_escalamiento,
                  });
                  showToast(nuevoActivo ? 'Asistente activado' : 'Asistente desactivado');
                } catch {
                  showToast('No se pudo actualizar el estado', 'error');
                  setConfig(config); setDraft(config); // revertir
                }
              }}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                config.activo
                  ? 'bg-green-500 focus:ring-green-400'
                  : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400'
              }`}
            >
              <span className={`absolute top-1 left-1 size-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
                config.activo ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-all shadow shadow-blue-600/20"
              >
                {saving
                  ? <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                  : <span className="material-symbols-outlined text-[18px]">save</span>
                }
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              {hasData && (
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2.5 border border-border-light dark:border-border-dark text-sm font-bold text-text-sub-light rounded-xl hover:bg-background-light dark:hover:bg-background-dark transition-all"
                >
                  Cancelar
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-5 py-2.5 border border-border-light dark:border-border-dark text-sm font-bold text-text-main-light dark:text-white rounded-xl hover:bg-background-light dark:hover:bg-background-dark transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Editar
            </button>
          )}
        </div>
      </div>

      {/* ── Status banner ── */}
      {!!config.activo && (
        <div className="mx-8 mt-4 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl flex items-center gap-3">
          <span className="size-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
          <p className="text-xs font-semibold text-green-700 dark:text-green-400">
            El asistente está activo — responderá automáticamente en WhatsApp en los primeros 2 minutos.
            Siempre puede transferir al vendedor humano.
          </p>
        </div>
      )}

      {/* ── Tabs — solo en modo edición ── */}
      {isEditing && (
        <div className="px-8 pt-4 flex gap-1 border-b border-border-light dark:border-border-dark shrink-0 bg-surface-light dark:bg-surface-dark">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-colors ${
                activeTab === tab.id
                  ? 'bg-background-light dark:bg-background-dark text-blue-600 border-b-2 border-blue-600 -mb-px'
                  : 'text-text-sub-light hover:text-text-main-light dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

        {/* ─── MODO VISTA: resumen de la configuración guardada ─── */}
        {!isEditing && (
          <div className="space-y-4">
            {/* Negocio */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">store</span>
                  </div>
                  <h3 className="text-sm font-black text-text-main-light dark:text-white">Información del negocio</h3>
                </div>
                {config.tono && (
                  <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-600/10 text-blue-600">
                    Tono: {config.tono}
                  </span>
                )}
              </div>
              {config.industria && (
                <p className="text-xs text-text-sub-light font-semibold uppercase tracking-wider">{config.industria}</p>
              )}
              {config.descripcion_negocio
                ? <p className="text-sm text-text-main-light dark:text-gray-300 leading-relaxed">{config.descripcion_negocio}</p>
                : <p className="text-sm text-text-sub-light italic">Sin descripción del negocio.</p>
              }
              {config.instrucciones_adicionales && (
                <div className="bg-background-light dark:bg-background-dark rounded-xl p-3 border border-border-light dark:border-border-dark">
                  <p className="text-[10px] font-black text-text-sub-light uppercase tracking-wider mb-1">Instrucciones adicionales</p>
                  <p className="text-xs text-text-main-light dark:text-gray-300">{config.instrucciones_adicionales}</p>
                </div>
              )}
            </div>

            {/* Productos */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                </div>
                <h3 className="text-sm font-black text-text-main-light dark:text-white">Productos y servicios</h3>
                <span className="ml-auto text-xs font-bold text-text-sub-light">{config.productos.length} ítem{config.productos.length !== 1 ? 's' : ''}</span>
              </div>
              {draft.productos.length === 0
                ? <p className="text-sm text-text-sub-light italic">Sin productos cargados.</p>
                : <div className="space-y-2">
                    {draft.productos.map((p, i) => (
                      <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-border-light dark:border-border-dark last:border-0">
                        <div>
                          <p className="text-sm font-bold text-text-main-light dark:text-white">{p.nombre}</p>
                          {p.descripcion && <p className="text-xs text-text-sub-light mt-0.5">{p.descripcion}</p>}
                        </div>
                        {p.precio && <span className="text-sm font-black text-blue-600 whitespace-nowrap">{p.precio}</span>}
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* FAQs */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">quiz</span>
                </div>
                <h3 className="text-sm font-black text-text-main-light dark:text-white">Preguntas frecuentes</h3>
                <span className="ml-auto text-xs font-bold text-text-sub-light">{config.faqs.length} pregunta{config.faqs.length !== 1 ? 's' : ''}</span>
              </div>
              {draft.faqs.length === 0
                ? <p className="text-sm text-text-sub-light italic">Sin preguntas frecuentes cargadas.</p>
                : <div className="space-y-3">
                    {draft.faqs.map((f, i) => (
                      <div key={i} className="bg-background-light dark:bg-background-dark rounded-xl p-3 border border-border-light dark:border-border-dark">
                        <p className="text-xs font-black text-text-main-light dark:text-white mb-1">{f.pregunta}</p>
                        <p className="text-xs text-text-sub-light">{f.respuesta}</p>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Reglas de escalamiento */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">support_agent</span>
                </div>
                <h3 className="text-sm font-black text-text-main-light dark:text-white">Reglas de escalamiento</h3>
                <span className="ml-auto text-xs font-bold text-text-sub-light">{config.reglas_escalamiento.length} regla{config.reglas_escalamiento.length !== 1 ? 's' : ''}</span>
              </div>
              {draft.reglas_escalamiento.length === 0
                ? <p className="text-sm text-text-sub-light italic">Sin reglas de escalamiento.</p>
                : <div className="space-y-2">
                    {draft.reglas_escalamiento.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-border-light dark:border-border-dark last:border-0">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap ${INTENT_LABELS[r.condicion]?.color || 'bg-gray-100 text-gray-700'}`}>
                          {INTENT_LABELS[r.condicion]?.label || r.condicion}
                        </span>
                        {r.descripcion && <p className="text-xs text-text-sub-light">{r.descripcion}</p>}
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {/* ─── MODO EDICIÓN: formularios en tabs ─── */}
        {isEditing && activeTab === 'negocio' && (
          <>
            <Section icon="store" title="Información del negocio"
              subtitle="Esta información le da contexto al asistente sobre quién eres y qué ofreces.">

              <Field label="Descripción del negocio"
                hint="Escribe en 2-4 oraciones qué hace tu empresa, a quién ayuda y cuál es tu propuesta de valor.">
                <textarea
                  value={draft.descripcion_negocio}
                  onChange={e => set('descripcion_negocio', e.target.value)}
                  rows={4}
                  placeholder="Ej: Somos una agencia de marketing digital que ayuda a PYMEs a crecer en redes sociales y Google Ads. Nos especializamos en campañas de conversión con foco en ROI..."
                  className={inputCls + ' resize-none'}
                />
              </Field>

              <Field label="Industria / Sector">
                <select
                  value={draft.industria}
                  onChange={e => set('industria', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seleccionar industria...</option>
                  {INDUSTRIAS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>

              <Field label="Instrucciones adicionales"
                hint="Puedes agregar restricciones, frases que debe evitar, idioma preferido, etc.">
                <textarea
                  value={draft.instrucciones_adicionales}
                  onChange={e => set('instrucciones_adicionales', e.target.value)}
                  rows={3}
                  placeholder="Ej: Nunca menciones a la competencia. Responde siempre en español. No prometas descuentos sin autorización..."
                  className={inputCls + ' resize-none'}
                />
              </Field>
            </Section>

            <Section icon="tune" title="Tono y personalidad"
              subtitle="Define cómo se comunicará el asistente con tus prospectos.">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TONOS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => set('tono', t.value)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      draft.tono === t.value
                        ? 'border-blue-600 bg-blue-600/5 dark:bg-blue-600/10'
                        : 'border-border-light dark:border-border-dark hover:border-blue-600/40'
                    }`}
                  >
                    <p className={`text-sm font-black ${draft.tono === t.value ? 'text-blue-600' : 'text-text-main-light dark:text-white'}`}>
                      {t.label}
                    </p>
                    <p className="text-[11px] text-text-sub-light mt-1">{t.desc}</p>
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* ─── Tab: Productos ─── */}
        {isEditing && activeTab === 'productos' && (
          <Section icon="inventory_2" title="Catálogo de productos y servicios"
            subtitle="El asistente usará esta información para responder consultas de precio, disponibilidad y características.">

            {draft.productos.length === 0 ? (
              <div className="py-8 text-center text-text-sub-light">
                <span className="material-symbols-outlined text-5xl opacity-20 block mb-2">inventory_2</span>
                <p className="text-sm">Agrega al menos un producto o servicio</p>
              </div>
            ) : (
              <div className="space-y-4">
                {draft.productos.map((p, i) => (
                  <div key={i} className="bg-background-light dark:bg-background-dark rounded-2xl border border-border-light dark:border-border-dark p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-text-sub-light uppercase tracking-wider">
                        Producto #{i + 1}
                      </span>
                      <button
                        onClick={() => removeProducto(i)}
                        className="text-text-sub-light hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Nombre">
                        <input
                          value={p.nombre}
                          onChange={e => updateProducto(i, 'nombre', e.target.value)}
                          placeholder="Plan Pro, Servicio de SEO..."
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Precio / Rango">
                        <input
                          value={p.precio}
                          onChange={e => updateProducto(i, 'precio', e.target.value)}
                          placeholder="$500 / mes, Desde $200..."
                          className={inputCls}
                        />
                      </Field>
                    </div>
                    <Field label="Descripción corta">
                      <textarea
                        value={p.descripcion}
                        onChange={e => updateProducto(i, 'descripcion', e.target.value)}
                        rows={2}
                        placeholder="Qué incluye, para quién es, beneficios principales..."
                        className={inputCls + ' resize-none'}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={addProducto}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-border-light dark:border-border-dark rounded-2xl text-sm text-text-sub-light hover:border-blue-600 hover:text-blue-600 transition-all w-full justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Agregar producto / servicio
            </button>
          </Section>
        )}

        {/* ─── Tab: FAQs ─── */}
        {isEditing && activeTab === 'faqs' && (
          <Section icon="quiz" title="Preguntas frecuentes"
            subtitle="El asistente responderá estas preguntas automáticamente con exactamente la respuesta que configures.">

            {draft.faqs.length === 0 ? (
              <div className="py-8 text-center text-text-sub-light">
                <span className="material-symbols-outlined text-5xl opacity-20 block mb-2">quiz</span>
                <p className="text-sm">Agrega las preguntas más comunes de tus clientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {draft.faqs.map((f, i) => (
                  <div key={i} className="bg-background-light dark:bg-background-dark rounded-2xl border border-border-light dark:border-border-dark p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-text-sub-light uppercase tracking-wider">
                        Pregunta #{i + 1}
                      </span>
                      <button
                        onClick={() => removeFaq(i)}
                        className="text-text-sub-light hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                    <Field label="Pregunta">
                      <input
                        value={f.pregunta}
                        onChange={e => updateFaq(i, 'pregunta', e.target.value)}
                        placeholder="¿Cuánto cuesta el servicio?"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Respuesta del asistente">
                      <textarea
                        value={f.respuesta}
                        onChange={e => updateFaq(i, 'respuesta', e.target.value)}
                        rows={3}
                        placeholder="Nuestros planes comienzan desde $X al mes. Tenemos 3 opciones según tus necesidades..."
                        className={inputCls + ' resize-none'}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={addFaq}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-border-light dark:border-border-dark rounded-2xl text-sm text-text-sub-light hover:border-blue-600 hover:text-blue-600 transition-all w-full justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Agregar pregunta frecuente
            </button>
          </Section>
        )}

        {/* ─── Tab: Escalamiento ─── */}
        {isEditing && activeTab === 'escalamiento' && (
          <>
            <Section icon="support_agent" title="Reglas de escalamiento a humano"
              subtitle="Define cuándo el asistente debe transferir la conversación a un vendedor. Siempre hay un botón visible de 'Transferir a humano'.">

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex gap-3">
                <span className="material-symbols-outlined text-blue-600 text-[20px] flex-shrink-0 mt-0.5">info</span>
                <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                  <p className="font-bold">Regla clave de diseño</p>
                  <p>El asistente nunca reemplaza al vendedor — lo asiste. El botón "Transferir a humano" siempre está visible en el chat del prospecto.</p>
                </div>
              </div>

              {draft.reglas_escalamiento.length === 0 ? (
                <div className="py-6 text-center text-text-sub-light">
                  <p className="text-sm">Sin reglas de escalamiento configuradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {draft.reglas_escalamiento.map((r, i) => (
                    <div key={i} className="bg-background-light dark:bg-background-dark rounded-2xl border border-border-light dark:border-border-dark p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <Field label="Cuando detecta">
                            <select
                              value={r.condicion}
                              onChange={e => updateRegla(i, 'condicion', e.target.value)}
                              className={inputCls}
                            >
                              {Object.entries(INTENT_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                          </Field>
                          <div className="col-span-2">
                            <Field label="Descripción / condición adicional">
                              <input
                                value={r.descripcion}
                                onChange={e => updateRegla(i, 'descripcion', e.target.value)}
                                placeholder="Detalles de cuándo aplicar esta regla..."
                                className={inputCls}
                              />
                            </Field>
                          </div>
                        </div>
                        <button
                          onClick={() => removeRegla(i)}
                          className="text-text-sub-light hover:text-red-500 transition-colors mt-6 flex-shrink-0"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={addRegla}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-border-light dark:border-border-dark rounded-2xl text-sm text-text-sub-light hover:border-blue-600 hover:text-blue-600 transition-all w-full justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Agregar regla
              </button>
            </Section>

            {/* Clasificación de intenciones */}
            <Section icon="category" title="Clasificación de intenciones"
              subtitle="El asistente clasifica cada mensaje entrante en una de estas categorías para priorizar y escalar correctamente.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(INTENT_LABELS).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${v.color}`}>
                      {v.label}
                    </span>
                    <span className="text-[11px] text-text-sub-light">Detección automática</span>
                    <span className="material-symbols-outlined text-green-500 text-[16px] ml-auto">check_circle</span>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
};

export default AIAssistant;
