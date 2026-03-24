
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../services/api';

const fmtGs = (amount) => {
  const n = Math.round(Number(amount));
  return `₲ ${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ESTADO_STYLES = {
  pagado:    'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  pendiente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  vencido:   'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',
};

const ClientBilling = () => {
  const { user } = useAuth();
  // empresa_id puede estar directo o anidado en empresa.id
  const empresaId = user?.empresa_id || user?.empresa?.id;

  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    loadPagos();
  }, [empresaId]);

  const loadPagos = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getPagos(empresaId);
      setPagos(res.data || []);
    } catch {
      // El endpoint de admin puede devolver 401 para clientes — historial vacío
      setPagos([]);
    } finally {
      setLoading(false);
    }
  };

  // Datos del plan tomados del contexto de auth (sin llamada admin)
  const empresa = user?.empresa || {};
  const planNombre   = empresa.plan_nombre || empresa.nombre_plan || user?.plan_nombre || 'Starter';
  const planPrecioCtx = empresa.precio_plan ?? empresa.plan_precio ?? null;
  const planMaxContactos = empresa.max_contactos ?? empresa.max_clientes ?? null;
  const planMaxUsuarios  = empresa.max_usuarios ?? null;
  const planDescripcion  = empresa.descripcion_plan || null;

  const totalPagado = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + Number(p.monto), 0);
  const totalPendiente = pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + Number(p.monto), 0);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10 pb-20">

      {/* Header */}
      <div>
        <h1 className="text-4xl font-black">Mi Plan & Pagos</h1>
        <p className="text-text-sub-light mt-2 text-lg">Revisá tu plan activo e historial de pagos.</p>
      </div>

      {/* Plan activo */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-border-light dark:border-border-dark pb-4">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <span className="material-symbols-outlined filled">star</span>
          </div>
          <h3 className="text-xl font-black">Plan Activo</h3>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border-2 border-primary/30 p-8 flex flex-col md:flex-row gap-8 items-start">
          <div className="size-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/25 shrink-0">
            <span className="material-symbols-outlined text-2xl">diamond</span>
          </div>
          <div className="flex-1 space-y-5">
            <div>
              <h3 className="text-2xl font-black">{planNombre}</h3>
              <p className="text-text-sub-light text-sm mt-1">
                {planDescripcion || 'Tu plan actual en ConectaCRM.'}
              </p>
            </div>

            <div className="flex items-baseline gap-2">
              {planPrecioCtx !== null ? (
                planPrecioCtx === 0 ? (
                  <span className="text-3xl font-black text-green-600">Gratis</span>
                ) : (
                  <>
                    <span className="text-3xl font-black text-primary">{fmtGs(planPrecioCtx)}</span>
                    <span className="text-text-sub-light text-sm font-bold">/mes</span>
                  </>
                )
              ) : (
                <span className="inline-flex items-center gap-2 text-sm font-bold text-text-sub-light bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-xl">
                  <span className="material-symbols-outlined text-[16px] text-amber-500">schedule</span>
                  Precio disponible próximamente
                </span>
              )}
            </div>

            {(planMaxContactos !== null || planMaxUsuarios !== null) && (
              <div className="grid grid-cols-2 gap-4">
                {planMaxContactos !== null && (
                  <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-text-sub-light uppercase tracking-widest mb-1">Contactos</p>
                    <p className="text-xl font-black">
                      {Number(planMaxContactos) >= 99999 ? 'Ilimitado' : planMaxContactos}
                    </p>
                  </div>
                )}
                {planMaxUsuarios !== null && (
                  <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-text-sub-light uppercase tracking-widest mb-1">Usuarios</p>
                    <p className="text-xl font-black">{planMaxUsuarios}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Resumen rápido (si hay pagos) */}
      {(totalPagado > 0 || totalPendiente > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {totalPagado > 0 && (
            <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-3xl flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-white/60 dark:bg-black/20 flex items-center justify-center text-green-600">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-text-sub-light tracking-widest">Total Pagado</p>
                <p className="text-2xl font-black text-green-600 mt-1">{fmtGs(totalPagado)}</p>
              </div>
            </div>
          )}
          {totalPendiente > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-white/60 dark:bg-black/20 flex items-center justify-center text-amber-600">
                <span className="material-symbols-outlined text-3xl">schedule</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-text-sub-light tracking-widest">Pendiente de Pago</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{fmtGs(totalPendiente)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Método de pago — Próximamente */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-border-light dark:border-border-dark pb-4">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <span className="material-symbols-outlined filled">credit_card</span>
          </div>
          <h3 className="text-xl font-black">Método de Pago</h3>
          <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-widest">
            Próximamente
          </span>
        </div>

        <div className="relative rounded-3xl overflow-hidden border border-border-light dark:border-border-dark">
          {/* Overlay "próximamente" */}
          <div className="absolute inset-0 bg-white/85 dark:bg-gray-900/85 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="size-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-amber-500">construction</span>
            </div>
            <div>
              <p className="font-black text-xl">Próximamente disponible</p>
              <p className="text-text-sub-light text-sm mt-2 max-w-sm">
                Muy pronto podrás gestionar tu suscripción y realizar pagos en Guaraníes directamente desde aquí.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-text-sub-light font-bold">
              <span className="material-symbols-outlined text-[16px] text-primary">info</span>
              Los pagos actualmente se gestionan con el equipo de ConectaCRM.
            </div>
          </div>

          {/* Preview deshabilitado */}
          <div className="bg-surface-light dark:bg-surface-dark p-8 space-y-5 opacity-30 pointer-events-none select-none" style={{ minHeight: 220 }}>
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-text-sub-light tracking-widest">Método registrado</p>
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px] text-text-sub-light">credit_card</span>
                  </div>
                  <p className="font-black">•••• •••• •••• 0000</p>
                </div>
              </div>
              <button className="bg-primary text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest">
                Cambiar
              </button>
            </div>
            <div className="h-px bg-border-light dark:bg-border-dark" />
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-text-sub-light tracking-widest">Próximo cobro</p>
                <p className="font-black text-lg">{planPrecioCtx > 0 ? fmtGs(planPrecioCtx) : '₲ —'} / mes</p>
              </div>
              <button className="bg-primary text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest">
                Pagar ahora
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Historial de pagos */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-border-light dark:border-border-dark pb-4">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <span className="material-symbols-outlined filled">receipt_long</span>
          </div>
          <h3 className="text-xl font-black">Historial de Pagos</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : pagos.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-border-light dark:border-border-dark p-16 flex flex-col items-center gap-4 text-center">
            <div className="size-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-text-sub-light">receipt_long</span>
            </div>
            <p className="font-black text-lg">Sin historial de pagos</p>
            <p className="text-text-sub-light text-sm max-w-xs">
              Aquí aparecerán tus pagos registrados. Cuando el sistema de cobro esté activo, verás todos los comprobantes acá.
            </p>
          </div>
        ) : (
          <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark">
                  <th className="text-left px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Concepto</th>
                  <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-sub-light hidden md:table-cell">Plan</th>
                  <th className="text-right px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Monto</th>
                  <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-sub-light hidden lg:table-cell">Fecha</th>
                  <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-sub-light hidden lg:table-cell">Vencimiento</th>
                  <th className="text-left px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => (
                  <tr
                    key={pago.id}
                    className="border-b border-border-light dark:border-border-dark last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all"
                  >
                    <td className="px-8 py-5">
                      <p className="font-black text-sm">{pago.concepto || '—'}</p>
                      {pago.referencia && (
                        <p className="text-[10px] text-text-sub-light mt-0.5">Ref: {pago.referencia}</p>
                      )}
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-text-sub-light hidden md:table-cell">
                      {pago.plan_nombre || '—'}
                    </td>
                    <td className="px-6 py-5 text-right font-black text-sm">
                      {fmtGs(pago.monto)}
                    </td>
                    <td className="px-6 py-5 text-sm text-text-sub-light hidden lg:table-cell">
                      {fmt(pago.fecha_pago)}
                    </td>
                    <td className="px-6 py-5 text-sm text-text-sub-light hidden lg:table-cell">
                      {fmt(pago.fecha_vencimiento)}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${ESTADO_STYLES[pago.estado] || ESTADO_STYLES.pendiente}`}>
                        {pago.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ClientBilling;
