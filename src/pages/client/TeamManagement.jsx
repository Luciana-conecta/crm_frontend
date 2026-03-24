import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { clientAPI } from '../../services/api';

const normalizeM = (m) => ({
  id: String(m.id ?? m.id_usuario ?? m.usuario_id ?? m.usuarios_id ?? ''),
  companyId: String(m.empresa_id ?? ''),
  name: m.nombre ?? m.name ?? '',
  apellido: m.apellido ?? '',
  email: m.email ?? '',
  telefono: m.telefono ?? '',
  role: m.rol ?? m.role ?? 'Agente',
  tipoUsuario: m.tipo_usuario ?? 'usuario_empresa',
  status: m.estado ?? m.status ?? 'Activo',
  lastAccess: m.ultimo_acceso ?? m.lastAccess ?? null,
  avatarUrl: m.avatar_url ?? m.avatarUrl ?? '',
  notas: m.notas ?? '',
});

const getInitials = (name, apellido = '') => {
  const full = `${name || ''} ${apellido || ''}`.trim();
  return full ? full.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
};

const AVATAR_COLORS = [
  'bg-primary/20 text-primary',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
];

const TeamManagement = () => {
  const { user, impersonatedEmpresa } = useAuth();

  const extractId = (v) => {
    if (v == null) return null;
    if (typeof v === 'object') return v.empresa_id ?? v.id ?? v.id_empresa ?? null;
    return v;
  };
  const empresaId = extractId(impersonatedEmpresa)
    || extractId(user?.empresa_id)
    || user?.empresa?.id
    || localStorage.getItem('crm_empresa_id');

  // ── Estado ────────────────────────────────────────────────────────────────
  const [members, setMembers]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [toast, setToast]                   = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [saving, setSaving]                 = useState(false);
  const [formError, setFormError]           = useState('');

  const [roles, setRoles]                   = useState([]);
  const [loadingRoles, setLoadingRoles]     = useState(false);

  const fileInputRef = useRef(null);

  const emptyForm = {
    name: '', apellido: '', email: '', password: '',
    telefono: '', role: '', tipoUsuario: 'usuario_empresa',
    status: 'Activo', avatarUrl: '', notas: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Carga de equipo ────────────────────────────────────────────────────────
  const fetchTeam = useCallback(async () => {
    if (!empresaId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await clientAPI.getTeamMembers(empresaId);
      const list = Array.isArray(data)
        ? data
        : (data.data ?? data.members ?? data.usuarios ?? data.equipo ?? data.users ?? []);
      setMembers(list.map(normalizeM));
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setError('Sesión expirada. Volvé a iniciar sesión.');
      } else {
        setError(err.response?.data?.message || 'No se pudo cargar el equipo.');
      }
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  // ── Roles ─────────────────────────────────────────────────────────────────
  const fetchRoles = async () => {
    if (roles.length > 0) return;
    setLoadingRoles(true);
    try {
      const data = await clientAPI.getRoles();
      const list = Array.isArray(data) ? data : (data.roles ?? data.data ?? []);
      setRoles(list.length > 0 ? list : [{ id: 1, nombre: 'Admin' }, { id: 2, nombre: 'Agente' }, { id: 3, nombre: 'Supervisor' }]);
    } catch {
      setRoles([{ id: 1, nombre: 'Admin' }, { id: 2, nombre: 'Agente' }, { id: 3, nombre: 'Supervisor' }]);
    } finally {
      setLoadingRoles(false);
    }
  };

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openModal = (member = null) => {
    setFormError('');
    fetchRoles();
    if (member) {
      setEditingMemberId(member.id);
      setFormData({
        name: member.name, apellido: member.apellido, email: member.email,
        password: '', telefono: member.telefono, role: member.role,
        tipoUsuario: member.tipoUsuario, status: member.status,
        avatarUrl: member.avatarUrl, notas: member.notas,
      });
    } else {
      setEditingMemberId(null);
      setFormData(emptyForm);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMemberId(null);
    setFormError('');
    setFormData(emptyForm);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, avatarUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        nombre: formData.name, apellido: formData.apellido,
        email: formData.email, telefono: formData.telefono,
        rol: formData.role, tipo_usuario: formData.tipoUsuario,
        estado: formData.status, avatar_url: formData.avatarUrl,
        notas: formData.notas,
      };
      if (!editingMemberId && formData.password) payload.password = formData.password;

      if (editingMemberId) {
        const updated = await clientAPI.updateTeamMember(empresaId, editingMemberId, payload);
        setMembers(prev => prev.map(m =>
          m.id === editingMemberId ? normalizeM({ ...m, ...updated }) : m
        ));
        showToast('success', 'Usuario actualizado correctamente');
      } else {
        const created = await clientAPI.createTeamMember(empresaId, payload);
        setMembers(prev => [normalizeM(created), ...prev]);
        showToast('success', 'Usuario creado y notificado por email');
      }
      closeModal();
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.error
        || (err.response?.status === 409 ? 'Ya existe un usuario con ese email' : null)
        || (err.response?.status === 401 ? 'Sin autorización — volvé a iniciar sesión' : null)
        || 'Error al guardar. Intenta de nuevo.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await clientAPI.deleteTeamMember(empresaId, id);
      setMembers(prev => prev.filter(m => m.id !== id));
      setConfirmDeleteId(null);
      showToast('success', 'Usuario eliminado');
    } catch (err) {
      setConfirmDeleteId(null);
      showToast('error', err.response?.data?.message || 'Error al eliminar');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto pb-20 font-display">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-300 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-main-light dark:text-white">Gestión de Equipo</h1>
          <p className="text-text-sub-light dark:text-gray-400 text-sm mt-0.5">
            Usuarios vinculados a tu empresa · {members.length} miembro{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white h-11 px-6 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Nuevo usuario
        </button>
      </div>

      {/* Sin empresaId */}
      {!empresaId && !loading && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-5 py-4 rounded-xl text-sm flex items-center gap-3">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          No se pudo identificar la empresa. Volvé a iniciar sesión.
        </div>
      )}

      {/* Tabla */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">

        {/* Loading */}
        {loading && (
          <div className="p-16 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary" />
            <p className="text-text-sub-light text-sm">Cargando equipo...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-12 flex flex-col items-center gap-4 text-center">
            <span className="material-symbols-outlined text-[48px] text-red-300">error</span>
            <p className="text-red-500 font-semibold text-sm">{error}</p>
            <button onClick={fetchTeam} className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold">
              Reintentar
            </button>
          </div>
        )}

        {/* Vacío */}
        {!loading && !error && members.length === 0 && (
          <div className="p-16 flex flex-col items-center gap-4 text-center">
            <span className="material-symbols-outlined text-[56px] text-gray-200 dark:text-gray-700">group</span>
            <div>
              <p className="font-bold text-text-main-light dark:text-white">No hay usuarios registrados</p>
              <p className="text-sm text-text-sub-light mt-1">Agregá el primer miembro de tu equipo</p>
            </div>
            <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-sm">
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              Agregar usuario
            </button>
          </div>
        )}

        {/* Tabla de miembros */}
        {!loading && !error && members.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-border-light dark:border-border-dark">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Usuario</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Rol</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Teléfono</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-sub-light">Último acceso</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-text-sub-light">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {members.map((member, idx) => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors">
                    {/* Usuario */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt=""
                            className="size-10 rounded-full object-cover border border-border-light"
                          />
                        ) : (
                          <div className={`size-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                            {getInitials(member.name, member.apellido)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-text-main-light dark:text-white leading-tight">
                            {member.name} {member.apellido}
                          </p>
                          <p className="text-xs text-text-sub-light dark:text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg uppercase">
                        {member.role || '—'}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full flex-shrink-0 ${
                          member.status === 'Activo' ? 'bg-green-500 animate-pulse' :
                          member.status === 'Ausente' ? 'bg-amber-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-xs font-semibold text-text-main-light dark:text-gray-300">{member.status}</span>
                      </div>
                    </td>

                    {/* Teléfono */}
                    <td className="px-6 py-4 text-xs text-text-sub-light dark:text-gray-400">
                      {member.telefono || '—'}
                    </td>

                    {/* Último acceso */}
                    <td className="px-6 py-4 text-xs text-text-sub-light dark:text-gray-400">
                      {member.lastAccess
                        ? new Date(member.lastAccess).toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Nunca'}
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4">
                      {confirmDeleteId === member.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-red-600 font-semibold">¿Eliminar?</span>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors"
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-8 px-3 bg-gray-100 dark:bg-gray-800 text-text-sub-light text-[11px] font-bold rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openModal(member)}
                            className="size-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center"
                            title="Editar usuario"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(member.id)}
                            className="size-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center"
                            title="Eliminar usuario"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL ──────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">

            {/* Header modal */}
            <div className="px-7 py-5 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-lg font-black text-text-main-light dark:text-white">
                {editingMemberId ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-text-sub-light transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-7 space-y-4">

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="size-16 rounded-2xl bg-gray-100 dark:bg-gray-900 bg-cover bg-center border-2 border-border-light cursor-pointer relative overflow-hidden group flex items-center justify-center flex-shrink-0"
                  style={{ backgroundImage: formData.avatarUrl ? `url(${formData.avatarUrl})` : '' }}
                >
                  {!formData.avatarUrl && (
                    <span className="material-symbols-outlined text-2xl text-gray-400">add_a_photo</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-lg">upload</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-main-light dark:text-white">Foto de perfil</p>
                  <p className="text-xs text-text-sub-light">Opcional · JPG, PNG</p>
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {formError}
                </div>
              )}

              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">

                {/* Nombre + Apellido */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1">Nombre *</label>
                    <input
                      required
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ej: Sofía"
                      className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1">Apellido</label>
                    <input
                      value={formData.apellido}
                      onChange={e => setFormData(p => ({ ...p, apellido: e.target.value }))}
                      placeholder="Ej: Ruiz"
                      className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 dark:text-white"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="sofia@empresa.com"
                    className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 dark:text-white"
                  />
                </div>

                {/* Contraseña (solo al crear) */}
                {!editingMemberId && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1">Contraseña temporal *</label>
                    <input
                      required
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                      placeholder="Mín. 8 caracteres"
                      className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 dark:text-white"
                    />
                    <p className="text-[10px] text-text-sub-light mt-1">El usuario recibirá esta contraseña por email.</p>
                  </div>
                )}

                {/* Teléfono */}
                <div>
                  <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={e => setFormData(p => ({ ...p, telefono: e.target.value }))}
                    placeholder="+595 9xx xxx xxx"
                    className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 dark:text-white"
                  />
                </div>

                {/* Rol + Estado */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1">Rol</label>
                    <select
                      value={formData.role}
                      onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                      disabled={loadingRoles}
                      className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 dark:text-white disabled:opacity-50"
                    >
                      {loadingRoles
                        ? <option>Cargando...</option>
                        : roles.map(r => <option key={r.id ?? r.nombre} value={r.nombre}>{r.nombre}</option>)
                      }
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1">Estado</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
                      className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 dark:text-white"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Ausente">Ausente</option>
                      <option value="Pendiente">Pendiente</option>
                    </select>
                  </div>
                </div>

                {/* Tipo de acceso */}
                <div>
                  <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1">Tipo de acceso</label>
                  <select
                    value={formData.tipoUsuario}
                    onChange={e => setFormData(p => ({ ...p, tipoUsuario: e.target.value }))}
                    className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 dark:text-white"
                  >
                    <option value="admin_empresa">Admin empresa</option>
                    <option value="usuario_empresa">Usuario empresa</option>
                  </select>
                </div>

                {/* Notas */}
                <div>
                  <label className="text-[10px] font-black uppercase text-text-sub-light tracking-widest block mb-1">Notas internas</label>
                  <textarea
                    rows={2}
                    value={formData.notas}
                    onChange={e => setFormData(p => ({ ...p, notas: e.target.value }))}
                    placeholder="Notas opcionales..."
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none dark:text-white"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 h-11 rounded-xl border border-border-light dark:border-border-dark text-sm font-bold text-text-sub-light hover:text-text-main-light dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-11 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {editingMemberId ? 'Guardar cambios' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
