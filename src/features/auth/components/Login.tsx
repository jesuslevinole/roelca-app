// src/features/auth/components/Login.tsx
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../config/firebase'; 

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login = ({ onLoginSuccess }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      // Intenta iniciar sesión en Firebase con las credenciales ingresadas
      await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess(); // Credenciales correctas -> Entra al Dashboard
    } catch (err: any) {
      console.error(err);
      // Validaciones de error de Firebase
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Correo o contraseña incorrectos. Verifica tus datos.');
      } else {
        setError('Ocurrió un error al intentar iniciar sesión.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">
          <span style={{ color: '#D84315', marginRight: '8px' }}>■</span> 
          Roelca Inc.
        </div>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="usuario@roelca.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          {error && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={cargando} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px', padding: '12px', cursor: cargando ? 'not-allowed' : 'pointer' }}>
            {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
          
        </form>

        {/* --- BOTÓN DE BYPASS (ADMIN TEMPORAL) --- */}
        <div style={{ marginTop: '32px', borderTop: '1px solid #30363d', paddingTop: '24px', textAlign: 'center' }}>
          <p style={{ color: '#8b949e', fontSize: '0.75rem', marginBottom: '12px', textTransform: 'uppercase' }}>Opciones de Desarrollo</p>
          <button 
            type="button"
            onClick={onLoginSuccess} 
            style={{ background: 'transparent', border: '1px dashed #8b949e', color: '#8b949e', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#c9d1d9'; e.currentTarget.style.borderColor = '#c9d1d9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#8b949e'; e.currentTarget.style.borderColor = '#8b949e'; }}
          >
            Entrar como Admin (Bypass)
          </button>
        </div>

      </div>
    </div>
  );
};