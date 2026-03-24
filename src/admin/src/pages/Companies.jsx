import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';

const Companies = ({ onImpersonate }) => {
  const [empresas, setEmpresas] = useState([]);
  const [users, setUsers] = useState({});          // keyed by companyId
  const [userErrors, setUserErrors] = useState({}); // keyed by companyId
  const [expandedId, setExpandedId] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState({});  // keyed by companyId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  const [companyModal, setCompanyModal] = useState({ open: false, company: null });
  const [userModal, setUserModal] = useState({ open: false, user: null, companyId: null });
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [planes, setPlanes] = useState([]);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null); // { userId, companyId }

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ============================================
  // CARGAR DATOS INICIALES
  // ============================================
  useEffect(() => {
    loadempresas();
    api.admin.getPlans().then(res => {
      const list = Array.isArray(res) ? res : (res?.data ?? res?.planes ?? []);
      setPlanes(list);
    }).catch(() => {});
  }, []);

  const loadempresas = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getCompanies();
      setEmpresas(response.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error cargando empresas');
      console.error('Error loading empresas:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // USUARIOS - CARGAR
  // ============================================
  const loadUsersForCompany = async (companyId) => {
    setLoadingUsers(prev => ({ ...prev, [companyId]: true }));
    setUserErrors(prev => ({ ...prev, [companyId]: null }));
    try {
      const response = await api.admin.getUsers(companyId);
      const list = response.data || response || [];
      setUsers(prev => ({ ...prev, [companyId]: Array.isArray(list) ? list : [] }));
    } catch (err) {
      console.error('Error loading users for company', companyId, err);
      const msg = err.response?.data?.message || `Error ${err.response?.status || ''}: no se pudieron cargar los usuarios`;
      setUserErrors(prev => ({ ...prev, [companyId]: msg }));
      setUsers(prev => ({ ...prev, [companyId]: [] }));
    } finally {
      setLoadingUsers(prev => ({ ...prev, [companyId]: false }));
    }
  };

  const fetchRoles = async () => {
    if (roles.length > 0) return;
    setLoadingRoles(true);
    try {
      const data = await api.client.getRoles();
      const list = Array.isArray(data) ? data : (data.roles ?? data.data ?? []);
      setRoles(list);
    } catch (err) {
      console.warn('No se pudieron cargar roles, usando valores por defecto');
      setRoles([{ id: 1, nombre: 'Admin' }, { id: 2, nombre: 'Agente' }, { id: 3, nombre: 'Supervisor' }]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const openUserModal = (user, companyId) => {
    setModalError('');
    fetchRoles();
    setUserModal({ open: true, user, companyId });
  };

  const handleToggleExpand = (companyId) => {
    if (expandedId === companyId) {
      setExpandedId(null);
    } else {
      setExpandedId(companyId);
      // Only load if not already loaded
      if (!users[companyId]) {
        loadUsersForCompany(companyId);
      }
    }
  };

  // ============================================
  // EMPRESAS - CRUD
  // ============================================
  const handleSaveCompany = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setModalError('');
    setSaving(true);

    const data = {
      nombre:          formData.get('nombre'),
      nombre_url:      formData.get('nombre_url'),
      plan_id:         parseInt(formData.get('plan_id')),
      logo:            formData.get('logo') || null,
      color_primario:  formData.get('color_primario') || '#2563eb',
      estado:          formData.get('estado') || 'activo',
      sector:          formData.get('sector') || null,
    };

    try {
      if (companyModal.company) {
        await api.admin.updateCompany(cid(companyModal.company), data);
        showToast('success', 'Empresa actualizada correctamente');
      } else {
        await api.admin.createCompany(data);
        showToast('success', 'Empresa creada correctamente');
      }
      setCompanyModal({ open: false, company: null });
      loadempresas();
    } catch (err) {
      setModalError(err.response?.data?.message || `Error ${err.response?.status || ''}: no se pudo guardar`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar esta empresa? Esto eliminará todos sus datos.')) {
      return;
    }
    try {
      await api.admin.deleteCompany(id);
      showToast('success', 'Empresa eliminada');
      loadempresas();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Error eliminando empresa');
    }
  };

  // ============================================
  // USUARIOS - CRUD
  // ============================================
  const handleSaveUser = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const companyId = userModal.companyId;
    setModalError('');
    setSaving(true);

    const data = {
      // tabla usuarios (login)
      email:        fd.get('email'),
      tipo_usuario: fd.get('tipo_usuario') || 'usuario_empresa',
      // tabla usuario_empresa (perfil)
      nombre:       fd.get('nombre'),
      apellido:     fd.get('apellido') || '',
      telefono:     fd.get('telefono') || '',
      rol:          fd.get('rol') || 'Agente',
      notas:        fd.get('notas') || '',
    };

    const pw = fd.get('password');
    if (pw) data.password = pw;

    try {
      if (userModal.user) {
        const userId = userModal.user.usuarios_id ?? userModal.user.id;
        await api.admin.updateUser(companyId, userId, data);
        showToast('success', 'Usuario actualizado correctamente');
      } else {
        await api.admin.createUser(companyId, data);
        showToast('success', 'Usuario creado correctamente');
      }
      setUserModal({ open: false, user: null, companyId: null });
      loadUsersForCompany(companyId);
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.error
        || (err.response?.status === 409 ? 'Ya existe un usuario con ese email' : null)
        || (err.response?.status === 401 ? 'Sin autorización — volvé a iniciar sesión' : null)
        || `Error ${err.response?.status || ''}: no se pudo guardar el usuario`;
      setModalError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId, companyId) => {
    try {
      await api.admin.deleteUser(userId, companyId);
      setUsers(prev => ({
        ...prev,
        [companyId]: (prev[companyId] || []).filter(
          u => (u.usuarios_id ?? u.id) !== userId
        ),
      }));
      setConfirmDeleteUser(null);
      showToast('success', 'Usuario eliminado');
    } catch (err) {
      setConfirmDeleteUser(null);
      showToast('error', err.response?.data?.message || 'Error eliminando usuario');
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  // Backend uses empresa_id as PK (not id)
  const cid = (company) => company?.empresa_id ?? company?.id;

  const getInitial = (name) => {
    return name ? name[0].toUpperCase() : '?';
  };

  const getAvatarColor = (index) => {
    const colors = [
      'bg-indigo-100 text-indigo-600',
      'bg-blue-100 text-blue-600',
      'bg-purple-100 text-purple-600',
      'bg-pink-100 text-pink-600',
      'bg-green-100 text-green-600',
    ];
    return colors[index % colors.length];
  };

  const getPlanName = (planId) => {
    const found = planes.find(p => p.id === planId || p.id === Number(planId));
    return found?.nombre ?? found?.name ?? '—';
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-sub-light">Cargando empresas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl">
          <p className="font-bold">Error: {error}</p>
          <button onClick={loadempresas} className="mt-4 text-sm underline">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1440px] mx-auto space-y-10">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
          toast.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black">Gestión de Empresas</h1>
        <button
          onClick={() => setCompanyModal({ open: true, company: null })}
          className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Nueva Empresa
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-[40px] border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-text-sub-light tracking-widest">
                Cliente
              </th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-text-sub-light tracking-widest">
                Plan
              </th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-text-sub-light tracking-widest">
                Sector
              </th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-text-sub-light tracking-widest">
                Estado
              </th>
              <th className="px-8 py-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {empresas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-text-sub-light">
                  No hay empresas registradas. Crea una nueva empresa para comenzar.
                </td>
              </tr>
            ) : (
              empresas.map((company, index) => (
                <React.Fragment key={cid(company) ?? index}>
                  <tr className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div
                          className={`size-12 rounded-2xl ${getAvatarColor(index)} flex items-center justify-center font-black`}
                        >
                          {getInitial(company.nombre)}
                        </div>
                        <div>
                          <p className="font-bold text-text-main-light dark:text-white leading-none">
                            {company.nombre}
                          </p>
                          <p className="text-xs text-text-sub-light mt-1">
                            {company.nombre_url}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-lg">
                        {company.plan_nombre || getPlanName(company.plan_id)}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs text-text-sub-light">
                        {company.sector ?? '—'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg ${
                          company.estado === 'activo'   ? 'bg-green-100 text-green-600'
                          : company.estado === 'suspendido' ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {company.estado}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onImpersonate && onImpersonate(company)}
                          className="bg-primary text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl flex items-center gap-2 hover:scale-105 transition-all"
                          title="Acceder como esta empresa"
                        >
                          <span className="material-symbols-outlined text-[16px]">login</span>
                          Acceder
                        </button>
                        <button
                          onClick={() => setCompanyModal({ open: true, company })}
                          className="size-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-primary flex items-center justify-center transition-all"
                          title="Editar empresa"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(cid(company))}
                          className="size-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-red-500 flex items-center justify-center transition-all"
                          title="Eliminar empresa"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                        <button
                          onClick={() => handleToggleExpand(cid(company))}
                          className={`size-9 rounded-xl flex items-center justify-center transition-all ${
                            expandedId === cid(company)
                              ? 'bg-text-main-light text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-text-sub-dark'
                          }`}
                          title="Ver usuarios"
                        >
                          <span className="material-symbols-outlined">
                            {expandedId === cid(company) ? 'expand_less' : 'group'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* USUARIOS DE LA EMPRESA */}
                  {expandedId === cid(company) && (
                    <tr>
                      <td colSpan={5} className="px-8 py-8 bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="text-[10px] font-black uppercase text-text-sub-light tracking-widest">
                            Personal de {company.nombre}
                          </h4>
                          <button
                            onClick={() => openUserModal(null, cid(company))}
                            className="text-primary text-[10px] font-black uppercase hover:underline flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Añadir Usuario
                          </button>
                        </div>

                        {loadingUsers[cid(company)] ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        ) : userErrors[cid(company)] ? (
                          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                            <span className="material-symbols-outlined text-[18px]">warning</span>
                            <span>{userErrors[cid(company)]}</span>
                            <button
                              onClick={() => loadUsersForCompany(cid(company))}
                              className="ml-auto underline font-semibold"
                            >
                              Reintentar
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {!users[cid(company)] || users[cid(company)].length === 0 ? (
                              <p className="text-text-sub-light text-sm col-span-full text-center py-8">
                                No hay usuarios asociados a esta empresa.
                              </p>
                            ) : (
                              users[cid(company)].map((user, uIdx) => {
                                const uid = user.usuarios_id ?? user.id;
                                return (
                                  <div
                                    key={uid ?? uIdx}
                                    className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-border-light dark:border-border-dark shadow-sm flex flex-col gap-3"
                                  >
                                    {/* Info del usuario */}
                                    <div className="flex items-center gap-3">
                                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs flex-shrink-0">
                                        {getInitial(user.nombre)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate text-text-main-light dark:text-white">
                                          {user.nombre} {user.apellido || ''}
                                        </p>
                                        <p className="text-[10px] text-text-sub-light truncate">{user.email || ''}</p>
                                        <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase rounded">
                                          {user.rol || user.tipo_usuario}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Confirmación de eliminación */}
                                    {confirmDeleteUser?.userId === uid && confirmDeleteUser?.companyId === cid(company) ? (
                                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                                        <p className="text-xs text-red-700 dark:text-red-400 font-semibold mb-2">
                                          ¿Eliminar a <strong>{user.nombre}</strong>? Esta acción no se puede deshacer.
                                        </p>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleDeleteUser(uid, cid(company))}
                                            className="flex-1 h-8 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase rounded-lg transition-colors"
                                          >
                                            Sí, eliminar
                                          </button>
                                          <button
                                            onClick={() => setConfirmDeleteUser(null)}
                                            className="flex-1 h-8 bg-gray-100 dark:bg-gray-800 text-text-sub-light text-[11px] font-black uppercase rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* Botones de acción siempre visibles */
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => openUserModal(user, cid(company))}
                                          className="flex-1 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1 text-[11px] font-semibold"
                                        >
                                          <span className="material-symbols-outlined text-[14px]">edit</span>
                                          Editar
                                        </button>
                                        <button
                                          onClick={() => setConfirmDeleteUser({ userId: uid, companyId: cid(company) })}
                                          className="flex-1 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-1 text-[11px] font-semibold"
                                        >
                                          <span className="material-symbols-outlined text-[14px]">delete</span>
                                          Eliminar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL EMPRESA */}
      {companyModal.open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSaveCompany}
            className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[40px] p-10 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">
                {companyModal.company ? 'Editar' : 'Nueva'} Empresa
              </h2>
              <button type="button" onClick={() => { setCompanyModal({ open: false, company: null }); setModalError(''); }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-sub-light">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {modalError && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {modalError}
              </div>
            )}
            <div className="space-y-4">
              <input
                name="nombre"
                required
                defaultValue={companyModal.company?.nombre}
                placeholder="Nombre de la empresa..."
                className="w-full h-14 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-5 font-bold"
              />
              <input
                name="nombre_url"
                required
                defaultValue={companyModal.company?.nombre_url}
                placeholder="Nombre URL (ej: techflow)..."
                className="w-full h-14 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-5 font-bold"
              />
              <select
                name="plan_id"
                defaultValue={companyModal.company?.plan_id ?? ''}
                className="w-full h-14 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-5 font-bold dark:text-white"
              >
                <option value="" disabled>Seleccionar plan...</option>
                {planes.length > 0
                  ? planes.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre ?? p.name}</option>
                    ))
                  : <option disabled>Cargando planes...</option>
                }
              </select>
              <input
                name="sector"
                defaultValue={companyModal.company?.sector ?? ''}
                placeholder="Sector / industria (ej: Retail, Salud...)"
                className="w-full h-14 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-5 font-bold dark:text-white"
              />
              <select
                name="estado"
                defaultValue={companyModal.company?.estado || 'activo'}
                className="w-full h-14 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl px-5 font-bold dark:text-white"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="suspendido">Suspendido</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full h-16 bg-primary text-white font-black uppercase rounded-2xl shadow-xl hover:scale-105 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Guardar Empresa
            </button>
            <button
              type="button"
              onClick={() => { setCompanyModal({ open: false, company: null }); setModalError(''); }}
              className="w-full text-xs font-black uppercase text-text-sub-light hover:underline"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* MODAL USUARIO */}
      {userModal.open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSaveUser}
            className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[40px] p-10 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">
                {userModal.user ? 'Editar' : 'Nuevo'} Usuario
              </h2>
              <button type="button" onClick={() => { setUserModal({ open: false, user: null, companyId: null }); setModalError(''); }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-sub-light">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {modalError && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {modalError}
              </div>
            )}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">

              {/* Nombre + Apellido */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1 px-1">Nombre *</label>
                  <input
                    name="nombre"
                    required
                    defaultValue={userModal.user?.nombre}
                    placeholder="Ej: María"
                    className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1 px-1">Apellido</label>
                  <input
                    name="apellido"
                    defaultValue={userModal.user?.apellido}
                    placeholder="Ej: González"
                    className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 dark:text-white"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1 px-1">Email *</label>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={userModal.user?.email}
                  placeholder="maria@empresa.com"
                  className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 dark:text-white"
                />
              </div>

              {/* Password (solo al crear) */}
              {!userModal.user && (
                <div>
                  <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1 px-1">Contraseña temporal *</label>
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="Mín. 8 caracteres"
                    className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 dark:text-white"
                  />
                  <p className="text-[10px] text-text-sub-light mt-1 px-1">El usuario recibirá esta contraseña por email.</p>
                </div>
              )}

              {/* Teléfono */}
              <div>
                <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1 px-1">Teléfono</label>
                <input
                  name="telefono"
                  type="tel"
                  defaultValue={userModal.user?.telefono}
                  placeholder="+595 9xx xxx xxx"
                  className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 dark:text-white"
                />
              </div>

              {/* Rol en empresa + Tipo de usuario */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1 px-1">Rol en empresa</label>
                  <select
                    name="rol"
                    defaultValue={userModal.user?.rol || 'Agente'}
                    disabled={loadingRoles}
                    className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 dark:text-white disabled:opacity-60"
                  >
                    {loadingRoles && <option>Cargando...</option>}
                    {roles.map(r => (
                      <option key={r.id ?? r.nombre} value={r.nombre}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1 px-1">Tipo acceso</label>
                  <select
                    name="tipo_usuario"
                    defaultValue={userModal.user?.tipo_usuario || 'usuario_empresa'}
                    className="w-full h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 dark:text-white"
                  >
                    <option value="admin_empresa">Admin empresa</option>
                    <option value="usuario_empresa">Usuario empresa</option>
                  </select>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1 px-1">Notas internas</label>
                <textarea
                  name="notas"
                  rows={2}
                  defaultValue={userModal.user?.notas}
                  placeholder="Notas opcionales sobre este usuario..."
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 resize-none dark:text-white"
                />
              </div>

            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full h-16 bg-primary text-white font-black uppercase rounded-2xl shadow-xl hover:scale-105 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Guardar Usuario
            </button>
            <button
              type="button"
              onClick={() => { setUserModal({ open: false, user: null, companyId: null }); setModalError(''); }}
              className="w-full text-xs font-black uppercase text-text-sub-light hover:underline"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Companies;
