
import React, { useState } from 'react';

const permissionData = [
  { category: 'Contactos', permissions: ['Ver', 'Crear', 'Editar', 'Eliminar'] },
  { category: 'Campañas', permissions: ['Ver', 'Crear', 'Editar', 'Eliminar'] },
  { category: 'Reportes', permissions: ['Ver', 'Exportar'] },
];

const ClientRolePermissions = () => {
  const [permissions, setPermissions] = useState(() => {
    const initial = {};
    permissionData.forEach((cat) => {
      cat.permissions.forEach((perm) => {
        initial[`${cat.category}-${perm}`] = true;
      });
    });
    return initial;
  });

  const togglePermission = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-text-main-light dark:text-white">Permisos de Rol</h1>
        <p className="text-text-sub-light dark:text-gray-400 mt-2">Gestiona acceso a características</p>
      </div>
      <div className="space-y-6">
        {permissionData.map((category) => (
          <div key={category.category} className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-border-light dark:border-border-dark">
            <h3 className="text-lg font-black text-text-main-light dark:text-white mb-4">{category.category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.permissions.map((perm) => {
                const key = `${category.category}-${perm}`;
                return (
                  <label key={key} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={permissions[key]}
                      onChange={() => togglePermission(key)}
                      className="w-5 h-5 accent-primary rounded"
                    />
                    <span className="text-sm font-semibold text-text-main-light dark:text-white">{perm}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button className="mt-8 w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-hover transition-colors">
        Guardar Cambios
      </button>
    </div>
  );
};

export default ClientRolePermissions;
