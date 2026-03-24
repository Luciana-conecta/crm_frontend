
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { clientAPI } from '../services/api';

const PLAN_LIMIT = 500;

const normalizeContact = (c) => ({
  id: String(c.id),
  name: c.nombre ?? c.name ?? '',
  phone: c.telefono ?? c.phone ?? '',
  email: c.email ?? '',
  tags: c.tags ?? [],
  lastInteraction: c.ultima_interaccion ?? c.lastInteraction ?? 'Nunca',
});

const Contacts = () => {
  const { user, impersonatedEmpresa } = useAuth();
  const empresaId = impersonatedEmpresa?.empresa_id || impersonatedEmpresa?.id || user?.empresa_id || user?.empresa?.id || localStorage.getItem('crm_empresa_id');

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  // ── Carga inicial ────────────────────────────────────────────────────
  useEffect(() => {
    if (!empresaId) return;
    const fetchContacts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await clientAPI.getContacts(empresaId);
        const list = Array.isArray(data)
          ? data
          : (data.contactos ?? data.contacts ?? data.data ?? data.clientes ?? []);
        console.log('[Contacts] Lista extraída:', list);
        setContacts(list.map(normalizeContact));
          setContacts(list.map(normalizeContact));
      } catch (err) {
        console.error('Error al cargar contactos:', err);
        setError('No se pudieron cargar los contactos.');
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, [empresaId]);

  // ── Filtro de búsqueda ───────────────────────────────────────────────
  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Modal ────────────────────────────────────────────────────────────
  const handleOpenContactModal = (contact) => {
    if (!contact && contacts.length >= PLAN_LIMIT) {
      alert(`Has alcanzado el límite de tu plan (${PLAN_LIMIT} contactos).`);
      return;
    }
    if (contact) {
      setEditingContact(contact);
      setContactForm({ name: contact.name, phone: contact.phone, email: contact.email });
    } else {
      setEditingContact(null);
      setContactForm({ name: '', phone: '', email: '' });
    }
    setIsContactModalOpen(true);
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      nombre: contactForm.name,
      telefono: contactForm.phone,
      email: contactForm.email,
    };
    try {
      if (editingContact) {
        const updated = await clientAPI.updateContact(empresaId, editingContact.id, payload);
        setContacts(prev => prev.map(c => c.id === editingContact.id ? normalizeContact({ ...c, ...updated }) : c));
      } else {
        const created = await clientAPI.createContact(empresaId, payload);
        setContacts(prev => [normalizeContact(created), ...prev]);
      }
      setIsContactModalOpen(false);
    } catch (err) {
      console.error('Error al guardar contacto:', err);
      alert('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este contacto?')) return;
    try {
      await clientAPI.deleteContact(empresaId, id);
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error al eliminar contacto:', err);
      alert('Error al eliminar. Intenta de nuevo.');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="p-10 flex flex-col gap-8 max-w-[1440px] mx-auto pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Contactos</h1>
          <p className="text-text-sub-light mt-1 text-lg">
            {contacts.length} de {PLAN_LIMIT} contactos utilizados.
          </p>
        </div>
        <button
          onClick={() => handleOpenContactModal()}
          className="bg-primary text-white h-12 px-8 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all"
        >
          Nuevo Contacto
        </button>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-sub-light">search</span>
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm font-bold"
          />
        </div>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] border border-border-light dark:border-border-dark overflow-hidden">

        {loading && (
          <div className="p-20 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-text-sub-light font-bold">Cargando contactos...</p>
          </div>
        )}

        {!loading && error && (
          <div className="p-20 text-center">
            <span className="material-symbols-outlined text-6xl text-red-300">error</span>
            <p className="text-red-500 mt-4 font-bold">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 uppercase text-[10px] font-black tracking-widest text-text-sub-light">
              <tr>
                <th className="px-8 py-5">Nombre</th>
                <th className="px-8 py-5">Teléfono</th>
                <th className="px-8 py-5">Email</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {filtered.map(contact => (
                <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-8 py-4 font-bold">{contact.name}</td>
                  <td className="px-8 py-4 text-text-sub-light">{contact.phone}</td>
                  <td className="px-8 py-4 text-text-sub-light">{contact.email || '—'}</td>
                  <td className="px-8 py-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenContactModal(contact)}
                      className="size-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="size-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="p-20 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-200 dark:text-gray-700">contacts</span>
            <p className="text-text-sub-light mt-4 font-bold">
              {searchTerm ? 'No hay resultados para tu búsqueda.' : 'No hay contactos registrados.'}
            </p>
          </div>
        )}
      </div>

      {/* MODAL */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[32px] p-10 shadow-2xl">
            <h2 className="text-2xl font-black mb-8">{editingContact ? 'Editar' : 'Nuevo'} Contacto</h2>
            <form onSubmit={handleSaveContact} className="space-y-4">
              <input
                required
                value={contactForm.name}
                onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                placeholder="Nombre..."
                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl font-bold dark:text-white"
              />
              <input
                required
                value={contactForm.phone}
                onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                placeholder="Teléfono..."
                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl font-bold dark:text-white"
              />
              <input
                type="email"
                value={contactForm.email}
                onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                placeholder="Email (opcional)..."
                className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl font-bold dark:text-white"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full h-14 bg-primary text-white font-black uppercase rounded-2xl disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="w-full text-xs font-black uppercase text-text-sub-light pt-2"
              >
                Cerrar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
