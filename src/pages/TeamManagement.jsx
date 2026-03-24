
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { clientAPI } from '../services/api';

// Normaliza los campos de la tabla usuarios_empresa al formato de la UI
const normalizeM = (m) => ({
  id: String(m.id),
  companyId: String(m.empresa_id ?? ''),
  name: m.nombre ?? m.name ?? '',
  email: m.email ?? '',
  role: m.rol ?? m.role ?? 'Agente',
  status: m.estado ?? m.status ?? 'Activo',
  lastAccess: m.ultimo_acceso ?? m.lastAccess ?? 'Nunca',
  avatarUrl: m.avatar_url ?? m.avatarUrl ?? '',
});

const TeamManagement = () => {
  const { user, impersonatedEmpresa } = useAuth();
  const empresaId = impersonatedEmpresa?.empresa_id || impersonatedEmpresa?.id || user?.empresa_id || user?.empresa?.id || localStorage.getItem('crm_empresa_id');

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Agente',
    status: 'Activo',
    avatarUrl: ''
  });

  // ── Carga inicial desde usuarios_empresa ──────────────────────────
  useEffect(() => {
    if (!empresaId) return;
    const fetchTeam = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await clientAPI.getTeamMembers(empresaId);
        const list = Array.isArray(data) ? data : (data.members ?? data.equipo ?? []);
        setMembers(list.map(normalizeM));
      } catch (err) {
        console.error('Error al cargar el equipo:', err);
        setError('No se pudo cargar el equipo. Verifica tu conexión.');
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [empresaId]);

  // ── Modal ──────────────────────────────────────────────────────────
  const handleOpenModal = (member) => {
    if (member) {
      setEditingMemberId(member.id);
      setFormData({
        name: member.name,
        email: member.email,
        role: member.role,
        status: member.status,
        avatarUrl: member.avatarUrl || ''
      });
    } else {
      setEditingMemberId(null);
      setFormData({ name: '', email: '', role: 'Agente', status: 'Activo', avatarUrl: '' });
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMemberId) {
        const updated = await clientAPI.updateTeamMember(empresaId, editingMemberId, {
          nombre: formData.name,
          email: formData.email,
          rol: formData.role,
          estado: formData.status,
          avatar_url: formData.avatarUrl,
        });
        setMembers(prev =>
          prev.map(m => m.id === editingMemberId ? normalizeM({ ...m, ...updated }) : m)
        );
      } else {
        const created = await clientAPI.createTeamMember(empresaId, {
          nombre: formData.name,
          email: formData.email,
          rol: formData.role,
          estado: formData.status,
          avatar_url: formData.avatarUrl,
        });
        setMembers(prev => [normalizeM(created), ...prev]);
      }
      closeModal();
    } catch (err) {
      console.error('Error al guardar miembro:', err);
      alert('Error al guardar. Intenta de nuevo.');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMemberId(null);
    setFormData({ name: '', email: '', role: 'Agente', status: 'Activo', avatarUrl: '' });
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar a este miembro del equipo?')) return;
    try {
      await clientAPI.deleteTeamMember(empresaId, id);
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Error al eliminar miembro:', err);
      alert('Error al eliminar. Intenta de nuevo.');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-10 flex flex-col gap-8 max-w-7xl mx-auto pb-20 font-display">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black tracking-tight text-text-main-light dark:text-white">Gestión de Equipo</h1>
          <p className="text-text-sub-light dark:text-gray-400 max-w-2xl text-lg">
            Administra los accesos, roles y perfiles de tus colaboradores.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-primary-hover text-white h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all flex items-center gap-2 active:scale-95"
        >
          <span className="material-symbols-outlined">person_add</span>
          Nuevo Miembro
        </button>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] border border-border-light dark:border-border-dark overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">

          {/* Estado: cargando */}
          {loading && (
            <div className="p-20 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-text-sub-light font-bold">Cargando equipo...</p>
            </div>
          )}

          {/* Estado: error */}
          {!loading && error && (
            <div className="p-20 text-center">
              <span className="material-symbols-outlined text-6xl text-red-300 dark:text-red-700">error</span>
              <p className="text-red-500 mt-4 font-bold">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  clientAPI.getTeamMembers(empresaId)
                    .then(data => {
                      const list = Array.isArray(data) ? data : (data.members ?? data.equipo ?? []);
                      setMembers(list.map(normalizeM));
                    })
                    .catch(() => setError('No se pudo cargar el equipo.'))
                    .finally(() => setLoading(false));
                }}
                className="mt-4 px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Tabla */}
          {!loading && !error && (
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 uppercase text-[10px] font-black tracking-widest text-text-sub-light border-b border-border-light dark:border-border-dark">
                <tr>
                  <th className="px-8 py-6">Colaborador</th>
                  <th className="px-8 py-6">Rol</th>
                  <th className="px-8 py-6">Estado</th>
                  <th className="px-8 py-6">Último Acceso</th>
                  <th className="px-8 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {members.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                    <td className="px-8 py-5 flex items-center gap-4">
                      <div
                        className="size-12 rounded-full bg-cover bg-center border-2 border-primary/10 shadow-sm"
                        style={{ backgroundImage: `url(${member.avatarUrl || 'https://via.placeholder.com/150?text=Avatar'})` }}
                      />
                      <div>
                        <p className="font-bold text-text-main-light dark:text-white group-hover:text-primary transition-colors">{member.name}</p>
                        <p className="text-xs text-text-sub-light dark:text-gray-500">{member.email}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[10px] font-black rounded-lg uppercase tracking-widest border border-blue-100 dark:border-blue-900/30">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${
                          member.status === 'Activo' ? 'bg-green-500 animate-pulse' :
                          member.status === 'Ausente' ? 'bg-amber-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-xs font-bold text-text-main-light dark:text-gray-300">{member.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs font-medium text-text-sub-light dark:text-gray-500">
                      {member.lastAccess}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(member)}
                          className="size-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="size-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && !error && members.length === 0 && (
            <div className="p-20 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-200 dark:text-gray-700">group_off</span>
              <p className="text-text-sub-light mt-4 font-bold">No hay miembros registrados.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE MIEMBRO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-2xl font-black text-text-main-light dark:text-white">
                {editingMemberId ? 'Editar Perfil' : 'Añadir Colaborador'}
              </h2>
              <button onClick={closeModal} className="text-text-sub-light hover:text-text-main-light transition-all p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              {/* Sección de Avatar */}
              <div className="flex flex-col items-center gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="size-28 rounded-full bg-gray-100 dark:bg-gray-900 bg-cover bg-center border-4 border-white dark:border-gray-800 shadow-xl cursor-pointer relative overflow-hidden group flex items-center justify-center"
                  style={{ backgroundImage: formData.avatarUrl ? `url(${formData.avatarUrl})` : '' }}
                >
                  {!formData.avatarUrl && <span className="material-symbols-outlined text-4xl text-gray-400">add_a_photo</span>}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                    <span className="material-symbols-outlined text-2xl">upload</span>
                    <span className="text-[8px] font-black uppercase tracking-tighter">Subir Foto</span>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                <p className="text-[10px] font-black uppercase text-text-sub-light tracking-widest">Avatar del Usuario</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest px-1">Nombre Completo</label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: Sofia Ruiz"
                    className="w-full h-14 px-5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest px-1">Email Profesional</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="sofia@empresa.com"
                    className="w-full h-14 px-5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest px-1">Rol / Permisos</label>
                    <select
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full h-14 px-5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all dark:text-white"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Agente">Agente</option>
                      <option value="Soporte">Soporte</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest px-1">Estado</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full h-14 px-5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all dark:text-white"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Ausente">Ausente</option>
                      <option value="Pendiente">Pendiente</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button
                  type="submit"
                  className="w-full h-16 bg-primary text-white font-black uppercase tracking-widest rounded-[20px] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {editingMemberId ? 'Guardar Cambios' : 'Añadir al Equipo'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full h-12 text-xs font-black uppercase text-text-sub-light hover:text-text-main-light transition-all"
                >
                  Descartar
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
