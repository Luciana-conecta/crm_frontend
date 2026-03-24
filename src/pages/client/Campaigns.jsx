const Campaigns = () => {
  const FEATURES = [
    { icon: 'send',           title: 'Envíos masivos',         desc: 'WhatsApp, Email y SMS a toda tu base de contactos en segundos.' },
    { icon: 'schedule',       title: 'Programación',           desc: 'Define fecha y hora exacta para cada campaña.' },
    { icon: 'segment',        title: 'Segmentación',           desc: 'Filtra por etiquetas, estado, última interacción y más.' },
    { icon: 'auto_awesome',   title: 'Plantillas con IA',      desc: 'Genera el copy de tu campaña con el asistente de IA integrado.' },
    { icon: 'bar_chart',      title: 'Analítica en tiempo real', desc: 'Tasa de apertura, clics, respuestas y conversiones.' },
    { icon: 'repeat',         title: 'Secuencias automáticas', desc: 'Follow-ups automáticos si el contacto no responde.' },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background-light dark:bg-background-dark px-6 py-16">

      {/* Badge */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 text-blue-600 text-xs font-black uppercase tracking-widest mb-6">
        <span className="size-1.5 rounded-full bg-blue-600 animate-pulse" />
        En desarrollo
      </div>

      {/* Ícono principal */}
      <div className="size-24 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-600/30 mb-8">
        <span className="material-symbols-outlined text-white text-[48px]">campaign</span>
      </div>

      {/* Título */}
      <h1 className="text-3xl font-black text-text-main-light dark:text-white text-center mb-3">
        Campañas masivas
      </h1>
      <p className="text-base text-text-sub-light text-center max-w-md mb-12 leading-relaxed">
        Envía mensajes personalizados a toda tu base de contactos desde un solo lugar.
        Próximamente disponible.
      </p>

      {/* Features grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl mb-12">
        {FEATURES.map((f) => (
          <div
            key={f.icon}
            className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-5 flex items-start gap-4"
          >
            <div className="size-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">{f.icon}</span>
            </div>
            <div>
              <p className="text-sm font-black text-text-main-light dark:text-white">{f.title}</p>
              <p className="text-xs text-text-sub-light mt-1 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex items-center gap-3">
        <button
          disabled
          className="flex items-center gap-2 px-6 py-3 bg-blue-600/10 text-blue-600 text-sm font-black rounded-xl cursor-not-allowed opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">notifications</span>
          Notificarme cuando esté listo
        </button>
        <span className="text-xs text-text-sub-light">Muy pronto</span>
      </div>
    </div>
  );
};

export default Campaigns;
