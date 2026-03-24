import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const Inbox = () => {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, assigned
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isAuthenticated && user?.empresa_id) {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ Inbox: No hay token disponible, esperando...');
        setLoading(false);
        return;
      }

      loadConversations();
      const interval = setInterval(loadConversations, 5000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [user, filter, searchTerm, isAuthenticated]);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat);
    }
  }, [activeChat]);

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
      const response = await api.inbox.getConversations(user.empresa_id, params);
      setConversations(response.conversaciones || []);
      if (response.conversaciones?.length > 0 && !activeChat) {
        setActiveChat(response.conversaciones[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ Error cargando conversaciones:', error);
      setLoading(false);
    }
  };

  const loadMessages = async (conversacionId) => {
    try {
      const response = await api.inbox.getMessages(user.empresa_id, conversacionId);
      setMessages(response.mensajes || []);
      await api.inbox.markAsRead(user.empresa_id, conversacionId);
    } catch (error) {
      console.error('❌ Error cargando mensajes:', error);
    }
  };

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

      await api.inbox.sendMessage(user.empresa_id, activeChat, messageData);
      setMessageText('');
      await loadMessages(activeChat);
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
      await api.inbox.updateConversationStatus(user.empresa_id, activeChat, {
        estado: 'resuelta'
      });
      await loadConversations();
      alert('✅ Conversación marcada como resuelta');
    } catch (error) {
      console.error('❌ Error resolviendo conversación:', error);
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
                onClick={loadConversations}
                className="text-text-sub-light hover:text-primary transition-colors"
                title="Refrescar"
              >
                <span className="material-symbols-outlined">refresh</span>
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

            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-text-sub-light">
                  <p>No hay mensajes en esta conversación</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.direccion === 'saliente';
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex gap-4 max-w-[80%] ${isMe ? 'self-end flex-row-reverse' : ''}`}
                    >
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

                      <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : ''}`}>
                        <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                          isMe 
                            ? 'bg-primary text-white rounded-tr-none' 
                            : 'bg-white dark:bg-[#1a202c] border border-border-light dark:border-gray-800 text-text-main-light dark:text-gray-200 rounded-tl-none'
                        }`}>
                          {msg.contenido}
                        </div>
                        
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-[10px] font-bold text-text-sub-light uppercase">
                            {formatMessageTime(msg.timestamp)}
                          </span>
                          {isMe && msg.estado && (
                            <span className="text-[10px] text-text-sub-light capitalize">
                              • {msg.estado}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form 
              onSubmit={handleSendMessage}
              className="p-6 bg-surface-light dark:bg-[#151b26] border-t border-border-light dark:border-border-dark shrink-0"
            >
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
                    <button 
                      type="button"
                      className="p-2 text-text-sub-light hover:text-primary transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">attach_file</span>
                    </button>
                    <button 
                      type="button"
                      className="p-2 text-text-sub-light hover:text-primary transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">image</span>
                    </button>
                  </div>
                  <button 
                    type="submit"
                    disabled={sending || !messageText.trim()}
                    className="size-10 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                    ) : (
                      <span className="material-symbols-outlined">send</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </main>


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