// @refresh reset
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { clientAPI, inboxAPI } from '../services/api';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 25000; // 25 segundos

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const empresaId = user?.empresa_id || user?.empresa?.id || localStorage.getItem('crm_empresa_id');
  // Cualquier usuario que no sea super_admin/admin de Insignia
  const isClientRole = isAuthenticated && user?.tipo_usuario !== 'super_admin' && user?.tipo_usuario !== 'admin';

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [panelOpen, setPanelOpen]         = useState(false);

  // Refs para comparar sin causar re-renders
  // { [convId]: { ts: string, unread: number, preview: string } }
  const prevConvData     = useRef({});
  const prevContactCount = useRef(null);
  const initialized      = useRef(false);
  const pollTimerRef     = useRef(null);

  // ── Agregar notificación ───────────────────────────────────────────────────
  const addNotification = useCallback((type, title, body, meta = {}) => {
    const n = {
      id: Date.now() + Math.random(),
      type,   // 'message' | 'contact'
      title,
      body,
      meta,
      ts: new Date(),
      read: false,
    };
    setNotifications(prev => [n, ...prev].slice(0, 50)); // max 50
    setUnreadCount(c => c + 1);

    // Notificación nativa del browser si tiene permiso
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/components/image/logo.png' });
    }
  }, []);

  // ── Polling ────────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!empresaId || !isClientRole) {
      console.debug('[Notif] poll abortado — empresaId:', empresaId, 'isClientRole:', isClientRole);
      return;
    }

    // ── Conversaciones ────────────────────────────────────────────────────
    try {
      const convData = await inboxAPI.getConversations(empresaId, {});
      const convs = Array.isArray(convData)
        ? convData
        : (convData.conversaciones ?? convData.data ?? []);


      if (!initialized.current) {
        convs.forEach(c => {
          prevConvData.current[c.id] = {
            ts:      c.ultimo_mensaje_en || c.updated_at || c.updatedAt || '',
            unread:  c.mensajes_no_leidos ?? 0,
            preview: c.ultimo_mensaje || '',
          };
        });
      } else {
        convs.forEach(c => {
          const cid        = c.id;
          const nombre     = c.contacto_nombre || c.telefono_whatsapp || 'Desconocido';
          const preview    = c.ultimo_mensaje || '';
          const currTs     = c.ultimo_mensaje_en || c.updated_at || c.updatedAt || '';
          const currUnread = c.mensajes_no_leidos ?? 0;
          const prev       = prevConvData.current[cid];

          const tsChanged      = currTs && currTs !== prev?.ts;
          const previewChanged = preview && preview !== prev?.preview;
          const unreadGrew     = currUnread > (prev?.unread ?? 0);

          if (!prev) {
            addNotification('message', `Nuevo mensaje de ${nombre}`, preview, { convId: cid });
          } else if (tsChanged || previewChanged || unreadGrew) {
            addNotification('message', `Nuevo mensaje de ${nombre}`, preview, { convId: cid });
          }

          prevConvData.current[cid] = { ts: currTs, unread: currUnread, preview };
        });
      }
    } catch (err) {
      console.log('[Notif] ERROR conversaciones:', err?.response?.status, err?.message);
    }

    // ── Contactos ─────────────────────────────────────────────────────────
    try {
      const ctData = await clientAPI.getContacts(empresaId);
      const cts = Array.isArray(ctData) ? ctData : (ctData.contactos ?? ctData.data ?? []);

      if (!initialized.current) {
        prevContactCount.current = cts.length;
      } else if (cts.length > (prevContactCount.current ?? 0)) {
        const diff   = cts.length - prevContactCount.current;
        const sorted = [...cts].sort((a, b) =>
          new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)
        );
        for (let i = 0; i < Math.min(diff, 3); i++) {
          const c = sorted[i];
          const nombre = c.nombre || c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sin nombre';
          addNotification('contact', 'Nuevo contacto creado', nombre, { contactId: c.id });
        }
        prevContactCount.current = cts.length;
      }
    } catch (err) {
      console.debug('[Notif] error en contactos:', err?.response?.status, err?.message);
    }

    initialized.current = true;
  }, [empresaId, isClientRole, addNotification]);


  // ── Inicializar ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !isClientRole || !empresaId) return;

    // Pedir permiso de notificaciones
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Primera carga (establece baseline)
    poll();

    // Iniciar polling
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      clearInterval(pollTimerRef.current);
      initialized.current = false;
      prevConvData.current = {};
      prevContactCount.current = null;
    };
  }, [isAuthenticated, isClientRole, empresaId]); // eslint-disable-line

  // ── Acciones ───────────────────────────────────────────────────────────────
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      panelOpen, setPanelOpen,
      markAllRead, markRead, clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications debe usarse dentro de NotificationProvider');
  return ctx;
};
