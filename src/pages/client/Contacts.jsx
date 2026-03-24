
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';

// ── CSV line parser (handles quoted fields) ──────────────────────────────────
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
};

const TAG_OPTIONS = [
  { id: 'vip',        label: 'VIP',           bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  { id: 'nuevo',      label: 'Cliente Nuevo', bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-300',    dot: 'bg-blue-500' },
  { id: 'urgente',    label: 'Urgente',       bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-300',      dot: 'bg-red-500' },
  { id: 'interesado', label: 'Interesado',    bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-300',  dot: 'bg-green-500' },
  { id: 'seguimiento',label: 'Seguimiento',   bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-300',  dot: 'bg-amber-500' },
  { id: 'inactivo',   label: 'Inactivo',      bg: 'bg-gray-100 dark:bg-gray-800',       text: 'text-gray-600 dark:text-gray-400',    dot: 'bg-gray-400' },
];

const tagById   = (id) => TAG_OPTIONS.find(t => t.id === id);
const TAGS_KEY  = 'crm_contact_tags';
const loadAllTags = () => { try { return JSON.parse(localStorage.getItem(TAGS_KEY)) ?? {}; } catch { return {}; } };
const saveAllTags = (map) => localStorage.setItem(TAGS_KEY, JSON.stringify(map));

const INPUT_CLS = 'w-full h-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 font-semibold text-sm text-text-main-light dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all';

const ClientContacts = () => {
  const [contacts, setContacts]           = useState([]);
  const [isAddOpen, setIsAddOpen]         = useState(false);
  const [detailContact, setDetailContact] = useState(null);
  const [editMode, setEditMode]           = useState(false);
  const [editForm, setEditForm]           = useState({});
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [updateSaving, setUpdateSaving]   = useState(false);
  const [error, setError]                 = useState('');
  const [formData, setFormData]           = useState({ name: '', phone: '' });
  const [empresaId, setEmpresaId]         = useState(null);
  const [tagsMap, setTagsMap]             = useState(loadAllTags);

  // Import / Export
  const [showIOMenu, setShowIOMenu]       = useState(false);
  const [importing, setImporting]         = useState(false);
  const [importResult, setImportResult]   = useState(null);
  const fileInputRef                      = useRef(null);
  const importTypeRef                     = useRef('csv');
  const ioMenuRef                         = useRef(null);

  useEffect(() => {
    const id = localStorage.getItem('crm_empresa_id');
    if (id) { setEmpresaId(id); loadContacts(id); }
  }, []);

  const normalizeContact = (c) => ({
    id:         String(c.id_contactos ?? c.id),
    clienteId:  String(c.id_cliente ?? c.cliente_id ?? c.id_contactos),
    name:       c.nombre      ?? c.name      ?? '',
    phone:      c.numero_telefono ?? c.telefono ?? c.phone ?? '',
    email:      c.email       ?? '',
    cargo:      c.cargo       ?? '',
    notas:      c.notas       ?? '',
    estado:     c.estado      ?? 'activo',
    created_at: c.created_at  ?? c.fecha_creacion ?? new Date().toISOString(),
  });

  const loadContacts = async (id) => {
    try {
      setLoading(true);
      const data = await api.client.getContacts(id);
      const list = Array.isArray(data)
        ? data
        : (data.contactos ?? data.contacts ?? data.data ?? data.clientes ?? []);
      if (list.length > 0) console.log('[Contacts] Campos del primer contacto:', Object.keys(list[0]), list[0]);
      setContacts(list.map(normalizeContact));
      setError('');
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Abrir detalle ────────────────────────────────────────────────────
  const openDetail = (c) => {
    console.log('[openDetail] contacto recibido:', c);
    setDetailContact({ ...c, _tags: getContactTags(c.id) });
    setEditMode(false);
    setEditForm({
      nombre:          c.name,
      numero_telefono: c.phone,
      email:           c.email,
      cargo:           c.cargo,
      notas:           c.notas,
      estado:          c.estado,
    });
  };

  const closeDetail = () => { setDetailContact(null); setEditMode(false); };

  // ── Guardar edición ──────────────────────────────────────────────────
  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdateSaving(true);
    try {
      const updated = await api.client.updateContact(empresaId, detailContact.id, editForm);
      const norm = normalizeContact({ ...detailContact, ...editForm, ...updated });
      setContacts(prev => prev.map(c => c.id === norm.id ? norm : c));
      setDetailContact({ ...norm, _tags: detailContact._tags });
      setEditMode(false);
    } catch (err) {
      console.error('Error al actualizar:', err);
      alert('Error al guardar los cambios. Intenta de nuevo.');
    } finally {
      setUpdateSaving(false);
    }
  };

  // ── Tags ────────────────────────────────────────────────────────────
  const toggleTag = (contactId, tagId) => {
    const updated  = { ...tagsMap };
    const current  = updated[contactId] ?? [];
    updated[contactId] = current.includes(tagId)
      ? current.filter(t => t !== tagId)
      : [...current, tagId];
    setTagsMap(updated);
    saveAllTags(updated);
    if (detailContact?.id === contactId)
      setDetailContact(prev => ({ ...prev, _tags: updated[contactId] }));
  };

  const getContactTags = (id) => tagsMap[id] ?? [];

  // ── Crear contacto ───────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.client.createContact(empresaId, { nombre: formData.name, telefono: formData.phone });
      await loadContacts(empresaId);
      setIsAddOpen(false);
      setFormData({ name: '', phone: '' });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Cerrar menú IO al hacer click fuera ─────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (ioMenuRef.current && !ioMenuRef.current.contains(e.target)) setShowIOMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Exportar CSV ─────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    setShowIOMenu(false);
    const headers = ['Nombre', 'Telefono', 'Email', 'Cargo', 'Notas', 'Estado', 'Fecha'];
    const rows = contacts.map(c => [
      c.name, c.phone, c.email, c.cargo, c.notas, c.estado,
      new Date(c.created_at).toLocaleDateString('es-ES'),
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contactos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Exportar Excel ───────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    setShowIOMenu(false);
    try {
      const XLSX = await import('https://esm.sh/xlsx');
      const data = contacts.map(c => ({
        'Nombre':         c.name    ?? '',
        'Telefono':       c.phone   ?? '',
        'Email':          c.email   ?? '',
        'Cargo':          c.cargo   ?? '',
        'Notas':          c.notas   ?? '',
        'Estado':         c.estado  ?? '',
        'Fecha Registro': new Date(c.created_at).toLocaleDateString('es-ES'),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Contactos');
      XLSX.writeFile(wb, `contactos_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Error exportando Excel:', err);
      alert('No se pudo exportar a Excel. Intenta con CSV.');
    }
  };

  // ── Plantilla CSV de ejemplo ─────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    setShowIOMenu(false);
    const t = 'Nombre,Telefono,Email,Cargo,Notas\r\n"Juan Pérez","+34 600 000 001","juan@ejemplo.com","Gerente",""\r\n"María García","+34 600 000 002","maria@ejemplo.com","Directora","Cliente VIP"';
    const blob = new Blob(['\uFEFF' + t], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_contactos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Abrir selector de archivo ────────────────────────────────────────────
  const triggerImport = (type) => {
    setShowIOMenu(false);
    importTypeRef.current = type;
    fileInputRef.current.accept = type === 'csv' ? '.csv' : '.xlsx,.xls';
    fileInputRef.current.click();
  };

  // ── Procesar archivo importado ───────────────────────────────────────────
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportResult(null);
    try {
      let rows = [];
      if (importTypeRef.current === 'csv') {
        const text = await file.text();
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
        if (lines.length < 2) throw new Error('El CSV no tiene datos.');
        const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim().toLowerCase());
        rows = lines.slice(1).map(line => Object.fromEntries(
          headers.map((h, i) => [h, parseCSVLine(line)[i] ?? ''])
        ));
      } else {
        const XLSX = await import('https://esm.sh/xlsx');
        const wb = XLSX.read(await file.arrayBuffer());
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      }

      // Buscar valor en la fila probando variantes del nombre
      const getField = (row, ...keys) => {
        for (const k of keys) {
          for (const rk of Object.keys(row)) {
            if (rk.toLowerCase().includes(k) && String(row[rk]).trim() !== '')
              return String(row[rk]).trim();
          }
        }
        return '';
      };

      const parsed = rows
        .map(r => ({
          nombre:   getField(r, 'nombre', 'name'),
          telefono: getField(r, 'telefono', 'phone', 'movil', 'celular', 'tel', 'numero'),
          email:    getField(r, 'email', 'correo', 'mail'),
          cargo:    getField(r, 'cargo', 'puesto', 'posicion', 'position'),
          notas:    getField(r, 'notas', 'nota', 'notes', 'observacion'),
        }))
        .filter(r => r.nombre || r.telefono);

      if (parsed.length === 0) throw new Error('No se encontraron contactos válidos.');

      let success = 0, errors = 0;
      for (const contact of parsed) {
        try { await api.client.createContact(empresaId, contact); success++; }
        catch { errors++; }
      }
      setImportResult({ total: parsed.length, success, errors });
      await loadContacts(empresaId);
    } catch (err) {
      console.error('Error importando:', err);
      setImportResult({ total: 0, success: 0, errors: 0, fatal: err.message });
    } finally {
      setImporting(false);
    }
  };

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center gap-4 text-primary">
      <span className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="font-black uppercase tracking-widest text-xs">Sincronizando con Postgres...</p>
    </div>
  );

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500">

      {/* Input oculto para importar */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleImportFile} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em]">
            <span className="material-symbols-outlined text-[14px]">database</span> Sincronización Real
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-text-main-light dark:text-white leading-none">Directorio de Contactos</h1>
          <p className="text-text-sub-light dark:text-gray-400 text-lg font-medium">Base de datos persistente para tu empresa.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Importar / Exportar */}
          <div className="relative" ref={ioMenuRef}>
            <button
              onClick={() => setShowIOMenu(v => !v)}
              disabled={importing}
              className="h-14 border-2 border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-main-light dark:text-white px-6 rounded-[20px] font-black uppercase tracking-widest text-xs hover:border-primary hover:text-primary transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {importing
                ? <><span className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />Importando...</>
                : <><span className="material-symbols-outlined text-[18px]">import_export</span>Importar / Exportar<span className="material-symbols-outlined text-[16px]">expand_more</span></>
              }
            </button>

            {showIOMenu && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-surface-dark rounded-[20px] border border-border-light dark:border-border-dark shadow-xl z-50 overflow-hidden">
                <div className="p-2">
                  <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-text-sub-light">Importar</p>
                  <button onClick={() => triggerImport('csv')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                    <span className="size-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600"><span className="material-symbols-outlined text-[18px]">table_view</span></span>
                    <div><p className="text-sm font-bold text-text-main-light dark:text-white">Importar CSV</p><p className="text-[10px] text-text-sub-light">Archivo .csv</p></div>
                  </button>
                  <button onClick={() => triggerImport('excel')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                    <span className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600"><span className="material-symbols-outlined text-[18px]">grid_on</span></span>
                    <div><p className="text-sm font-bold text-text-main-light dark:text-white">Importar Excel</p><p className="text-[10px] text-text-sub-light">Archivo .xlsx / .xls</p></div>
                  </button>

                  <div className="my-2 border-t border-border-light dark:border-border-dark" />

                  <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-text-sub-light">Exportar</p>
                  <button onClick={handleExportCSV} disabled={contacts.length === 0} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-40">
                    <span className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600"><span className="material-symbols-outlined text-[18px]">download</span></span>
                    <div><p className="text-sm font-bold text-text-main-light dark:text-white">Exportar CSV</p><p className="text-[10px] text-text-sub-light">{contacts.length} contacto{contacts.length !== 1 ? 's' : ''}</p></div>
                  </button>
                  <button onClick={handleExportExcel} disabled={contacts.length === 0} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-40">
                    <span className="size-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600"><span className="material-symbols-outlined text-[18px]">table_chart</span></span>
                    <div><p className="text-sm font-bold text-text-main-light dark:text-white">Exportar Excel</p><p className="text-[10px] text-text-sub-light">{contacts.length} contacto{contacts.length !== 1 ? 's' : ''}</p></div>
                  </button>

                  <div className="my-2 border-t border-border-light dark:border-border-dark" />

                  <button onClick={handleDownloadTemplate} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                    <span className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600"><span className="material-symbols-outlined text-[18px]">description</span></span>
                    <div><p className="text-sm font-bold text-text-main-light dark:text-white">Plantilla CSV</p><p className="text-[10px] text-text-sub-light">Formato de ejemplo</p></div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Añadir contacto */}
          <button onClick={() => setIsAddOpen(true)}
            className="h-14 bg-primary text-white px-8 rounded-[20px] font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">person_add</span>Añadir
          </button>
        </div>
      </div>

      {/* Resultado de importación */}
      {importResult && (
        <div className={`p-5 rounded-[20px] border flex items-start gap-4 ${importResult.fatal ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : importResult.errors > 0 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'}`}>
          <span className={`material-symbols-outlined text-2xl mt-0.5 ${importResult.fatal ? 'text-red-500' : importResult.errors > 0 ? 'text-amber-500' : 'text-green-500'}`}>
            {importResult.fatal ? 'error' : importResult.errors > 0 ? 'warning' : 'check_circle'}
          </span>
          <div className="flex-1">
            {importResult.fatal
              ? <p className="font-bold text-red-700 dark:text-red-400 text-sm">{importResult.fatal}</p>
              : <>
                  <p className="font-bold text-sm text-text-main-light dark:text-white">
                    Importación completada: <span className="text-green-600">{importResult.success} agregado{importResult.success !== 1 ? 's' : ''}</span>
                    {importResult.errors > 0 && <span className="text-amber-600"> · {importResult.errors} con error</span>}
                  </p>
                  <p className="text-xs text-text-sub-light mt-0.5">{importResult.total} fila{importResult.total !== 1 ? 's' : ''} procesada{importResult.total !== 1 ? 's' : ''}</p>
                </>
            }
          </div>
          <button onClick={() => setImportResult(null)} className="text-text-sub-light hover:text-text-main-light transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 p-6 rounded-[24px] flex items-center gap-4">
          <span className="material-symbols-outlined text-2xl text-red-600">warning</span>
          <p className="text-red-600 dark:text-red-400 font-bold text-sm">{error}</p>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-[40px] border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 uppercase text-[10px] font-black text-text-sub-light tracking-widest border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-10 py-6">Contacto</th>
                <th className="px-10 py-6">Teléfono</th>
                <th className="px-10 py-6">Etiquetas</th>
                <th className="px-10 py-6">Registro</th>
                <th className="px-10 py-6 text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {contacts.length === 0 ? (
                <tr><td colSpan={5} className="px-10 py-20 text-center">
                  <span className="material-symbols-outlined text-6xl text-gray-200 dark:text-gray-800">contacts</span>
                  <p className="mt-4 font-bold text-text-sub-light">No hay contactos registrados.</p>
                </td></tr>
              ) : contacts.map(c => {
                const tags = getContactTags(c.id);
                return (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                    <td className="px-10 py-5">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                          {c.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="font-bold text-text-main-light dark:text-white group-hover:text-primary transition-colors">{c.name}</p>
                          {c.email && <p className="text-xs text-text-sub-light">{c.email}</p>}
                          {c.cargo && <p className="text-xs text-text-sub-light italic">{c.cargo}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-5 font-medium text-text-sub-light dark:text-gray-400">{c.phone}</td>
                    <td className="px-10 py-5">
                      <div className="flex flex-wrap gap-1">
                        {tags.map(tid => { const tag = tagById(tid); if (!tag) return null;
                          return <span key={tid} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${tag.bg} ${tag.text}`}>
                            <span className={`size-1.5 rounded-full ${tag.dot}`}/>{tag.label}</span>;
                        })}
                        {tags.length === 0 && <span className="text-xs text-text-sub-light">—</span>}
                      </div>
                    </td>
                    <td className="px-10 py-5 text-xs font-bold text-text-sub-light">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-10 py-5 text-right">
                      <button onClick={() => openDetail(c)}
                        className="size-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center ml-auto">
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL DETALLE / EDICIÓN ───────────────────────────────────── */}
      {detailContact && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">

            {/* Cabecera */}
            <div className="px-10 pt-10 pb-6 flex items-start gap-5 shrink-0">
              <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl shrink-0">
                {detailContact.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black text-text-main-light dark:text-white truncate">
                  {editMode ? 'Editando contacto' : detailContact.name}
                </h2>
                <p className="text-text-sub-light text-sm mt-0.5">
                  Registrado el {new Date(detailContact.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!editMode && (
                  <button onClick={() => setEditMode(true)}
                    className="size-10 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-all"
                    title="Editar">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                )}
                <button onClick={closeDetail}
                  className="size-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-sub-light hover:text-text-main-light flex items-center justify-center transition-all">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-10">
              {/* ── MODO VER ── */}
              {!editMode && (
                <div className="space-y-3 pb-6">
                  {[
                    { icon: 'phone',       label: 'Teléfono', value: detailContact.phone },
                    { icon: 'mail',        label: 'Email',    value: detailContact.email },
                    { icon: 'work',        label: 'Cargo',    value: detailContact.cargo },
                    { icon: 'circle',      label: 'Estado',   value: detailContact.estado },
                    { icon: 'sticky_note_2',label:'Notas',    value: detailContact.notas },
                  ].filter(f => f.value).map(f => (
                    <div key={f.label} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                      <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">{f.icon}</span>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-sub-light">{f.label}</p>
                        <p className="font-bold text-text-main-light dark:text-white whitespace-pre-wrap">{f.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── MODO EDITAR ── */}
              {editMode && (
                <form id="edit-form" onSubmit={handleUpdate} className="space-y-4 pb-6">
                  {[
                    { key: 'nombre',   label: 'Nombre Completo',  type: 'text',  required: true },
                    { key: 'numero_telefono', label: 'Teléfono',     type: 'tel',   required: true },
                    { key: 'email',    label: 'Email',             type: 'email', required: false },
                    { key: 'cargo',    label: 'Cargo / Empresa',   type: 'text',  required: false },
                  ].map(f => (
                    <div key={f.key} className="space-y-1.5">
                      <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest px-1">{f.label}</label>
                      <input
                        type={f.type}
                        required={f.required}
                        value={editForm[f.key] ?? ''}
                        onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                        className={INPUT_CLS}
                      />
                    </div>
                  ))}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest px-1">Estado</label>
                    <select
                      value={editForm.estado ?? 'activo'}
                      onChange={e => setEditForm({ ...editForm, estado: e.target.value })}
                      className={INPUT_CLS}>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                      <option value="prospecto">Prospecto</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest px-1">Notas</label>
                    <textarea
                      rows={3}
                      value={editForm.notas ?? ''}
                      onChange={e => setEditForm({ ...editForm, notas: e.target.value })}
                      placeholder="Observaciones, recordatorios..."
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 font-semibold text-sm text-text-main-light dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all resize-none"
                    />
                  </div>
                </form>
              )}

              {/* Etiquetas (siempre visibles) */}
              <div className="pb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-sub-light mb-3">Etiquetas</p>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map(tag => {
                    const active = (detailContact._tags ?? []).includes(tag.id);
                    return (
                      <button key={tag.id} onClick={() => toggleTag(detailContact.id, tag.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide border-2 transition-all
                          ${active ? `${tag.bg} ${tag.text} border-transparent` : 'bg-transparent border-gray-200 dark:border-gray-700 text-text-sub-light hover:border-gray-300'}`}>
                        <span className={`size-2 rounded-full ${active ? tag.dot : 'bg-gray-300 dark:bg-gray-600'}`} />
                        {tag.label}
                        {active && <span className="material-symbols-outlined text-[14px]">check</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 pb-8 pt-4 border-t border-border-light dark:border-border-dark shrink-0 flex gap-3">
              {editMode ? (
                <>
                  <button form="edit-form" type="submit" disabled={updateSaving}
                    className="flex-1 h-14 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {updateSaving
                      ? <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><span className="material-symbols-outlined text-[18px]">save</span>Guardar cambios</>}
                  </button>
                  <button type="button" onClick={() => setEditMode(false)}
                    className="h-14 px-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-text-sub-light hover:text-text-main-light font-black text-xs uppercase tracking-widest transition-all">
                    Cancelar
                  </button>
                </>
              ) : (
                <button onClick={closeDetail}
                  className="w-full h-12 text-xs font-black uppercase text-text-sub-light hover:text-text-main-light transition-all">
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AÑADIR ─────────────────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleAdd} className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[48px] p-12 space-y-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tighter">Nuevo Cliente</h2>
              <p className="text-text-sub-light font-bold text-sm">Añade los detalles a la base de datos central.</p>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest px-1">Nombre Completo</label>
                <input required placeholder="Ej: Juan Pérez" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })} className={INPUT_CLS} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-sub-light uppercase tracking-widest px-1">Número Móvil</label>
                <input required placeholder="+34 600 000 000" value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} className={INPUT_CLS} />
              </div>
            </div>
            <div className="space-y-4 pt-4">
              <button type="submit" disabled={saving}
                className="w-full h-16 bg-primary text-white font-black uppercase tracking-widest rounded-[24px] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50">
                {saving ? <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Guardar en Postgres'}
              </button>
              <button type="button" onClick={() => setIsAddOpen(false)}
                className="w-full text-[10px] font-black uppercase text-text-sub-light tracking-widest hover:text-text-main-light transition-all">
                Cancelar y Salir
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ClientContacts;
