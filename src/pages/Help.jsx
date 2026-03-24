import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ── Datos ─────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    category: 'Primeros pasos',
    icon: 'rocket_launch',
    items: [
      {
        q: '¿Cómo conecto mi número de WhatsApp Business?',
        a: 'Ve a Configuración → Canales Conectados → WhatsApp Business y haz clic en "Conectar Nuevo". Necesitarás el Phone Number ID, el WABA ID y el Access Token de tu app en Meta for Developers.',
      },
      {
        q: '¿Puedo conectar más de un número de WhatsApp?',
        a: 'Sí. Puedes agregar múltiples canales desde Configuración → Canales Conectados. Cada canal aparecerá en el Inbox y podrás filtrar conversaciones por canal.',
      },
      {
        q: '¿Cómo importo mis contactos existentes?',
        a: 'En la sección Contactos encontrarás el botón "Importar". Puedes subir un archivo CSV con los campos nombre, teléfono y email. El sistema detecta duplicados automáticamente.',
      },
    ],
  },
  {
    category: 'Inbox y mensajes',
    icon: 'inbox',
    items: [
      {
        q: '¿Por qué no llegan los mensajes al Inbox?',
        a: 'Verifica que el webhook esté correctamente configurado en Meta for Developers apuntando a tu dominio. También asegúrate de que el token de acceso no haya expirado.',
      },
      {
        q: '¿Cómo asigno una conversación a un agente?',
        a: 'Abre la conversación y en el panel derecho encontrarás la opción "Asignar agente". Solo los usuarios con rol Admin Empresa pueden reasignar conversaciones.',
      },
      {
        q: '¿Qué significa "Transferir a humano" en el Asistente IA?',
        a: 'Cuando el asistente sugiere una respuesta, puedes hacer clic en "Transferir a humano" para marcar la conversación como requiere atención personal. El asistente dejará de responder automáticamente en esa conversación.',
      },
    ],
  },
  {
    category: 'Asistente de IA',
    icon: 'smart_toy',
    items: [
      {
        q: '¿El asistente responde automáticamente sin que yo haga nada?',
        a: 'Sí, cuando lo activas desde Asistente IA → toggle "Activo". Responde en los primeros minutos, clasifica la intención del mensaje y escala al vendedor humano según las reglas que configures.',
      },
      {
        q: '¿Qué información debo cargar para que el asistente funcione bien?',
        a: 'Completa las 4 secciones: (1) Información del negocio con una descripción clara, (2) Productos y precios, (3) Preguntas frecuentes con sus respuestas, y (4) Reglas de escalamiento. Cuanto más detallado, mejor será el asistente.',
      },
      {
        q: '¿El asistente puede enviar mensajes por sí solo?',
        a: 'No en esta versión. El asistente sugiere respuestas que el agente puede usar con un clic. Esto garantiza que siempre haya supervisión humana en las conversaciones.',
      },
    ],
  },
  {
    category: 'Equipo y permisos',
    icon: 'group',
    items: [
      {
        q: '¿Cuál es la diferencia entre Admin Empresa y Usuario Empresa?',
        a: 'El Admin Empresa tiene acceso completo: puede crear/eliminar usuarios, ver configuración, facturación y permisos. El Usuario Empresa solo puede usar el Inbox, Contactos y el Asistente IA.',
      },
      {
        q: '¿Cómo invito a un nuevo agente?',
        a: 'Ve a Configuración → Equipo → botón "Nuevo usuario". Completa nombre, email y contraseña temporal. El agente recibirá un email con sus credenciales de acceso.',
      },
    ],
  },
  {
    category: 'Facturación y plan',
    icon: 'receipt_long',
    items: [
      {
        q: '¿Qué pasa si supero el límite de contactos de mi plan?',
        a: 'Recibirás una notificación cuando alcances el 80% del límite. Al llegar al 100%, no podrás crear nuevos contactos hasta actualizar tu plan o eliminar contactos existentes.',
      },
      {
        q: '¿Puedo cancelar en cualquier momento?',
        a: 'Sí. Puedes cancelar desde Configuración → Facturación. Tu acceso continuará hasta el final del período pagado y no se realizarán cobros adicionales.',
      },
    ],
  },
];

const TUTORIALS = [
  {
    id: 1,
    title: 'Configuración inicial del CRM',
    desc: 'Conecta tu WhatsApp, carga tu logo y configura tu equipo en menos de 10 minutos.',
    duration: '8 min',
    category: 'Primeros pasos',
    thumbnail: null,
    url: '',
  },
  {
    id: 2,
    title: 'Cómo usar el Inbox',
    desc: 'Gestiona conversaciones, filtra por estado, asigna agentes y resuelve tickets.',
    duration: '5 min',
    category: 'Inbox',
    thumbnail: null,
    url: '',
  },
  {
    id: 3,
    title: 'Configurar el Asistente de IA',
    desc: 'Carga el catálogo, preguntas frecuentes y reglas de escalamiento para que la IA responda por vos.',
    duration: '12 min',
    category: 'Asistente IA',
    thumbnail: null,
    url: '',
  },
  {
    id: 4,
    title: 'Conectar Instagram y Facebook',
    desc: 'Paso a paso para obtener el Page ID y el Access Token desde Meta Business Suite.',
    duration: '10 min',
    category: 'Canales',
    thumbnail: null,
    url: '',
  },
  {
    id: 5,
    title: 'Gestión de contactos',
    desc: 'Importa, filtra, etiqueta y segmenta tu base de contactos.',
    duration: '6 min',
    category: 'Contactos',
    thumbnail: null,
    url: '',
  },
  {
    id: 6,
    title: 'Roles y permisos del equipo',
    desc: 'Diferencias entre Admin Empresa y Usuario Empresa, y cómo asignar roles.',
    duration: '4 min',
    category: 'Equipo',
    thumbnail: null,
    url: '',
  },
];

const CATEGORY_COLORS = {
  'Primeros pasos': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Inbox':          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Asistente IA':   'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Canales':        'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Contactos':      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Equipo':         'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

// ── Componentes ───────────────────────────────────────────────────────────────

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border border-border-light dark:border-border-dark rounded-2xl overflow-hidden transition-all ${open ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-surface-dark'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className={`text-sm font-bold leading-snug ${open ? 'text-blue-700 dark:text-blue-400' : 'text-text-main-light dark:text-white'}`}>
          {q}
        </span>
        <span className={`material-symbols-outlined text-[20px] flex-shrink-0 transition-transform ${open ? 'rotate-180 text-blue-600' : 'text-text-sub-light'}`}>
          expand_more
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-sm text-text-sub-light leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
};

const TutorialCard = ({ tutorial, isAdmin, onEdit }) => (
  <div className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark overflow-hidden group hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all">
    {/* Thumbnail */}
    <div className="relative h-40 bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center overflow-hidden">
      {tutorial.thumbnail ? (
        <img src={tutorial.thumbnail} alt={tutorial.title} className="w-full h-full object-cover" />
      ) : (
        <span className="material-symbols-outlined text-white/30 text-[72px]">play_circle</span>
      )}
      {tutorial.url && (
        <a
          href={tutorial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="size-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
            <span className="material-symbols-outlined text-blue-600 text-[28px]">play_arrow</span>
          </div>
        </a>
      )}
      {/* Duration badge */}
      <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-black rounded-lg">
        {tutorial.duration}
      </span>
    </div>

    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${CATEGORY_COLORS[tutorial.category] || 'bg-gray-100 text-gray-600'}`}>
          {tutorial.category}
        </span>
        {isAdmin && (
          <button
            onClick={() => onEdit(tutorial)}
            className="text-text-sub-light hover:text-blue-600 transition-colors"
            title="Editar tutorial"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
          </button>
        )}
      </div>
      <p className="text-sm font-black text-text-main-light dark:text-white leading-snug">{tutorial.title}</p>
      <p className="text-xs text-text-sub-light leading-relaxed">{tutorial.desc}</p>

      {tutorial.url ? (
        <a
          href={tutorial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
        >
          <span className="material-symbols-outlined text-[14px]">play_circle</span>
          Ver tutorial
        </a>
      ) : (
        <span className="flex items-center gap-1.5 text-xs font-bold text-text-sub-light">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          Próximamente
        </span>
      )}
    </div>
  </div>
);

// ── Página principal ──────────────────────────────────────────────────────────

const Help = () => {
  const { user } = useAuth();
  const isAdmin = user?.tipo_usuario === 'admin_empresa';

  const [activeTab, setActiveTab]   = useState('faq');
  const [search,    setSearch]      = useState('');
  const [tutorials, setTutorials]   = useState(TUTORIALS);
  const [editModal, setEditModal]   = useState(null); // tutorial being edited
  const [editForm,  setEditForm]    = useState({});

  // Filtrar FAQs por búsqueda
  const filteredFaqs = search.trim()
    ? FAQS.map(cat => ({
        ...cat,
        items: cat.items.filter(
          item =>
            item.q.toLowerCase().includes(search.toLowerCase()) ||
            item.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : FAQS;

  const filteredTutorials = search.trim()
    ? tutorials.filter(
        t =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.desc.toLowerCase().includes(search.toLowerCase()) ||
          t.category.toLowerCase().includes(search.toLowerCase())
      )
    : tutorials;

  const handleSaveTutorial = () => {
    setTutorials(prev =>
      prev.map(t => t.id === editModal.id ? { ...t, ...editForm } : t)
    );
    setEditModal(null);
  };

  const totalFaqs = FAQS.reduce((acc, c) => acc + c.items.length, 0);

  return (
    <div className="h-full flex flex-col bg-background-light dark:bg-background-dark">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-8 py-10 text-white text-center">
        <div className="size-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[28px]">help</span>
        </div>
        <h1 className="text-2xl font-black mb-2">Centro de Ayuda</h1>
        <p className="text-blue-100 text-sm mb-6">Tutoriales, guías y respuestas a las preguntas más frecuentes</p>

        {/* Buscador */}
        <div className="relative max-w-md mx-auto">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en la ayuda..."
            className="w-full pl-11 pr-4 py-3 bg-white/20 backdrop-blur border border-white/30 rounded-2xl text-white placeholder-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 px-8 pt-4 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shrink-0">
        {[
          { id: 'faq',       label: 'Preguntas frecuentes', icon: 'quiz',        count: totalFaqs },
          { id: 'tutorials', label: 'Tutoriales',           icon: 'play_lesson', count: tutorials.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs font-bold transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-background-light dark:bg-background-dark'
                : 'text-text-sub-light hover:text-text-main-light dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${activeTab === tab.id ? 'bg-blue-600/10 text-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-text-sub-light'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {/* ─── FAQs ─── */}
        {activeTab === 'faq' && (
          <div className="max-w-3xl mx-auto space-y-8">
            {filteredFaqs.length === 0 ? (
              <div className="py-16 text-center text-text-sub-light">
                <span className="material-symbols-outlined text-5xl opacity-20 block mb-3">search_off</span>
                <p className="text-sm">Sin resultados para "<strong>{search}</strong>"</p>
              </div>
            ) : (
              filteredFaqs.map(cat => (
                <div key={cat.category}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-8 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                    </div>
                    <h2 className="text-sm font-black text-text-main-light dark:text-white uppercase tracking-wider">{cat.category}</h2>
                    <span className="text-xs text-text-sub-light">({cat.items.length})</span>
                  </div>
                  <div className="space-y-2">
                    {cat.items.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
                  </div>
                </div>
              ))
            )}

            {/* CTA soporte */}
            <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-600/20 dark:to-indigo-600/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white text-[22px]">support_agent</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-text-main-light dark:text-white">¿No encontraste tu respuesta?</p>
                <p className="text-xs text-text-sub-light mt-0.5">Escríbenos por WhatsApp y te respondemos en minutos.</p>
              </div>
              <a
                href="https://wa.me/595981000000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white text-xs font-black rounded-xl hover:bg-green-600 transition-all shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                Contactar soporte
              </a>
            </div>
          </div>
        )}

        {/* ─── Tutoriales ─── */}
        {activeTab === 'tutorials' && (
          <div className="max-w-5xl mx-auto">
            {isAdmin && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-600 text-[18px]">info</span>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Como administrador podés editar los tutoriales — actualiza el enlace de video y la miniatura haciendo clic en <strong>editar</strong> en cada tarjeta.
                </p>
              </div>
            )}

            {filteredTutorials.length === 0 ? (
              <div className="py-16 text-center text-text-sub-light">
                <span className="material-symbols-outlined text-5xl opacity-20 block mb-3">search_off</span>
                <p className="text-sm">Sin resultados para "<strong>{search}</strong>"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTutorials.map(t => (
                  <TutorialCard
                    key={t.id}
                    tutorial={t}
                    isAdmin={isAdmin}
                    onEdit={tut => { setEditModal(tut); setEditForm({ title: tut.title, desc: tut.desc, url: tut.url, thumbnail: tut.thumbnail, duration: tut.duration, category: tut.category }); }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal edición tutorial (solo admin) ── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl border border-border-light dark:border-border-dark w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-text-main-light dark:text-white">Editar tutorial</h3>
              <button onClick={() => setEditModal(null)} className="size-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-text-sub-light hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {[
                { key: 'title',     label: 'Título',               placeholder: 'Cómo usar el Inbox...' },
                { key: 'desc',      label: 'Descripción',          placeholder: 'Descripción corta del tutorial...',  textarea: true },
                { key: 'url',       label: 'URL del video',        placeholder: 'https://youtube.com/watch?v=...' },
                { key: 'thumbnail', label: 'URL miniatura (opcional)', placeholder: 'https://img.youtube.com/...' },
                { key: 'duration',  label: 'Duración',             placeholder: '5 min' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest block mb-1.5">{f.label}</label>
                  {f.textarea ? (
                    <textarea
                      rows={3}
                      value={editForm[f.key] || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm text-text-main-light dark:text-white placeholder-text-sub-light focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={editForm[f.key] || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full h-11 px-3 rounded-xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm text-text-main-light dark:text-white placeholder-text-sub-light focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={handleSaveTutorial} className="flex-1 py-2.5 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-all">
                Guardar cambios
              </button>
              <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 border border-border-light dark:border-border-dark rounded-xl text-xs font-bold text-text-sub-light hover:bg-background-light dark:hover:bg-background-dark transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Help;
