// @refresh reset
// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

// Clave de backup del logo por empresa (sobrevive al logout)
const logoKey = (empresaId) => `empresa_logo_${empresaId}`;

// Inyecta el logo guardado en el backup dentro del objeto usuario
const mergeLogoIntoUser = (userData) => {
  if (!userData?.empresa_id) return userData;
  const storedLogo = localStorage.getItem(logoKey(userData.empresa_id));
  if (!storedLogo) return userData;
  return {
    ...userData,
    empresa: { ...(userData.empresa || {}), logo: storedLogo }
  };
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [impersonatedEmpresa, setImpersonatedEmpresa] = useState(null);

  // ============================================
  // CARGAR SESIÓN AL MONTAR
  // ============================================
  useEffect(() => {
    console.log('\n🔄 ==================== AUTH CONTEXT INIT ====================');
    console.log('🔍 AuthContext - Cargando sesión guardada');
    console.log('📍 Timestamp:', new Date().toISOString());

    // Ver TODO el localStorage
    console.log('🗄️ localStorage completo:', {...localStorage});

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    console.log('   Token guardado:', token ? 'SÍ ✅' : 'NO ❌');
    if (token) {
      console.log('   Token preview:', token.substring(0, 50) + '...');
    }
    console.log('   Usuario guardado:', storedUser ? 'SÍ ✅' : 'NO ❌');

    if (token && storedUser) {
      try {
        const parsedUser = mergeLogoIntoUser(JSON.parse(storedUser));
        setUser(parsedUser);
        setIsAuthenticated(true);
        console.log('✅ Sesión restaurada:', parsedUser);
        console.log('✅ Estado actualizado: isAuthenticated = true');
      } catch (e) {
        console.error('❌ Error parseando usuario:', e);
        logout();
      }
    } else {
      console.log('ℹ️ No hay sesión previa - Usuario debe hacer login');
    }

    setLoading(false);
    console.log('✅ AuthContext inicializado - loading = false');
    console.log('============================================================\n');
  }, []);

  // ============================================
  // LOGIN
  // ============================================
  const login = async (credentials) => {
    try {
      console.log('\n🔐 ==================== LOGIN ====================');
      console.log('📧 Credentials:', { email: credentials.email });
      
      const response = await api.auth.login(credentials);
      console.log('📥 Respuesta del servidor:', response);
      
      // Extraer datos (soportar diferentes estructuras)
      const userData = response.user || response.data;
      const token = response.token || response.tokens?.accessToken;
      
      console.log('👤 Usuario recibido:', userData);
      console.log('🔑 Token recibido:', token ? 'SÍ ✅' : 'NO ❌');
      
      if (!userData || !token) {
        console.error('❌ Datos incompletos en la respuesta');
        throw new Error('Respuesta inválida del servidor');
      }

      // ✅ GUARDAR EN LOCALSTORAGE (con la key correcta)
      console.log('💾 Guardando en localStorage...');
      localStorage.setItem('token', token);  // 👈 Key: "token"
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Guardar empresa_id si existe (puede venir directo o anidado en empresa.id)
      const eid = userData.empresa_id || userData.empresa?.id;
      if (eid) {
        localStorage.setItem('crm_empresa_id', eid.toString());
      }

      // Verificar que se guardó
      const tokenVerify = localStorage.getItem('token');
      const userVerify = localStorage.getItem('user');
      
      console.log('🔍 Verificación guardado:');
      console.log('  - Token guardado:', tokenVerify ? 'SÍ ✅' : 'NO ❌');
      console.log('  - User guardado:', userVerify ? 'SÍ ✅' : 'NO ❌');
      
      if (!tokenVerify || !userVerify) {
        throw new Error('Error guardando en localStorage');
      }

      // Actualizar estado de React (inyectando logo guardado si el backend no lo devolvió)
      console.log('📝 Actualizando estado...');
      const userWithLogo = mergeLogoIntoUser(userData);
      localStorage.setItem('user', JSON.stringify(userWithLogo));
      setUser(userWithLogo);
      setIsAuthenticated(true);
      
      console.log('✅ Login completado exitosamente');
      console.log('==============================================\n');
      
      return userData;
      
    } catch (error) {
      console.error('❌ Error en login:', error);
      console.log('==============================================\n');
      logout();
      throw error;
    }
  };

  // ============================================
  // LOGOUT
  // ============================================
  const logout = () => {
    console.log('🚪 Logout - Limpiando sesión');
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('crm_empresa_id');
    
    setUser(null);
    setIsAuthenticated(false);
  };

  // ============================================
  // UPDATE USER (para actualizar datos en sesión, ej: logo de empresa)
  // ============================================
  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // ============================================
  // IMPERSONACIÓN (Super Admin accede como empresa)
  // ============================================
  const startImpersonation = (empresa) => {
    setImpersonatedEmpresa(empresa);
  };

  const stopImpersonation = () => {
    setImpersonatedEmpresa(null);
  };

  // ============================================
  // CONTEXT VALUE
  // ============================================
  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    userRole: user?.tipo_usuario || null,
    impersonatedEmpresa,
    startImpersonation,
    stopImpersonation,
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background-light dark:bg-[#0d121c]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-sub-light">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};