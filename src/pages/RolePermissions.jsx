
import React, { useState } from 'react';

const permissionData = [
  {
    name: 'Gestión de Mensajes',
    icon: 'chat_bubble',
    permissions: [
      { id: 'view_inbox', label: 'Ver Bandeja de Entrada', description: 'Acceso a ver todas las conversaciones entrantes.' },
      { id: 'send_messages', label: 'Enviar Mensajes', description: 'Permitir responder a los clientes.' },
      { id: 'delete_chats', label: 'Eliminar Chats', description: 'Capacidad para borrar historiales de conversación.' },
      { id: 'assign_tickets', label: 'Asignar Tickets', description: 'Transferir chats a otros miembros del equipo.' },
    ]
  },
  {
    name: 'Campañas y Marketing',
    icon: 'campaign',
    permissions: [
      { id: 'create_campaigns', label: 'Crear Campañas', description: 'Diseñar y lanzar nuevos envíos masivos.' },
      { id: 'view_analytics', label: 'Ver Analíticas', description: 'Acceso a reportes de apertura y clics.' },
      { id: 'edit_templates', label: 'Editar Plantillas', description: 'Modificar diseños predefinidos de mensajes.' },
    ]
  },
  {
    name: 'Equipo y Seguridad',
    icon: 'admin_panel_settings',
    permissions: [
      { id: 'manage_team', label: 'Gestionar Equipo', description: 'Invitar, editar y eliminar usuarios de la empresa.' },
      { id: 'edit_roles', label: 'Modificar Permisos', description: 'Cambiar la configuración de esta misma pantalla.' },
      { id: 'view_audit_log', label: 'Registro de Auditoría', description: 'Ver log de acciones realizadas por el equipo.' },
    ]
  },
  {
    name: 'Configuración Técnica',
    icon: 'settings_ethernet',
    permissions: [
      { id: 'manage_whatsapp', label: 'Configurar WhatsApp', description: 'Modificar tokens y APIs de Meta Business.' },
      { id: 'edit_automations', label: 'Editar Flujos', description: 'Acceso al constructor de automatizaciones.' },
      { id: 'billing_access', label: 'Gestión de Pagos', description: 'Ver facturas y cambiar plan de suscripción.' },
    ]
  }
];

const RolePermissions = () => {
  const [selectedRole, setSelectedRole] = useState('Agente');
  const [activePermissions, setActivePermissions] = useState({
    'Admin': permissionData.flatMap(c => c.permissions.map(p => p.id)),
    'Agente': ['view_inbox', 'send_messages', 'view_analytics'],
    'Soporte': ['view_inbox', 'send_messages', 'assign_tickets', 'edit_templates'],
  });

  const togglePermission = (permissionId) => {
    setActivePermissions(prev => {
      const rolePerms = prev[selectedRole];
      const isSet = rolePerms.includes(permissionId);
      const newPerms = isSet 
        ? rolePerms.filter(id => id !== permissionId)
        : [...rolePerms, permissionId];
      
      return { ...prev, [selectedRole]: newPerms };
    });
  };

  const handleSave = () => {
    alert(`Permisos para el rol ${selectedRole} actualizados correctamente.`);
  };

  return (
    <div className="p-6 md:p-10 flex flex-col gap-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight text-text-main-light dark:text-white">Gestión de Permisos</h1>
        <p className="text-text-sub-light dark:text-gray-400 max-w-2xl text-lg">
          Define los límites de acceso para cada tipo de colaborador en tu organización.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Selector de Roles */}
        <aside className="lg:col-span-1 flex flex-col gap-4">
          <h3 className="text-[10px] font-black text-text-sub-light uppercase tracking-widest px-2">Selecciona un Rol</h3>
          <div className="flex flex-col gap-2">
            {(['Admin', 'Agente', 'Soporte']).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex items-center justify-between p-4 rounded-2xl transition-all border-2 ${
                  selectedRole === role 
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-surface-light dark:bg-surface-dark border-transparent text-text-main-light dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px]">
                    {role === 'Admin' ? 'verified_user' : role === 'Agente' ? 'support_agent' : 'construction'}
                  </span>
                  <span className="font-bold">{role}</span>
                </div>
                <span className="material-symbols-outlined text-[18px] opacity-50">chevron_right</span>
              </button>
            ))}
          </div>

          <div className="mt-6 p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/20">
             <div className="flex gap-3 text-amber-700 dark:text-amber-400">
                <span className="material-symbols-outlined filled">info</span>
                <p className="text-xs font-medium leading-relaxed">
                  Los cambios realizados afectarán inmediatamente a todos los usuarios asignados a este rol.
                </p>
             </div>
          </div>
        </aside>

        {/* Matriz de Permisos */}
        <main className="lg:col-span-3 flex flex-col gap-6">
          <div className="flex items-center justify-between bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-border-light dark:border-border-dark shadow-sm">
             <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined filled text-2xl">security</span>
                </div>
                <div>
                   <h2 className="text-xl font-black text-text-main-light dark:text-white leading-none">Configuración de {selectedRole}</h2>
                   <p className="text-xs text-text-sub-light dark:text-gray-500 font-bold uppercase tracking-widest mt-1">
                     {activePermissions[selectedRole].length} permisos activos
                   </p>
                </div>
             </div>
             <button 
              onClick={handleSave}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95"
             >
               Guardar Cambios
             </button>
          </div>

          <div className="space-y-6">
            {permissionData.map((category) => (
              <div key={category.name} className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3 border-b border-border-light dark:border-border-dark">
                  <span className="material-symbols-outlined text-text-sub-light">{category.icon}</span>
                  <h4 className="text-sm font-black text-text-main-light dark:text-white uppercase tracking-widest">{category.name}</h4>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {category.permissions.map((permission) => {
                    const isEnabled = activePermissions[selectedRole].includes(permission.id);
                    return (
                      <div 
                        key={permission.id}
                        onClick={() => togglePermission(permission.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                          isEnabled 
                          ? 'border-primary/20 bg-primary/5 dark:bg-primary/10' 
                          : 'border-transparent bg-gray-50 dark:bg-gray-800/50 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex-1 pr-4">
                          <p className={`text-sm font-bold transition-colors ${isEnabled ? 'text-primary dark:text-white' : 'text-text-main-light dark:text-gray-400'}`}>
                            {permission.label}
                          </p>
                          <p className="text-[10px] text-text-sub-light dark:text-gray-500 mt-0.5 leading-tight font-medium">
                            {permission.description}
                          </p>
                        </div>
                        <div className={`w-10 h-5 rounded-full p-0.5 transition-all flex items-center ${isEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}>
                          <div className={`size-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default RolePermissions;
