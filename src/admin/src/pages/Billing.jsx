
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../../../src/services/api';

const fmtGs = (amount) => {
  const n = Math.round(Number(amount));
  return `₲ ${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const ESTADO_STYLES = {
  pagado:   'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  pendiente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  vencido:  'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',
};

const EMPTY_FORM = {
  empresa_id: '',
  plan_id: '',
  monto: '',
  estado: 'pendiente',
  fecha_pago: '',
  fecha_vencimiento: '',
  concepto: '',
  referencia: '',
  notas: '',
};

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Billing = () => {
  const [pagos, setPagos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPago, setEditingPago] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pagosRes, empresasRes, planesRes] = await Promise.all([
        adminAPI.getPagos(),
        adminAPI.getCompanies(),
        adminAPI.getPlans(),
      ]);
      setPagos(pagosRes.data || []);
      setEmpresas(empresasRes.data || []);
      setPlanes(planesRes.data || []);
    } catch {
      // silently fail — table may not exist yet
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditingPago(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (pago) => {
    setEditingPago(pago);
    setForm({
      empresa_id: pago.empresa_id || '',
      plan_id: pago.plan_id || '',
      monto: pago.monto || '',
      estado: pago.estado || 'pendiente',
      fecha_pago: pago.fecha_pago ? pago.fecha_pago.slice(0, 10) : '',
      fecha_vencimiento: pago.fecha_vencimiento ? pago.fecha_vencimiento.slice(0, 10) : '',
      concepto: pago.concepto || '',
      referencia: pago.referencia || '',
      notas: pago.notas || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        empresa_id: Number(form.empresa_id),
        plan_id: form.plan_id ? Number(form.plan_id) : null,
        monto: Number(form.monto),
        fecha_pago: form.fecha_pago || null,
        fecha_vencimiento: form.fecha_vencimiento || null,
      };
      if (editingPago) {
        await adminAPI.updatePago(editingPago.id, payload);
      } else {
        await adminAPI.createPago(payload);
      }
      setIsModalOpen(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar el pago.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro de pago?')) return;
    try {
      await adminAPI.deletePago(id);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar.');
    }
  };

  const handleMarkPaid = async (pago) => {
    try {
      await adminAPI.updatePago(pago.id, { estado: 'pagado', fecha_pago: new Date().toISOString().slice(0, 10) });
      loadAll();
    } catch {
      alert('Error al actualizar el pago.');
    }
  };

  const filtered = pagos.filter(p => {
    if (filterEmpresa && String(p.empresa_id) !== filterEmpresa) return false;
    if (filterEstado && p.estado !== filterEstado) return false;
    return true;
  });

  // Summary stats
  const totalPagado = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + Number(p.monto), 0);
  const totalPendiente = pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + Number(p.monto), 0);
  const totalVencido = pagos.filter(p => p.estado === 'vencido').reduce((s, p) => s + Number(p.monto), 0);

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black">Facturación</h1>
          <p className="text-text-sub-light mt-2 text-lg">Seguimiento de pagos y suscripciones de tus clientes.</p>
        </div>
        <button
          onClick={openNew}
          className="bg-primary text-white h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span> Registrar Pago
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Cobrado', value: totalPagado, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10', icon: 'check_circle' },
          { label: 'Pendiente por Cobrar', value: totalPendiente, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/10', icon: 'schedule' },
          { label: 'Vencido sin Pagar', value: totalVencido, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10', icon: 'warning' },
        ].map((card) => (
          <div key={card.label} className={`${card.bg} p-6 rounded-3xl flex items-center gap-5`}>
            <div className={`size-14 rounded-2xl bg-white/60 dark:bg-black/20 flex items-center justify-center ${card.color}`}>
              <span className="material-symbols-outlined text-3xl">{card.icon}</span>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-text-sub-light tracking-widest">{card.label}</p>
              <p className={`text-3xl font-black mt-1 ${card.color}`}>{fmtGs(card.value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
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
        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          className="h-11 px-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl text-sm font-bold dark:text-white"
        >
          <option value="">Todos los estados</option>
          <option value="pagado">Pagado</option>
          <option value="pendiente">Pendiente</option>
          <option value="vencido">Vencido</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark">
                <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Empresa</th>
                <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Plan</th>
                <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Concepto</th>
                <th className="text-right px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Monto</th>
                <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Fecha Pago</th>
                <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Vencimiento</th>
                <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Estado</th>
                <th className="px-6 py-5" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-text-sub-light text-sm">
                    No hay pagos registrados. Agrega el primero con el botón de arriba.
                  </td>
                </tr>
              ) : (
                filtered.map((pago) => (
                  <tr
                    key={pago.id}
                    className="border-b border-border-light dark:border-border-dark last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all group"
                  >
                    <td className="px-8 py-5">
                      <p className="font-black text-sm">{pago.empresa_nombre || `Empresa #${pago.empresa_id}`}</p>
                      {pago.referencia && <p className="text-[10px] text-text-sub-light mt-0.5">Ref: {pago.referencia}</p>}
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-text-sub-light">{pago.plan_nombre || '—'}</td>
                    <td className="px-6 py-5 text-sm text-text-sub-light">{pago.concepto || '—'}</td>
                    <td className="px-6 py-5 text-right font-black text-sm">{fmtGs(pago.monto)}</td>
                    <td className="px-6 py-5 text-sm text-text-sub-light">{fmt(pago.fecha_pago)}</td>
                    <td className="px-6 py-5 text-sm text-text-sub-light">{fmt(pago.fecha_vencimiento)}</td>
                    <td className="px-6 py-5">
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${ESTADO_STYLES[pago.estado] || ESTADO_STYLES.pendiente}`}>
                        {pago.estado}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        {pago.estado !== 'pagado' && (
                          <button
                            onClick={() => handleMarkPaid(pago)}
                            title="Marcar como pagado"
                            className="size-9 rounded-xl bg-green-100 dark:bg-green-900/20 text-green-600 flex items-center justify-center hover:scale-105 transition-all"
                          >
                            <span className="material-symbols-outlined text-[18px]">check</span>
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(pago)}
                          title="Editar"
                          className="size-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-primary flex items-center justify-center transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(pago.id)}
                          title="Eliminar"
                          className="size-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-red-500 flex items-center justify-center transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[40px] p-10 space-y-5 overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-2xl font-black">{editingPago ? 'Editar Pago' : 'Registrar Pago'}</h2>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Empresa *</label>
              <select
                required
                value={form.empresa_id}
                onChange={e => setForm({ ...form, empresa_id: e.target.value })}
                className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
              >
                <option value="">Selecciona una empresa...</option>
                {empresas.map(e => (
                  <option key={e.empresa_id} value={e.empresa_id}>{e.nombre}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Plan</label>
                <select
                  value={form.plan_id}
                  onChange={e => setForm({ ...form, plan_id: e.target.value })}
                  className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
                >
                  <option value="">Sin especificar</option>
                  {planes.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Estado</label>
                <select
                  value={form.estado}
                  onChange={e => setForm({ ...form, estado: e.target.value })}
                  className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="pagado">Pagado</option>
                  <option value="vencido">Vencido</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Monto (₲ Guaraníes) *</label>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.monto}
                onChange={e => setForm({ ...form, monto: e.target.value })}
                placeholder="0"
                className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Fecha de Pago</label>
                <input
                  type="date"
                  value={form.fecha_pago}
                  onChange={e => setForm({ ...form, fecha_pago: e.target.value })}
                  className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Fecha Vencimiento</label>
                <input
                  type="date"
                  value={form.fecha_vencimiento}
                  onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })}
                  className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Concepto</label>
              <input
                value={form.concepto}
                onChange={e => setForm({ ...form, concepto: e.target.value })}
                placeholder="Ej: Suscripción mensual Plan Pro - Marzo 2026"
                className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Referencia / Nro. Transacción</label>
              <input
                value={form.referencia}
                onChange={e => setForm({ ...form, referencia: e.target.value })}
                placeholder="Ej: TXN-2026-001"
                className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 font-bold dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">Notas internas</label>
              <textarea
                value={form.notas}
                onChange={e => setForm({ ...form, notas: e.target.value })}
                rows={2}
                placeholder="Notas adicionales..."
                className="w-full py-3 px-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl font-bold dark:text-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-16 bg-primary text-white font-black uppercase rounded-2xl shadow-xl shadow-primary/30 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : (editingPago ? 'Actualizar' : 'Registrar Pago')}
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

export default Billing;
