import axios from 'axios';
import { storage } from '../utils/memoryStorage';

const API_BASE_URL = '/api';
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      config.headers.Authorization = `Bearer ${token}`;
    } 
    return config;
  },
  (error) => {
    console.error(' Error en interceptor request:', error);
    return Promise.reject(error);
  }
);


apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);


export const authAPI = {
  login: async (credentials) => {
    try {
      const { email, password } = credentials;      
      const response = await apiClient.post('/auth/login', { email, password });      
      return response.data;
    } catch (error) {
      console.error(' API: Error en login:', error.response?.data || error.message);
      
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || 'Error de conexión con el servidor';
      
      throw new Error(errorMessage);
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      storage.removeItem('accessToken');
      storage.removeItem('refreshToken');
      storage.removeItem('crm_empresa_id');
    }
  }
};

export const adminAPI = {
  getStats: async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },

  getCompanies: async () => {
    const response = await apiClient.get('/admin/empresas');
    return response.data;
  },

  getCompanyById: async (id) => {
    const response = await apiClient.get(`/admin/empresas/${id}`);
    return response.data;
  },

  createCompany: async (companyData) => {
    const response = await apiClient.post('/admin/empresas', companyData);
    return response.data;
  },

  updateCompany: async (id, companyData) => {
    const response = await apiClient.put(`/admin/empresas/${id}`, companyData);
    return response.data;
  },

  deleteCompany: async (id) => {
    const response = await apiClient.delete(`/admin/empresas/${id}`);
    return response.data;
  },

  getPlans: async () => {
    const response = await apiClient.get('/admin/planes');
    return response.data;
  },

  createPlan: async (data) => {
    const response = await apiClient.post('/admin/planes', data);
    return response.data;
  },

  updatePlan: async (id, data) => {
    const response = await apiClient.put(`/admin/planes/${id}`, data);
    return response.data;
  },

  deletePlan: async (id) => {
    const response = await apiClient.delete(`/admin/planes/${id}`);
    return response.data;
  },

  getPagos: async (empresaId) => {
    const url = empresaId ? `/admin/pagos?empresaId=${empresaId}` : '/admin/pagos';
    const response = await apiClient.get(url);
    return response.data;
  },

  createPago: async (data) => {
    const response = await apiClient.post('/admin/pagos', data);
    return response.data;
  },

  updatePago: async (id, data) => {
    const response = await apiClient.put(`/admin/pagos/${id}`, data);
    return response.data;
  },

  deletePago: async (id) => {
    const response = await apiClient.delete(`/admin/pagos/${id}`);
    return response.data;
  },

  getUsers: async (empresaId) => {
    const response = await apiClient.get(`/empresa/${empresaId}/user`);
    return response.data;
  },

  getUserById: async (empresaId) => {
    const response = await apiClient.get(`/empresa/${empresaId}/user`);
    return response.data;
  },

  createUser: async (empresaId,userData) => {
    const response = await apiClient.post(`/empresa/${empresaId}/user`, userData);
    return response.data;
  },

  updateUser: async (empresaId,id, userData) => {
    const response = await apiClient.put(`/empresa/${empresaId}/user/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id, empresaId) => {
    const response = await apiClient.delete(`/empresa/${empresaId}/user/${id}`);
    return response.data;
  }
};


export const clientAPI = {
  getRoles: async () => {
    const response = await apiClient.get('/empresa/roles');
    return response.data;
  },

  getStats: async (empresaId) => {
    const response = await apiClient.get(`/empresa/${empresaId}/stats`);
    return response.data;
  },

  getContacts: async (empresaId) => {
    const response = await apiClient.get(`/empresa/${empresaId}/contactos`);
    return response.data;
  },

   getContactById: async (empresaId,contactId) => {
    const response = await apiClient.get(`/empresa/${empresaId}/contactos/${contactId}`);
    return response.data;
  },

  createContact: async (empresaId, contactData) => {
    const response = await apiClient.post(`/empresa/${empresaId}/contactos`, contactData);
    return response.data;
  },

  updateContact: async (empresaId, contactId, contactData) => {
    const response = await apiClient.put(`/empresa/${empresaId}/contactos/${contactId}`, contactData);
    return response.data;
  },

  deleteContact: async (empresaId, contactId) => {
    const response = await apiClient.delete(`/empresa/${empresaId}/contactos/${contactId}`);
    return response.data;
  },

  getConversations: async (empresaId) => {
    const response = await apiClient.get(`/empresa/${empresaId}/conversaciones`);
    return response.data;
  },

  getConversationById: async (empresaId, conversacionId) => {
    const response = await apiClient.get(`/empresa/${empresaId}/conversaciones/${conversacionId}`);
    return response.data;
  },

  getMessages: async (empresaId, conversacionId) => {
    const response = await apiClient.get(`/empresa/${empresaId}/conversaciones/${conversacionId}/mensajes`);
    return response.data;
  },

  sendMessage: async (empresaId, conversacionId, messageData) => {
    const response = await apiClient.post(
      `/empresa/${empresaId}/conversaciones/${conversacionId}/mensajes`,
      messageData
    );
    return response.data;
  },

  getTeamMembers: async (empresaId) => {
    const response = await apiClient.get(`/empresa/${empresaId}/user`);
    return response.data;
  },

  createTeamMember: async (empresaId, memberData) => {
    const response = await apiClient.post(`/empresa/${empresaId}/user`, memberData);
    return response.data;
  },

  updateTeamMember: async (empresaId, memberId, memberData) => {
    const response = await apiClient.put(`/empresa/${empresaId}/user/${memberId}`, memberData);
    return response.data;
  },

  deleteTeamMember: async (empresaId, memberId) => {
    const response = await apiClient.delete(`/empresa/${empresaId}/user/${memberId}`);
    return response.data;
  }
};

export const inboxAPI = {
  getConversations: async (empresaId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `/whatsapp/empresas/${empresaId}/conversaciones${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  getMessages: async (empresaId, conversacionId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `/whatsapp/conversaciones/${conversacionId}/mensajes${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  sendMessage: async (empresaId, conversacionId, messageData) => {
    const url = `/whatsapp/conversaciones/enviar`;
    const response = await apiClient.post(url, {
      conversacionId,
      ...messageData
    });
    return response.data;
  },

  updateCompanyLogo: async (empresaId, logoUrl) => {
    const response = await apiClient.put(`/empresa/${empresaId}/logo`, { logo: logoUrl });
    return response.data;
  },

  updateConversationStatus: async (empresaId, conversacionId, data) => {
    const url = `/whatsapp/conversaciones/${conversacionId}`;
    const response = await apiClient.patch(url, data);
    return response.data;
  },

  markAsRead: async (empresaId, conversacionId) => {
    const url = `/whatsapp/conversaciones/${conversacionId}/marcar-leido`;
    const response = await apiClient.post(url);
    return response.data;
  },

  // WhatsApp channels (canales)
  getCanales: async (empresaId) => {
    const response = await apiClient.get(`/whatsapp/empresas/${empresaId}/canales`);
    return response.data;
  },

  createCanal: async (empresaId, data) => {
    const response = await apiClient.post(`/whatsapp/empresas/${empresaId}/canales`, data);
    return response.data;
  },

  updateCanal: async (empresaId, canalId, data) => {
    const response = await apiClient.put(`/whatsapp/canales/${canalId}`, data);
    return response.data;
  },

  deleteCanal: async (empresaId, canalId) => {
    const response = await apiClient.delete(`/whatsapp/canales/${canalId}`);
    return response.data;
  },

  testCanal: async (canalId) => {
    const response = await apiClient.post(`/whatsapp/canales/${canalId}/probar`);
    return response.data;
  }
};


export const socialAPI = {
  getCanales: async (empresaId, tipo) => {
    const response = await apiClient.get(`/social/empresas/${empresaId}/canales?tipo=${tipo}`);
    return response.data;
  },
  createCanal: async (empresaId, data) => {
    const response = await apiClient.post(`/social/empresas/${empresaId}/canales`, data);
    return response.data;
  },
  updateCanal: async (canalId, data) => {
    const response = await apiClient.put(`/social/canales/${canalId}`, data);
    return response.data;
  },
  deleteCanal: async (canalId) => {
    const response = await apiClient.delete(`/social/canales/${canalId}`);
    return response.data;
  },
};

export const aiAPI = {
  getConfig: async (empresaId) => {
    const response = await apiClient.get(`/ia/empresa/${empresaId}/config`);
    return response.data;
  },
  saveConfig: async (empresaId, config) => {
    const response = await apiClient.post(`/ia/empresa/${empresaId}/config`, config);
    return response.data;
  },
  getSuggestion: async (empresaId, data) => {
    // data: { conversacionId, mensajes, contexto }
    const response = await apiClient.post(`/ia/empresa/${empresaId}/sugerir`, data);
    return response.data;
  },
  classifyIntent: async (empresaId, data) => {
    const response = await apiClient.post(`/ia/empresa/${empresaId}/clasificar`, data);
    return response.data;
  },
  transferToHuman: async (conversacionId) => {
    const response = await apiClient.post(`/whatsapp/conversaciones/${conversacionId}/transferir-humano`);
    return response.data;
  },
};

export const api = {
  auth: authAPI,
  admin: adminAPI,
  client: clientAPI,
  inbox: inboxAPI,
  ai: aiAPI,
  social: socialAPI,
};

export default apiClient;