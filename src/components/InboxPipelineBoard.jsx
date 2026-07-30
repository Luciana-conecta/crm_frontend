import React, { useState } from 'react';

const COLUMNS = [
  { key: 'abierta',       label: 'En curso',      icon: 'forum',        header: 'text-blue-600 dark:text-blue-400',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { key: 'sin_respuesta', label: 'Sin respuesta', icon: 'schedule',     header: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { key: 'resuelta',      label: 'Resueltas',     icon: 'check_circle', header: 'text-green-600 dark:text-green-400', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { key: 'cerrada',       label: 'Cerradas',      icon: 'cancel',       header: 'text-text-sub-light',                badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
];

export default function InboxPipelineBoard({ conversations, onOpenChat, onMove, formatTime }) {
  const [dragOverCol, setDragOverCol] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const byColumn = COLUMNS.map((col) => ({
    ...col,
    items: conversations.filter((c) => (c.pipeline_status || 'abierta') === col.key),
  }));

  const handleDrop = (e, colKey) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData('text/plain');
    if (id) onMove(id, colKey);
  };

  return (
    <div className="flex-1 overflow-x-auto p-6">
      <div className="flex gap-5 h-full min-w-max">
        {byColumn.map((col, colIndex) => (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
            onDragLeave={() => setDragOverCol((k) => (k === col.key ? null : k))}
            onDrop={(e) => handleDrop(e, col.key)}
            className={`w-72 shrink-0 flex flex-col bg-gray-50 dark:bg-[#10161f] rounded-2xl border overflow-hidden transition-colors ${
              dragOverCol === col.key ? 'border-primary ring-2 ring-primary/30' : 'border-border-light dark:border-border-dark'
            }`}
          >
            <div className="p-4 flex items-center gap-2 border-b border-border-light dark:border-border-dark shrink-0">
              <span className={`material-symbols-outlined text-[18px] ${col.header}`}>{col.icon}</span>
              <h3 className={`text-xs font-black uppercase tracking-widest ${col.header}`}>{col.label}</h3>
              <span className={`ml-auto px-2 py-0.5 rounded-lg text-[10px] font-black ${col.badge}`}>
                {col.items.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {col.items.length === 0 ? (
                <div className="text-center text-text-sub-light text-xs py-8 opacity-60">
                  Sin conversaciones
                </div>
              ) : (
                col.items.map((conv) => (
                  <div
                    key={conv.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(conv.id)); setDraggingId(conv.id); }}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => onOpenChat(conv.id)}
                    className={`w-full text-left bg-white dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-3.5 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-sm transition-all ${
                      draggingId === conv.id ? 'opacity-40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="size-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                        <span className="text-green-600 dark:text-green-400 font-black text-[11px]">
                          {conv.contacto_nombre?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-main-light dark:text-white truncate leading-tight">
                          {conv.contacto_nombre || conv.telefono_whatsapp}
                        </p>
                        <p className="text-[10px] text-text-sub-light font-bold uppercase">
                          {formatTime(conv.ultimo_mensaje_en)}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-text-sub-light line-clamp-2 leading-snug mb-2.5">
                      {conv.ultimo_mensaje || 'Sin mensajes'}
                    </p>

                    <div className="flex items-center justify-between gap-1 pt-2 border-t border-border-light dark:border-border-dark">
                      <button
                        type="button"
                        disabled={colIndex === 0}
                        onClick={(e) => { e.stopPropagation(); onMove(conv.id, COLUMNS[colIndex - 1].key); }}
                        title={colIndex > 0 ? `Mover a "${COLUMNS[colIndex - 1].label}"` : ''}
                        className="size-6 rounded-lg flex items-center justify-center text-text-sub-light hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary disabled:opacity-20 disabled:pointer-events-none transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      </button>
                      <span className="text-[9px] text-text-sub-light uppercase font-bold tracking-wider opacity-60">
                        arrastrar o mover
                      </span>
                      <button
                        type="button"
                        disabled={colIndex === COLUMNS.length - 1}
                        onClick={(e) => { e.stopPropagation(); onMove(conv.id, COLUMNS[colIndex + 1].key); }}
                        title={colIndex < COLUMNS.length - 1 ? `Mover a "${COLUMNS[colIndex + 1].label}"` : ''}
                        className="size-6 rounded-lg flex items-center justify-center text-text-sub-light hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary disabled:opacity-20 disabled:pointer-events-none transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
