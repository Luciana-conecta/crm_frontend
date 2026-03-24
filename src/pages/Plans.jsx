
import React, { useState } from 'react';

const initialPlans = [
  { 
    id: '1', 
    name: 'Starter', 
    price: 0, 
    description: 'Perfecto para validar tu idea.', 
    features: ['500 Contactos', '1 Usuario', 'Email Básico'], 
    maxContacts: 500, 
    maxUsers: 1, 
    trialDays: 30,
    icon: 'rocket_launch',
    color: 'bg-blue-500'
  },
  { 
    id: '2', 
    name: 'Pro', 
    price: 49, 
    description: 'Escala tu comunicación omnicanal.', 
    features: ['Ilimitado Contactos', '5 Usuarios', 'Automatizaciones'], 
    maxContacts: 999999, 
    maxUsers: 5, 
    trialDays: 0,
    icon: 'diamond',
    color: 'bg-primary'
  },
];

const Plans = () => {
  const [plans, setPlans] = useState(initialPlans);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const [formData, setFormData] = useState({
    name: '', price: 0, description: '', maxContacts: 500, maxUsers: 1, trialDays: 0, icon: 'rocket_launch', color: 'bg-blue-500'
  });

  const handleOpenModal = (plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData(plan);
    } else {
      setEditingPlan(null);
      setFormData({ name: '', price: 0, description: '', maxContacts: 500, maxUsers: 1, trialDays: 0, icon: 'rocket_launch', color: 'bg-blue-500' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPlan) {
      setPlans(plans.map(p => p.id === editingPlan.id ? { ...p, ...formData } : p));
    } else {
      const newPlan = { ...formData, id: Math.random().toString(36).substr(2, 9), features: ['Características base'] };
      setPlans([...plans, newPlan]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (confirm('¿Eliminar este plan?')) setPlans(plans.filter(p => p.id !== id));
  };

  return (
    <div className="p-10 flex flex-col gap-10 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black">Planes y Precios</h1>
          <p className="text-text-sub-light mt-2 text-lg">Define los límites y costos del servicio.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-primary text-white h-12 px-6 rounded-xl font-bold flex items-center gap-2 shadow-lg">
          <span className="material-symbols-outlined">add</span> Nuevo Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map(plan => (
          <div key={plan.id} className={`bg-surface-light dark:bg-surface-dark p-8 rounded-[32px] border-2 flex flex-col gap-6 transition-all ${plan.trialDays > 0 ? 'border-amber-400' : 'border-border-light dark:border-border-dark'}`}>
            <div className="flex justify-between items-start">
              <div className={`size-12 rounded-2xl ${plan.color} flex items-center justify-center text-white shadow-xl`}>
                <span className="material-symbols-outlined">{plan.icon}</span>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => handleOpenModal(plan)} className="size-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-text-sub-light hover:text-primary"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                 <button onClick={() => handleDelete(plan.id)} className="size-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-text-sub-light hover:text-red-500"><span className="material-symbols-outlined text-[18px]">delete</span></button>
              </div>
            </div>

            {plan.trialDays > 0 && (
              <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md w-fit">
                Incluye {plan.trialDays} días de prueba gratis
              </span>
            )}

            <div>
              <h3 className="text-2xl font-black">{plan.name}</h3>
              <p className="text-sm text-text-sub-light mt-1">{plan.description}</p>
            </div>

            <div className="flex items-baseline gap-1">
               <span className="text-4xl font-black">${plan.price}</span>
               <span className="text-text-sub-light text-sm font-bold">/mes</span>
            </div>

            <div className="space-y-4 border-t pt-6">
               <div className="flex justify-between text-xs font-bold">
                 <span className="text-text-sub-light uppercase tracking-widest">Límite Contactos:</span>
                 <span className="text-text-main-light dark:text-white">{plan.maxContacts >= 99999 ? 'Ilimitado' : plan.maxContacts}</span>
               </div>
               <div className="flex justify-between text-xs font-bold">
                 <span className="text-text-sub-light uppercase tracking-widest">Máximo Usuarios:</span>
                 <span className="text-text-main-light dark:text-white">{plan.maxUsers}</span>
               </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[32px] p-10 space-y-6">
              <h2 className="text-2xl font-black">{editingPlan ? 'Editar' : 'Nuevo'} Plan</h2>
              <div className="space-y-4">
                 <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nombre..." className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl font-bold" />
                 <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} placeholder="Precio..." className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl font-bold" />
                 <input type="number" value={formData.maxContacts} onChange={e => setFormData({...formData, maxContacts: Number(e.target.value)})} placeholder="Máx. Contactos..." className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl font-bold" />
                 <input type="number" value={formData.maxUsers} onChange={e => setFormData({...formData, maxUsers: Number(e.target.value)})} placeholder="Máx. Usuarios..." className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl font-bold" />
                 <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <span className="text-xs font-bold text-text-sub-light uppercase">Prueba Gratis (Días):</span>
                    <input type="number" value={formData.trialDays} onChange={e => setFormData({...formData, trialDays: Number(e.target.value)})} className="w-20 bg-transparent border-none font-black text-right" />
                 </div>
              </div>
              <button type="submit" className="w-full h-14 bg-primary text-white font-black uppercase rounded-2xl">Guardar Plan</button>
           </form>
        </div>
      )}
    </div>
  );
};

export default Plans;
