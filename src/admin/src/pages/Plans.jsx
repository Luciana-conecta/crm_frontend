
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../../../src/services/api';

const fmtGs = (amount) => {
  const n = Math.round(Number(amount));
  return `₲ ${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const EMPTY_FORM = {
  nombre: '', descripcion: '', precio: 0,
  max_usuarios: 5, max_clientes: 500, max_canales: 1,
  icon: 'rocket', color: 'bg-primary',
};

const ICON_OPTIONS = ['rocket', 'diamond', 'star', 'bolt', 'workspace_premium', 'shield'];
const COLOR_OPTIONS = [
  { label: 'Indigo', value: 'bg-primary' },
  { label: 'Azul', value: 'bg-blue-500' },
  { label: 'Verde', value: 'bg-green-500' },
  { label: 'Morado', value: 'bg-purple-500' },
  { label: 'Naranja', value: 'bg-orange-500' },
];

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getPlans();
      setPlans(res.data || []);
    } catch (err) {
      setError('No se pudieron cargar los planes.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setForm({
        nombre: plan.nombre || '',
        descripcion: plan.descripcion || '',
        precio: plan.precio || 0,
        max_usuarios: plan.max_usuarios || 5,
        max_clientes: plan.max_clientes || 500,
        max_canales: plan.max_canales || 1,
        icon: plan.icon || 'rocket',
        color: plan.color || 'bg-primary',
      });
    } else {
      setEditingPlan(null);
      setForm(EMPTY_FORM);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio: Number(form.precio),
        max_usuarios: Number(form.max_usuarios),
        max_clientes: Number(form.max_clientes),
        max_canales: Number(form.max_canales),
        caracteristicas: null,
      };
      if (editingPlan) {
        await adminAPI.updatePlan(editingPlan.id, payload);
      } else {
        await adminAPI.createPlan(payload);
      }
      setIsModalOpen(false);
      loadPlans();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar el plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este plan? Las empresas que lo tienen asignado quedarán sin plan.')) return;
    try {
      await adminAPI.deletePlan(id);
      loadPlans();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el plan.');
    }
  };

  const f = (v) => (v > 50000 ? 'Ilimitado' : v);

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black">Planes del Sistema</h1>
          <p className="text-text-sub-light mt-2 text-lg">Configura precios y límites para tus clientes.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-primary text-white h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span> Nuevo Plan
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-600 text-sm font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map(p => (
            <div
              key={p.id}
              className="bg-surface-light dark:bg-surface-dark p-8 rounded-[32px] border-2 border-border-light dark:border-border-dark flex flex-col gap-6 relative group"
            >
              <div className={`size-14 rounded-2xl ${p.color || 'bg-primary'} flex items-center justify-center text-white shadow-xl`}>
                <span className="material-symbols-outlined text-3xl">{p.icon || 'rocket'}</span>
              </div>

              {p.empresas_count > 0 && (
                <span className="absolute top-8 right-8 bg-primary/10 text-primary text-[9px] font-black uppercase px-2 py-1 rounded-lg">
                  {p.empresas_count} empresa{p.empresas_count !== 1 ? 's' : ''}
                </span>
              )}

              <div>
                <h3 className="text-2xl font-black">{p.nombre}</h3>
                <p className="text-text-sub-light text-sm mt-1">{p.descripcion}</p>
              </div>

              <div className="flex items-baseline gap-1">
                {Number(p.precio) === 0 ? (
                  <span className="text-4xl font-black text-green-600">Gratis</span>
                ) : (
                  <>
                    <span className="text-3xl font-black">{fmtGs(p.precio)}</span>
                    <span className="text-text-sub-light font-bold">/mes</span>
                  </>
                )}
              </div>

              <div className="space-y-2.5 pt-4 border-t border-dashed border-border-light dark:border-border-dark">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-text-sub-light">Usuarios</span>
                  <span>{f(p.max_usuarios)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-text-sub-light">Contactos</span>
                  <span>{f(p.max_clientes)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-text-sub-light">Canales WhatsApp</span>
                  <span>{f(p.max_canales)}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => openModal(p)}
                  className="flex-1 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-black uppercase tracking-widest hover:text-primary transition-all"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="size-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          ))}

          {plans.length === 0 && !loading && (
            <div className="col-span-3 text-center py-20 text-text-sub-light">
              No hay planes creados. Crea el primero.
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[40px] p-10 space-y-5 overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-2xl font-black">{editingPlan ? 'Editar Plan' : 'Nuevo Plan'}</h2>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Nombre del Plan</label>
              <input
                required
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Pro, Starter, Enterprise..."
                className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Descripción</label>
              <input
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Breve descripción del plan..."
                className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Precio / Mes (₲ Guaraníes)</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.precio}
                  onChange={e => setForm({ ...form, precio: e.target.value })}
                  className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Canales WhatsApp</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.max_canales}
                  onChange={e => setForm({ ...form, max_canales: e.target.value })}
                  className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Usuarios Máx.</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.max_usuarios}
                  onChange={e => setForm({ ...form, max_usuarios: e.target.value })}
                  className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Contactos Máx.</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.max_clientes}
                  onChange={e => setForm({ ...form, max_clientes: e.target.value })}
                  className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Icono</label>
                <select
                  value={form.icon}
                  onChange={e => setForm({ ...form, icon: e.target.value })}
                  className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
                >
                  {ICON_OPTIONS.map(ic => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Color</label>
                <select
                  value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                  className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
                >
                  {COLOR_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-16 bg-primary text-white font-black uppercase rounded-2xl shadow-xl shadow-primary/30 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : (editingPlan ? 'Actualizar Plan' : 'Crear Plan')}
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full text-xs font-black uppercase text-text-sub-light tracking-widest"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Plans;
