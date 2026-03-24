
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/api';

/* ─────────────────────────────────────────
   Templates (los define Insignia — el cliente
   solo llena las credenciales de cada uno)
───────────────────────────────────────── */
const TEMPLATES = [
  {
    id: 'wa-auto-reply',
    icon: 'chat',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
    title: 'Respuesta Automática WhatsApp',
    subtitle: 'Responde mensajes al instante',
    description: 'Cuando un contacto escribe por WhatsApp, el sistema responde automáticamente con un mensaje personalizado. Ideal para fuera de horario o confirmación de recepción.',
    trigger: 'Mensaje entrante de WhatsApp',
    actions: ['Esperar 5 segundos', 'Enviar mensaje de bienvenida'],
    tags: ['WhatsApp', 'Mensajería'],
    complexity: 'Básico',
    fields: [
      { key: 'message', label: 'Mensaje automático', type: 'textarea', placeholder: '¡Hola! Recibimos tu mensaje, te respondemos pronto. 👋', required: true },
    ],
  },
  {
    id: 'new-contact-notify',
    icon: 'person_add',
    color: 'text-primary',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    title: 'Alerta de Nuevo Contacto',
    subtitle: 'Notifica al equipo al instante',
    description: 'Cuando se agrega un nuevo contacto al CRM, el sistema notifica automáticamente a tu equipo por email para iniciar el seguimiento de inmediato.',
    trigger: 'Nuevo contacto creado en CRM',
    actions: ['Enviar email al responsable', 'Registrar en historial'],
    tags: ['Email', 'Contactos'],
    complexity: 'Básico',
    fields: [
      { key: 'notifyEmail', label: 'Email de notificaciones', type: 'email', placeholder: 'ventas@tuempresa.com', required: true },
      { key: 'slackWebhook', label: 'Slack Webhook (opcional)', type: 'url', placeholder: 'https://hooks.slack.com/...', required: false, hint: 'Dejalo vacío si no usás Slack' },
    ],
  },
  {
    id: 'follow-up-reminder',
    icon: 'schedule',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    title: 'Recordatorio de Seguimiento',
    subtitle: 'No pierdas ningún lead',
    description: 'Si una conversación no recibe respuesta en X horas, el sistema crea una tarea automática y notifica al agente responsable.',
    trigger: 'Conversación sin actividad',
    actions: ['Crear tarea de seguimiento', 'Notificar al agente'],
    tags: ['WhatsApp', 'Tareas'],
    complexity: 'Intermedio',
    fields: [
      { key: 'hoursThreshold', label: 'Horas sin actividad para alertar', type: 'number', placeholder: '24', required: true },
      { key: 'notifyEmail', label: 'Email del agente o supervisor', type: 'email', placeholder: 'agente@tuempresa.com', required: true },
    ],
  },
  {
    id: 'daily-report',
    icon: 'summarize',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    title: 'Reporte Diario Automático',
    subtitle: 'Métricas en tu bandeja cada mañana',
    description: 'Todos los días a la hora que elijas, recibís un resumen por email con tickets resueltos, nuevos contactos y métricas del equipo.',
    trigger: 'Hora programada diaria',
    actions: ['Consultar métricas', 'Generar reporte', 'Enviar por email'],
    tags: ['Email', 'Reportes'],
    complexity: 'Básico',
    fields: [
      { key: 'sendTime', label: 'Hora de envío (HH:MM)', type: 'text', placeholder: '09:00', required: true },
      { key: 'reportEmail', label: 'Email destinatario', type: 'email', placeholder: 'gerencia@tuempresa.com', required: true },
    ],
  },
  {
    id: 'csat-survey',
    icon: 'star_rate',
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    title: 'Encuesta de Satisfacción',
    subtitle: 'Feedback automático post-atención',
    description: 'Cuando una conversación se marca como resuelta, espera unos minutos y envía una encuesta de satisfacción por WhatsApp al cliente.',
    trigger: 'Conversación resuelta',
    actions: ['Esperar X minutos', 'Enviar encuesta por WhatsApp'],
    tags: ['WhatsApp', 'CSAT'],
    complexity: 'Intermedio',
    fields: [
      { key: 'waitMinutes', label: 'Minutos de espera antes de enviar', type: 'number', placeholder: '10', required: true },
      { key: 'surveyMessage', label: 'Mensaje de la encuesta', type: 'textarea', placeholder: '¿Cómo fue tu atención hoy? Respondé del 1 al 5 ⭐', required: true },
    ],
  },
  {
    id: 'sheets-sync',
    icon: 'table_chart',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    title: 'Sync con Google Sheets',
    subtitle: 'Tus contactos siempre actualizados',
    description: 'Cada vez que se crea o actualiza un contacto en el CRM, la información se sincroniza automáticamente con tu hoja de Google Sheets.',
    trigger: 'Contacto creado o modificado',
    actions: ['Formatear datos', 'Actualizar Google Sheets'],
    tags: ['Google Sheets', 'Contactos'],
    complexity: 'Avanzado',
    fields: [
      { key: 'sheetsId', label: 'ID de Google Sheets', type: 'text', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', required: true, hint: 'Lo encontrás en la URL de tu hoja: docs.google.com/spreadsheets/d/{ID}' },
      { key: 'sheetName', label: 'Nombre de la pestaña', type: 'text', placeholder: 'Contactos', required: true },
    ],
  },
  {
    id: 'unread-alert',
    icon: 'notification_important',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    title: 'Alerta Mensaje sin Respuesta',
    subtitle: 'Supervisa los tiempos de respuesta',
    description: 'Si una conversación lleva más de X horas sin que ningún agente responda, alerta al supervisor por email para que intervenga.',
    trigger: 'Mensaje sin respuesta por X horas',
    actions: ['Enviar alerta al supervisor', 'Elevar prioridad'],
    tags: ['Email', 'Supervisión'],
    complexity: 'Intermedio',
    fields: [
      { key: 'hoursThreshold', label: 'Horas sin respuesta para alertar', type: 'number', placeholder: '2', required: true },
      { key: 'supervisorEmail', label: 'Email del supervisor', type: 'email', placeholder: 'supervisor@tuempresa.com', required: true },
    ],
  },
  {
    id: 'auto-assign',
    icon: 'manage_accounts',
    color: 'text-cyan-500',
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    title: 'Asignación Automática de Agente',
    subtitle: 'Distribuye la carga del equipo',
    description: 'Cuando entra una nueva conversación, evalúa qué agente tiene menos carga activa y la asigna automáticamente para balancear el equipo.',
    trigger: 'Nueva conversación entrante',
    actions: ['Evaluar carga de agentes', 'Asignar al de menor carga', 'Notificar al agente'],
    tags: ['WhatsApp', 'Equipo'],
    complexity: 'Avanzado',
    fields: [
      { key: 'notifyEmail', label: 'Email de notificación al agente (opcional)', type: 'email', placeholder: 'equipo@tuempresa.com', required: false },
    ],
  },
];

const COMPLEXITY_CLS = {
  'Básico':     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  'Intermedio': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  'Avanzado':   'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

const INPUT_CLS   = 'w-full h-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 font-semibold text-sm text-text-main-light dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all';
const TEXTAREA_CLS = 'w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 font-semibold text-sm text-text-main-light dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all resize-none';

/* ─────────────────────────────────────────
   Componente
───────────────────────────────────────── */
const ClientAutomation = () => {
  const { user } = useAuth();
  const empresaId = user?.empresa_id || user?.empresa?.id;

  const [filterTag, setFilterTag]             = useState('Todos');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  // 'detail' | 'form' | 'activating' | 'success' | 'error'
  const [step, setStep]                       = useState('detail');
  const [credForm, setCredForm]               = useState({});
  const [activationError, setActivationError] = useState('');
  const [activeWorkflows, setActiveWorkflows] = useState([]);
  const [loadingWf, setLoadingWf]             = useState(false);

  useEffect(() => {
    if (empresaId) loadActiveWorkflows();
  }, [empresaId]);

  /* Obtener automatizaciones activas de esta empresa */
  const loadActiveWorkflows = async () => {
    setLoadingWf(true);
    try {
      const res = await apiClient.get(`/empresa/${empresaId}/workflows`);
      setActiveWorkflows(res.data?.data || res.data || []);
    } catch {
      setActiveWorkflows([]);
    } finally {
      setLoadingWf(false);
    }
  };

  const handleOpenTemplate = (t) => {
    setSelectedTemplate(t);
    setStep('detail');
    setCredForm({});
    setActivationError('');
  };

  /* Activar template: el backend de Insignia clona el flujo en n8n */
  const handleActivate = async (e) => {
    e.preventDefault();
    setStep('activating');
    try {
      await apiClient.post(`/empresa/${empresaId}/workflows/activate`, {
        templateId:  selectedTemplate.id,
        credentials: credForm,
      });
      setStep('success');
      loadActiveWorkflows();
    } catch (err) {
      setActivationError(err.response?.data?.message || 'No se pudo activar el workflow. Intentá más tarde.');
      setStep('error');
    }
  };

  /* Pausar / reactivar un workflow activo */
  const handleToggleWorkflow = async (wf) => {
    const action = wf.active ? 'pause' : 'resume';
    try {
      await apiClient.post(`/empresa/${empresaId}/workflows/${wf.id}/${action}`);
      loadActiveWorkflows();
    } catch {
      alert('No se pudo cambiar el estado de la automatización.');
    }
  };

  /* Eliminar workflow */
  const handleDeleteWorkflow = async (wf) => {
    if (!confirm(`¿Desactivar y eliminar "${wf.name}"?`)) return;
    try {
      await apiClient.delete(`/empresa/${empresaId}/workflows/${wf.id}`);
      loadActiveWorkflows();
    } catch {
      alert('No se pudo eliminar la automatización.');
    }
  };

  const closeModal = () => setSelectedTemplate(null);
  const allTags    = ['Todos', ...new Set(TEMPLATES.flatMap(t => t.tags))];
  const filtered   = filterTag === 'Todos' ? TEMPLATES : TEMPLATES.filter(t => t.tags.includes(filterTag));

  // Templates ya activos para esta empresa
  const activeIds = new Set(activeWorkflows.map(w => w.template_id));

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto space-y-12 pb-20 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em] mb-2">
          <span className="material-symbols-outlined text-[14px]">account_tree</span>
          Automatizaciones
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-text-main-light dark:text-white leading-none">
          Automatiza tu CRM
        </h1>
        <p className="text-text-sub-light dark:text-gray-400 text-lg font-medium mt-2">
          Elegí un flujo, cargá tus datos y lo activamos automáticamente. Sin configuraciones técnicas.
        </p>
      </div>

      {/* Mis automatizaciones activas */}
      {(loadingWf || activeWorkflows.length > 0) && (
        <section>
          <h2 className="text-2xl font-black text-text-main-light dark:text-white mb-5">
            Mis automatizaciones activas
          </h2>

          {loadingWf ? (
            <div className="flex items-center gap-3 text-text-sub-light py-4">
              <span className="size-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-sm font-bold">Cargando...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeWorkflows.map(wf => {
                const tmpl = TEMPLATES.find(t => t.id === wf.template_id);
                return (
                  <div
                    key={wf.id}
                    className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-3xl p-5 flex items-center gap-4"
                  >
                    {tmpl && (
                      <div className={`size-12 rounded-2xl ${tmpl.bg} flex items-center justify-center shrink-0`}>
                        <span className={`material-symbols-outlined ${tmpl.color} text-[22px]`}>{tmpl.icon}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-text-main-light dark:text-white truncate">
                        {wf.name || tmpl?.title || wf.template_id}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`size-2 rounded-full ${wf.active ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-gray-400'}`} />
                        <span className="text-[11px] text-text-sub-light font-bold">
                          {wf.active ? 'Activo' : 'Pausado'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleWorkflow(wf)}
                        title={wf.active ? 'Pausar' : 'Reactivar'}
                        className={`size-9 rounded-xl flex items-center justify-center text-[13px] font-black transition ${
                          wf.active
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100'
                            : 'bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {wf.active ? 'pause' : 'play_arrow'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleDeleteWorkflow(wf)}
                        title="Eliminar"
                        className="size-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Templates disponibles */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-black text-text-main-light dark:text-white">
            Flujos disponibles
          </h2>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(tag)}
                className={`h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterTag === tag
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-primary'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {filtered.map(t => {
            const isActive = activeIds.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => handleOpenTemplate(t)}
                className={`bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border text-left hover:shadow-lg transition-all group relative overflow-hidden ${
                  isActive
                    ? 'border-green-300 dark:border-green-700'
                    : 'border-border-light dark:border-border-dark hover:border-primary'
                }`}
              >
                {isActive && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    <span className="size-1.5 bg-green-500 rounded-full" />
                    Activo
                  </div>
                )}
                <div className={`size-12 rounded-2xl ${t.bg} flex items-center justify-center mb-4`}>
                  <span className={`material-symbols-outlined ${t.color} text-[26px]`}>{t.icon}</span>
                </div>
                <h3 className={`font-black text-sm leading-tight mb-1 transition-colors ${isActive ? 'text-green-700 dark:text-green-300' : 'text-text-main-light dark:text-white group-hover:text-primary'}`}>
                  {t.title}
                </h3>
                <p className="text-[11px] text-text-sub-light mb-4 line-clamp-2">{t.subtitle}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {t.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-text-sub-light uppercase tracking-wide">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wide ${COMPLEXITY_CLS[t.complexity]}`}>
                    {t.complexity}
                  </span>
                  <span className={`text-[10px] font-black flex items-center gap-1 transition-colors ${isActive ? 'text-green-600' : 'text-text-sub-light group-hover:text-primary'}`}>
                    <span className="material-symbols-outlined text-[14px]">{isActive ? 'settings' : 'bolt'}</span>
                    {isActive ? 'Configurar' : 'Activar'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════
          MODAL
      ══════════════════════════════════════ */}
      {selectedTemplate && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[40px] shadow-2xl animate-in zoom-in duration-300 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className={`p-8 ${selectedTemplate.bg} flex items-start gap-5 shrink-0`}>
              <div className="size-16 rounded-2xl bg-white/60 dark:bg-black/20 flex items-center justify-center shrink-0">
                <span className={`material-symbols-outlined text-[36px] ${selectedTemplate.color}`}>
                  {selectedTemplate.icon}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-black text-text-main-light dark:text-white leading-tight">
                  {selectedTemplate.title}
                </h2>
                <p className="text-sm text-text-sub-light mt-1">{selectedTemplate.subtitle}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selectedTemplate.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-white/60 dark:bg-black/20 text-text-main-light dark:text-white uppercase tracking-wide">
                      {tag}
                    </span>
                  ))}
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wide ${COMPLEXITY_CLS[selectedTemplate.complexity]}`}>
                    {selectedTemplate.complexity}
                  </span>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="size-10 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center text-text-sub-light hover:text-text-main-light transition shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* ── DETAIL ── */}
            {step === 'detail' && (
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                <p className="text-sm font-medium text-text-main-light dark:text-white leading-relaxed">
                  {selectedTemplate.description}
                </p>

                {/* Flujo visual */}
                <div>
                  <p className="text-[10px] font-black text-text-sub-light uppercase tracking-widest mb-3">Flujo del proceso</p>
                  <div className="space-y-0">
                    <div className="flex items-center gap-3 p-3 bg-primary/5 dark:bg-primary/10 rounded-2xl">
                      <span className="material-symbols-outlined text-primary text-[20px] shrink-0">bolt</span>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary">Disparador</p>
                        <p className="text-sm font-bold text-text-main-light dark:text-white">{selectedTemplate.trigger}</p>
                      </div>
                    </div>
                    {selectedTemplate.actions.map((action, i) => (
                      <div key={i}>
                        <div className="ml-8 w-0.5 h-3 bg-gray-200 dark:bg-gray-700" />
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                          <span className="size-7 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-black text-text-sub-light shrink-0">{i + 1}</span>
                          <p className="text-sm font-bold text-text-main-light dark:text-white">{action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border-light dark:border-border-dark">
                  <button
                    onClick={() => setStep('form')}
                    className="w-full h-14 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                  >
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    {activeIds.has(selectedTemplate.id) ? 'Reconfigurar flujo' : 'Activar este flujo'}
                  </button>
                </div>
              </div>
            )}

            {/* ── FORM (credenciales) ── */}
            {step === 'form' && (
              <form onSubmit={handleActivate} className="p-8 space-y-5 overflow-y-auto flex-1">
                <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">info</span>
                  <p className="text-xs text-text-sub-light leading-relaxed">
                    Solo necesitamos estos datos para personalizar el flujo con tu empresa. <strong>Nunca compartimos tus credenciales.</strong>
                  </p>
                </div>

                {selectedTemplate.fields.map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        required={field.required}
                        rows={3}
                        placeholder={field.placeholder}
                        value={credForm[field.key] || ''}
                        onChange={e => setCredForm(p => ({ ...p, [field.key]: e.target.value }))}
                        className={TEXTAREA_CLS}
                      />
                    ) : (
                      <input
                        required={field.required}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={credForm[field.key] || ''}
                        onChange={e => setCredForm(p => ({ ...p, [field.key]: e.target.value }))}
                        className={INPUT_CLS}
                      />
                    )}
                    {field.hint && (
                      <p className="text-[10px] text-text-sub-light px-1">{field.hint}</p>
                    )}
                  </div>
                ))}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('detail')}
                    className="h-12 px-5 border-2 border-gray-200 dark:border-gray-700 rounded-2xl text-text-sub-light font-black text-xs uppercase tracking-widest transition hover:text-text-main-light"
                  >
                    ← Volver
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-12 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                  >
                    <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                    Activar ahora
                  </button>
                </div>
              </form>
            )}

            {/* ── ACTIVATING ── */}
            {step === 'activating' && (
              <div className="flex flex-col items-center justify-center gap-6 py-16 px-8 text-center flex-1">
                <div className="size-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <span className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
                <div>
                  <p className="font-black text-xl text-text-main-light dark:text-white">Activando tu flujo...</p>
                  <p className="text-sm text-text-sub-light mt-2">Estamos configurando la automatización con tus datos. Esto toma unos segundos.</p>
                </div>
              </div>
            )}

            {/* ── SUCCESS ── */}
            {step === 'success' && (
              <div className="flex flex-col items-center justify-center gap-6 py-12 px-8 text-center flex-1">
                <div className="size-20 rounded-3xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[48px] text-green-500">check_circle</span>
                </div>
                <div>
                  <p className="font-black text-xl text-text-main-light dark:text-white">¡Flujo activado!</p>
                  <p className="text-sm text-text-sub-light mt-2 max-w-xs">
                    <strong>{selectedTemplate.title}</strong> ya está corriendo para tu empresa. Podés verlo en "Mis automatizaciones activas".
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full h-12 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition"
                >
                  Perfecto, cerrar
                </button>
              </div>
            )}

            {/* ── ERROR ── */}
            {step === 'error' && (
              <div className="flex flex-col items-center justify-center gap-6 py-12 px-8 text-center flex-1">
                <div className="size-20 rounded-3xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[48px] text-red-500">error</span>
                </div>
                <div>
                  <p className="font-black text-xl text-text-main-light dark:text-white">No se pudo activar</p>
                  <p className="text-sm text-red-500 mt-2 max-w-xs">{activationError}</p>
                </div>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setStep('form')}
                    className="flex-1 h-12 border-2 border-gray-200 dark:border-gray-700 rounded-2xl text-text-sub-light font-black text-xs uppercase tracking-widest transition hover:text-text-main-light"
                  >
                    ← Reintentar
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl font-black text-xs uppercase tracking-widest transition"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientAutomation;
