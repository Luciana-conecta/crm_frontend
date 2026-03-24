import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api, aiAPI } from '../../services/api';

const INTENT_LABELS = {
  consulta_precio:  { label: 'Consulta de precio',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  pedido_demo:      { label: 'Solicitud de demo',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  queja:            { label: 'Queja / Reclamo',     color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  interes_general:  { label: 'Interés general',     color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  intencion_compra: { label: 'Intención de compra', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

const Inbox = () => {
  const { user, impersonatedEmpresa } = useAuth();
  const empresaId = impersonatedEmpresa?.empresa_id || impersonatedEmpresa?.id || user?.empresa_id;
  
  // Estados
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, assigned
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);

  // IA
  const [aiSuggestion, setAiSuggestion] = useState(null); // { contenido, intent }
  const [loadingAI, setLoadingAI] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // Cargar conversaciones al montar
  useEffect(() => {
    if (empresaId) {
      loadConversations();
      // Polling cada 5 segundos para nuevos mensajes
      const interval = setInterval(loadConversations, 5000);
      return () => clearInterval(interval);
    }
  }, [empresaId, filter, searchTerm]);

  // Auto-seleccionar el primer chat solo si no hay ninguno activo
  useEffect(() => {
    if (conversations.length > 0 && !activeChat) {
      setActiveChat(conversations[0].id);
    }
  }, [conversations]);

  // Cargar mensajes cuando cambia el chat activo
  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat);
      setAiSuggestion(null); // limpiar sugerencia al cambiar de chat
    }
  }, [activeChat]);

  // Scroll al último mensaje cuando llegan mensajes nuevos
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Scroll instantáneo (sin animación) al cambiar de chat
  useEffect(() => {
    if (activeChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [activeChat]);

  // ============================================
  // FUNCIONES DE CARGA
  // ============================================
  const loadConversations = async () => {
    try {
      const params = {};
      
      if (filter === 'unread') {
        params.estado = 'abierta';
      } else if (filter === 'assigned') {
        params.asignado_a = user.id;
      }
      
      if (searchTerm) {
        params.busqueda = searchTerm;
      }

      const response = await api.inbox.getConversations(empresaId, params);
      setConversations(response.conversaciones || []);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('❌ Error cargando conversaciones:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMessages = async (conversacionId) => {
    try {
      const response = await api.inbox.getMessages(empresaId, conversacionId);
      setMessages(response.mensajes || []);

      // Marcar como leído
      await api.inbox.markAsRead(empresaId, conversacionId);
    } catch (error) {
      console.error('❌ Error cargando mensajes:', error);
    }
  };

  // ============================================
  // FUNCIONES DE ENVÍO
  // ============================================
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageText.trim() || !activeChat) return;

    setSending(true);
    
    try {
      const messageData = {
        conversacionId: activeChat,
        contenido: messageText.trim(),
        tipo: 'text'
      };

      await api.inbox.sendMessage(empresaId, activeChat, messageData);
      
      // Limpiar input
      setMessageText('');
      
      // Recargar mensajes
      await loadMessages(activeChat);
      
      // Recargar lista de conversaciones para actualizar timestamp
      await loadConversations();
      
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      alert('Error al enviar mensaje. Por favor intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (!activeChat) return;

    try {
      await api.inbox.updateConversationStatus(empresaId, activeChat, {
        estado: 'resuelta'
      });
      
      // Recargar conversaciones
      await loadConversations();
      
      alert('✅ Conversación marcada como resuelta');
    } catch (error) {
      console.error('❌ Error resolviendo conversación:', error);
    }
  };


  const handleAISuggest = async () => {
    if (!activeChat || loadingAI) return;
    setLoadingAI(true);
    setAiSuggestion(null);
    try {
      const context = messages.slice(-10).map(m => ({
        rol: m.direccion === 'saliente' ? 'asistente' : 'usuario',
        contenido: m.contenido,
      }));
      const result = await aiAPI.getSuggestion(empresaId, {
        conversacionId: activeChat,
        mensajes: context,
      });
      const d = result?.data || result;
      setAiSuggestion({
        contenido: d.sugerencia || d.contenido || d.respuesta || '',
        intent:    d.intencion  || d.intent    || null,
      });
    } catch (err) {
      const status = err?.response?.status;
      const msg    = err?.response?.data?.error || err?.message || '';
      const errorText =
        status === 403
          ? (msg || 'El asistente IA está desactivado. Actívalo en Configuración → Asistente IA.')
          : status === 401
          ? 'Tu sesión expiró. Por favor vuelve a iniciar sesión.'
          : msg || 'El servicio de IA no está disponible. Verifica la configuración del asistente.';
      setAiSuggestion({ contenido: '', intent: null, error: errorText });
    } finally {
      setLoadingAI(false);
    }
  };

  const handleTransferToHuman = async () => {
    if (!activeChat || transferring) return;
    setTransferring(true);
    try {
      await aiAPI.transferToHuman(activeChat);
      setAiSuggestion(null);
      alert('✅ Conversación transferida a un agente humano.');
    } catch {
      alert('No se pudo transferir. Asegúrate de que el backend soporta esta acción.');
    } finally {
      setTransferring(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    
    return date.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' });
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('es-PY', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDateLabel = (timestamp) => {
    if (!timestamp) return null;
    const d = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString())       return 'Hoy';
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getMsgDateKey = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };

  const getActiveConversation = () => {
    return conversations.find(c => c.id === activeChat);
  };


  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-sub-light">Cargando conversaciones...</p>
        </div>
      </div>
    );
  }

  const activeConversation = getActiveConversation();

  return (
    <div className="flex h-full w-full min-w-0 bg-background-light dark:bg-[#0d121c] overflow-hidden">
      <aside className="w-80 lg:w-96 bg-surface-light dark:bg-[#151b26] border-r border-border-light dark:border-border-dark flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-text-main-light dark:text-white">
              Mensajes
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => { setRefreshing(true); loadConversations(); }}
                disabled={refreshing}
                className="text-text-sub-light hover:text-primary transition-colors disabled:opacity-50"
                title="Refrescar"
              >
                <span className={`material-symbols-outlined ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-sub-light dark:text-gray-500 text-[18px]">
              search
            </span>
            <input 
              type="text" 
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all dark:text-white placeholder-text-sub-light"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 ${
                filter === 'all'
                  ? 'bg-text-main-light dark:bg-white text-white dark:text-text-main-light'
                  : 'bg-gray-100 dark:bg-gray-800 text-text-sub-light'
              }`}
            >
              Todas ({conversations.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 ${
                filter === 'unread'
                  ? 'bg-text-main-light dark:bg-white text-white dark:text-text-main-light'
                  : 'bg-gray-100 dark:bg-gray-800 text-text-sub-light'
              }`}
            >
              Nuevas
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-text-sub-light">
              <span className="material-symbols-outlined text-5xl mb-4 opacity-20">
                chat_bubble_outline
              </span>
              <p className="text-sm">No hay conversaciones</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div 
                key={conv.id}
                onClick={() => setActiveChat(conv.id)}
                className={`p-4 cursor-pointer border-l-4 transition-all ${
                  activeChat === conv.id
                    ? 'bg-primary/5 border-primary dark:bg-primary/10' 
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {conv.foto_perfil ? (
                        <img 
                          src={conv.foto_perfil} 
                          alt={conv.contacto_nombre}
                          className="size-10 rounded-full ring-2 ring-white dark:ring-gray-800 object-cover"
                        />
                      ) : (
                        <div className="size-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                          <span className="text-green-600 dark:text-green-400 font-black text-sm">
                            {conv.contacto_nombre?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      {conv.mensajes_no_leidos > 0 && (
                        <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">
                          {conv.mensajes_no_leidos}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-main-light dark:text-white leading-none">
                        {conv.contacto_nombre || conv.telefono_whatsapp}
                      </h4>
                      <p className="text-[10px] text-text-sub-light dark:text-gray-500 mt-1 uppercase font-bold">
                        {formatTime(conv.ultimo_mensaje_en)}
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-green-500 text-[18px]">
                    chat
                  </span>
                </div>
                
                <p className={`text-sm line-clamp-2 ${
                  activeChat === conv.id 
                    ? 'text-text-main-light dark:text-white font-medium' 
                    : 'text-text-sub-light'
                }`}>
                  {conv.ultimo_mensaje || 'Sin mensajes'}
                </p>
                
                {conv.estado && (
                  <div className="flex gap-2 mt-3">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      conv.estado === 'abierta' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {conv.estado}
                    </span>
                    {conv.canal_nombre && (
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-blue-100 text-blue-700">
                        {conv.canal_nombre}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ========================================
          CHAT AREA
          ======================================== */}
      <main className="flex-1 flex flex-col relative min-w-0 bg-white dark:bg-[#0d121c]">
        {!activeConversation ? (
          <div className="flex-1 flex items-center justify-center text-text-sub-light">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-20">
                chat_bubble_outline
              </span>
              <p>Selecciona una conversación para comenzar</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="h-16 px-6 bg-surface-light dark:bg-[#151b26] border-b border-border-light dark:border-border-dark flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3">
                {activeConversation.foto_perfil ? (
                  <img 
                    src={activeConversation.foto_perfil} 
                    alt={activeConversation.contacto_nombre}
                    className="size-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 font-black">
                      {activeConversation.contacto_nombre?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-text-main-light dark:text-white">
                      {activeConversation.contacto_nombre || activeConversation.telefono_whatsapp}
                    </h3>
                  </div>
                  <p className="text-[10px] text-text-sub-light font-bold uppercase tracking-wider">
                    via WhatsApp • {activeConversation.canal_nombre}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleResolve}
                  className="px-5 py-2 bg-green-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-green-600 transition-all"
                >
                  Resolver
                </button>
              </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-text-sub-light">
                  <p>No hay mensajes en esta conversación</p>
                </div>
              ) : (
                messages.map((msg, idx) => {

                  const isMe = msg.direccion === 'saliente';
                  const intentInfo = !isMe && msg.intencion && INTENT_LABELS[msg.intencion];
                  const ts = msg.timestamp ?? msg.created_at ?? msg.fecha;
                  const currentKey = getMsgDateKey(ts);
                  const prevKey = idx > 0 ? getMsgDateKey(messages[idx - 1]?.timestamp ?? messages[idx - 1]?.created_at ?? messages[idx - 1]?.fecha) : null;
                  const showDateDivider = currentKey && currentKey !== prevKey;

                  return (
                    <React.Fragment key={msg.id ?? idx}>
                      {showDateDivider && (
                        <div className="flex items-center gap-3 my-2 px-2">
                          <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-text-sub-light dark:text-text-sub-dark px-3 py-1 rounded-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark whitespace-nowrap capitalize">
                            {getDateLabel(ts)}
                          </span>
                          <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
                        </div>
                      )}
                    <div
                      className={`flex gap-4 max-w-[80%] ${isMe ? 'self-end flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      {!isMe && (
                        <div className="size-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-black text-xs shrink-0 mt-1">
                          {activeConversation.contacto_nombre?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      {isMe && (
                        <div className="size-9 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-black shrink-0 mt-1">
                          {user.name?.[0]?.toUpperCase() || 'YO'}
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : ''}`}>
                        <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                          isMe 
                            ? 'bg-primary text-white rounded-tr-none' 
                            : 'bg-white dark:bg-[#1a202c] border border-border-light dark:border-gray-800 text-text-main-light dark:text-gray-200 rounded-tl-none'
                        }`}>
                          {msg.contenido}
                        </div>
                        
                        <div className="flex items-center gap-2 px-1 flex-wrap">
                          <span className="text-[10px] font-bold text-text-sub-light uppercase">
                            {formatMessageTime(msg.timestamp)}
                          </span>
                          {isMe && msg.estado && (
                            <span className="text-[10px] text-text-sub-light capitalize">
                              • {msg.estado}
                            </span>
                          )}
                          {intentInfo && (
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${intentInfo.color}`}>
                              {intentInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    </React.Fragment>
                  );
                })
              )}
              {/* Anchor para scroll automático al último mensaje */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-surface-light dark:bg-[#151b26] border-t border-border-light dark:border-border-dark shrink-0 space-y-3">

              {/* ── Panel de sugerencia IA ── */}
              {(aiSuggestion || loadingAI) && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-lg bg-blue-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-[14px]">smart_toy</span>
                      </div>
                      <span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                        Sugerencia del Asistente
                      </span>
                      {aiSuggestion?.intent && INTENT_LABELS[aiSuggestion.intent] && (
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${INTENT_LABELS[aiSuggestion.intent].color}`}>
                          {INTENT_LABELS[aiSuggestion.intent].label}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setAiSuggestion(null)}
                      className="text-text-sub-light hover:text-text-main-light transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  {loadingAI ? (
                    <div className="flex items-center gap-2 text-text-sub-light">
                      <span className="material-symbols-outlined animate-spin text-[18px] text-blue-600">refresh</span>
                      <span className="text-xs">Generando respuesta...</span>
                    </div>
                  ) : aiSuggestion?.error ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{aiSuggestion.error}</p>
                  ) : (
                    <>
                      <p className="text-sm text-text-main-light dark:text-gray-200 bg-white dark:bg-[#151b26] rounded-xl p-3 border border-blue-100 dark:border-blue-900 leading-relaxed">
                        {aiSuggestion?.contenido || '—'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {aiSuggestion?.contenido && (
                          <button
                            onClick={() => {
                              setMessageText(aiSuggestion.contenido);
                              setAiSuggestion(null);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            Usar esta respuesta
                          </button>
                        )}
                        <button
                          onClick={handleTransferToHuman}
                          disabled={transferring}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-xs font-bold text-text-main-light dark:text-white rounded-xl hover:bg-orange-50 hover:border-orange-400 hover:text-orange-600 dark:hover:bg-orange-900/20 dark:hover:text-orange-400 transition-all"
                        >
                          <span className="material-symbols-outlined text-[14px]">support_agent</span>
                          {transferring ? 'Transfiriendo...' : 'Transferir a humano'}
                        </button>
                        {aiSuggestion?.contenido && (
                          <button
                            onClick={handleAISuggest}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-text-sub-light hover:text-blue-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">refresh</span>
                            Regenerar
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              <form onSubmit={handleSendMessage}>
                <div className="bg-gray-50 dark:bg-[#0d121c] border border-border-light dark:border-gray-800 rounded-2xl p-2 flex flex-col focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    disabled={sending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    className="w-full bg-transparent border-none p-4 text-sm text-text-main-light dark:text-white placeholder-text-sub-light focus:ring-0 resize-none h-16"
                    placeholder="Escribe un mensaje..."
                  />
                  <div className="flex justify-between items-center px-2 pb-1">
                    <div className="flex gap-1">
                      <button type="button" className="p-2 text-text-sub-light hover:text-primary transition-all">
                        <span className="material-symbols-outlined text-[20px]">attach_file</span>
                      </button>
                      <button type="button" className="p-2 text-text-sub-light hover:text-primary transition-all">
                        <span className="material-symbols-outlined text-[20px]">image</span>
                      </button>
                      {/* Botón IA */}
                      <button
                        type="button"
                        onClick={handleAISuggest}
                        disabled={loadingAI}
                        title="Sugerir respuesta con IA"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 ml-1"
                      >
                        {loadingAI
                          ? <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                          : <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                        }
                        IA
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={sending || !messageText.trim()}
                      className="size-10 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending
                        ? <span className="material-symbols-outlined animate-spin">refresh</span>
                        : <span className="material-symbols-outlined">send</span>
                      }
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </>
        )}
      </main>

      {/* ========================================
          CONTEXT PANEL (Contact Info)
          ======================================== */}
      {activeConversation && (
        <aside className="hidden xl:flex w-80 bg-surface-light dark:bg-[#151b26] border-l border-border-light dark:border-border-dark flex-col overflow-y-auto shrink-0 transition-colors">
          <div className="p-8 flex flex-col items-center border-b border-gray-100 dark:border-gray-800">
            {activeConversation.foto_perfil ? (
              <img 
                src={activeConversation.foto_perfil} 
                alt={activeConversation.contacto_nombre}
                className="size-24 rounded-full ring-4 ring-gray-50 dark:ring-gray-800 mb-4 shadow-xl object-cover"
              />
            ) : (
              <div className="size-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center ring-4 ring-gray-50 dark:ring-gray-800 mb-4 shadow-xl">
                <span className="text-green-600 dark:text-green-400 font-black text-3xl">
                  {activeConversation.contacto_nombre?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            
            <h3 className="text-xl font-black text-text-main-light dark:text-white leading-none">
              {activeConversation.contacto_nombre || 'Sin nombre'}
            </h3>
            <p className="text-sm text-text-sub-light dark:text-gray-500 mt-2 font-medium">
              {activeConversation.telefono_whatsapp}
            </p>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-text-sub-light uppercase tracking-widest">
                Detalles de Conversación
              </h4>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-text-sub-light text-[20px]">
                    schedule
                  </span>
                  <div>
                    <p className="text-sm font-bold text-text-main-light dark:text-gray-200">
                      Último mensaje
                    </p>
                    <p className="text-xs text-text-sub-light">
                      {formatTime(activeConversation.ultimo_mensaje_en)}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 items-center">
                  <span className="material-symbols-outlined text-text-sub-light text-[20px]">
                    chat
                  </span>
                  <div>
                    <p className="text-sm font-bold text-text-main-light dark:text-gray-200">
                      Estado
                    </p>
                    <p className="text-xs text-text-sub-light capitalize">
                      {activeConversation.estado}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

export default Inbox;