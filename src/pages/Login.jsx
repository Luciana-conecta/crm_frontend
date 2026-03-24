// src/pages/Login/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logoRealTime from '../../components/image/logo1.png';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('📝 Intentando login con:', { email });
      
      // ⭐ CAMBIO: Pasar solo el objeto { email, password }
      const userData = await login({ email, password });
      
      console.log('✅ Login exitoso:', userData);
      
      // Navegar según el tipo de usuario
      if (userData.tipo_usuario === 'super_admin') {
        navigate('/dashboard');
      } else if (userData.empresa_id) {
        navigate('/workspace');
      } else {
        navigate('/');
      }
      
    } catch (err) {
      console.error('❌ Error en handleSubmit:', err);
      setError(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full font-display">

      {/* LEFT PANEL - Dark branding */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-14 overflow-hidden" style={{ backgroundColor: '#2C2C2C' }}>
        {/* Subtle warm glow */}
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ backgroundColor: '#D4A574' }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <img src={logoRealTime} alt="Insignia logo" className="h-9 w-auto" />
          <span className="text-white/80 text-xl font-bold tracking-tight">Insignia CRM</span>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl font-black text-white leading-[1.15] tracking-tight">
            Gestiona cada<br />
            <span style={{ color: '#D4A574' }}>interacción</span> con<br />
            tu cliente.
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-sm">
            La plataforma todo-en-uno para equipos de ventas y atención al cliente en Paraguay.
          </p>
        </div>

        {/* Bottom credits */}
        <div className="flex items-center gap-3 relative z-10 border-t border-white/10 pt-8">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            Desarrollado por Insignia
          </span>
        </div>
      </div>

      {/* RIGHT PANEL - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8" style={{ backgroundColor: '#F5F1ED' }}>
        <div className="w-full max-w-[400px] space-y-8">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden mb-4">
            <img src={logoRealTime} alt="Insignia logo" className="h-8 w-auto" />
          </div>

          <div>
            <h2 className="text-3xl font-black tracking-tight text-text-main-light">
              Bienvenido de vuelta
            </h2>
            <p className="text-sm text-text-sub-light mt-1.5">
              Ingresá tus datos para acceder al panel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-2xl font-semibold bg-white text-text-main-light border border-border-light focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm placeholder-text-sub-light"
                style={{ '--tw-ring-color': '#D4A574' }}
              />

              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-2xl font-semibold bg-white text-text-main-light border border-border-light focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm placeholder-text-sub-light"
                style={{ '--tw-ring-color': '#D4A574' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 font-black rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide"
              style={{ backgroundColor: '#2C2C2C', color: '#FFFFFF' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                  Verificando...
                </span>
              ) : (
                'Entrar al Sistema'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-text-sub-light">
            ¿Problemas para ingresar?{' '}
            <a href="mailto:soporte@insignia.com.py" className="font-bold underline" style={{ color: '#D4A574' }}>
              Contactar soporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;