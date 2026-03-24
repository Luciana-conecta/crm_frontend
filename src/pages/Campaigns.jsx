
import React from 'react';

const mockCampaigns = [
  { id: '1', name: 'Promo Verano 2024', type: 'Email Marketing', status: 'Activa', sent: 12450, openRate: 42.8, openRateTrend: '+2.4%', progress: 85, lastUpdate: 'Hace 2h' },
  { id: '2', name: 'Recordatorio Citas', type: 'WhatsApp', status: 'Pausada', sent: 850, openRate: 15.2, openRateTrend: '-0.5%', progress: 0, lastUpdate: 'Ayer' },
  { id: '3', name: 'Black Friday Flash', type: 'SMS Broadcast', status: 'Finalizada', sent: 5000, openRate: 38.0, openRateTrend: '+10.2%', progress: 100, lastUpdate: '24 Oct' },
  { id: '4', name: 'Bienvenida Nuevos', type: 'Automatización', status: 'Activa', sent: 342, openRate: 18.5, openRateTrend: 'estable', progress: 0, lastUpdate: 'Siempre activa' },
];

const CampaignCard = ({ campaign }) => (
  <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col gap-6">
    <div className="flex justify-between items-start">
      <div className="flex gap-4">
        <div className={`size-12 rounded-xl flex items-center justify-center ${
          campaign.type === 'Email Marketing' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' :
          campaign.type === 'WhatsApp' ? 'bg-green-50 text-green-600 dark:bg-green-900/20' :
          'bg-purple-50 text-purple-600 dark:bg-purple-900/20'
        }`}>
          <span className="material-symbols-outlined text-2xl">{
            campaign.type === 'Email Marketing' ? 'mail' :
            campaign.type === 'WhatsApp' ? 'chat' : 'sms'
          }</span>
        </div>
        <div>
          <h3 className="text-lg font-black text-text-main-light dark:text-white group-hover:text-primary transition-colors">{campaign.name}</h3>
          <p className="text-xs text-text-sub-light dark:text-gray-500 font-bold uppercase tracking-wider mt-1">{campaign.type} • {campaign.lastUpdate}</p>
        </div>
      </div>
      <button className="text-text-sub-light hover:text-text-main-light dark:hover:text-white">
        <span className="material-symbols-outlined">more_vert</span>
      </button>
    </div>

    <div className="flex items-center">
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
        campaign.status === 'Activa' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30' :
        campaign.status === 'Pausada' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30' :
        'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800'
      }`}>
        {campaign.status}
      </span>
    </div>

    <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-100 dark:border-gray-800">
      <div>
        <p className="text-[10px] font-black text-text-sub-light dark:text-gray-500 uppercase tracking-widest">Enviados</p>
        <p className="text-2xl font-black text-text-main-light dark:text-white mt-1">{campaign.sent.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-[10px] font-black text-text-sub-light dark:text-gray-500 uppercase tracking-widest">Aperturas</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-2xl font-black text-text-main-light dark:text-white">{campaign.openRate}%</p>
          {campaign.openRateTrend !== 'estable' && (
            <span className={`text-[10px] font-black px-1.5 rounded-lg ${campaign.openRateTrend.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {campaign.openRateTrend}
            </span>
          )}
        </div>
      </div>
    </div>

    {campaign.status === 'Activa' && campaign.progress > 0 && (
      <div className="mt-auto">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5 text-text-sub-light">
          <span>Progreso</span>
          <span className="text-text-main-light dark:text-white">{campaign.progress}%</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
          <div className="bg-primary h-full rounded-full shadow-lg shadow-primary/30" style={{ width: `${campaign.progress}%` }} />
        </div>
      </div>
    )}

    {campaign.status === 'Pausada' && (
      <button className="w-full py-2 text-xs font-black uppercase tracking-widest text-primary border-2 border-dashed border-primary/30 rounded-xl hover:bg-primary/5 transition-all">
        Reanudar Campaña
      </button>
    )}
    
    {campaign.status === 'Finalizada' && (
      <div className="flex items-center gap-2 text-[10px] font-black text-text-sub-light uppercase tracking-widest">
        <span className="material-symbols-outlined text-green-500 filled text-[18px]">check_circle</span>
        Completado con éxito
      </div>
    )}
  </div>
);

const Campaigns = () => {
  return (
    <div className="p-6 md:p-10 flex flex-col gap-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black tracking-tight text-text-main-light dark:text-white">Mis Campañas</h1>
          <p className="text-text-sub-light dark:text-gray-400 text-lg max-w-2xl">
            Gestiona y monitorea el rendimiento de tus campañas de email, SMS y WhatsApp en tiempo real.
          </p>
        </div>
        <button className="bg-primary hover:bg-primary-hover text-white h-12 px-6 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined">add</span>
          Nueva Campaña
        </button>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark p-2 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-sub-light dark:text-gray-500">search</span>
            <input 
              type="text" 
              placeholder="Buscar por nombre de campaña..."
              className="w-full pl-10 pr-4 py-2 bg-[#f6f6f8] dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button className="px-4 py-2 bg-primary/10 text-primary text-xs font-black uppercase tracking-widest rounded-xl">Todos los estados</button>
            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-border-light dark:border-gray-700 text-text-sub-light dark:text-gray-400 text-xs font-black uppercase tracking-widest rounded-xl">Canal</button>
            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-border-light dark:border-gray-700 text-text-sub-light dark:text-gray-400 text-xs font-black uppercase tracking-widest rounded-xl">Fecha</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
        {mockCampaigns.map((c) => (
          <CampaignCard key={c.id} campaign={c} />
        ))}
        <div className="border-2 border-dashed border-border-light dark:border-border-dark rounded-2xl flex flex-col items-center justify-center p-8 gap-4 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
          <div className="size-14 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-700 shadow-sm transition-all">
            <span className="material-symbols-outlined text-text-sub-light group-hover:text-primary text-3xl">add</span>
          </div>
          <div className="text-center">
            <h3 className="font-bold text-text-main-light dark:text-white">Nueva Campaña</h3>
            <p className="text-xs text-text-sub-light dark:text-gray-500 mt-1">Diseña tu próximo envío</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Campaigns;
