// src/features/auth/components/Login.tsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { registrarLog } from '../../../utils/logger';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateDoc(doc(db, 'usuarios', user.uid), {
        isOnline: true,
        ultimoAcceso: new Date().toISOString()
      });

      await registrarLog('Sesión', 'Inicio de Sesión', 'El usuario ingresó exitosamente al sistema.');

      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError('Correo o contraseña incorrectos. Por favor, verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // CONTENEDOR CORREGIDO: position: fixed y 100vw garantizan el centrado absoluto
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', backgroundColor: '#010409', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="form-card" style={{ maxWidth: '400px', width: '100%', padding: '40px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '2.5rem', color: '#D84315', marginBottom: '16px' }}>■</div>
          <h1 style={{ color: '#f0f6fc', fontSize: '1.5rem', margin: '0 0 8px 0', fontWeight: '500' }}>Roelca Inc.</h1>
          <p style={{ color: '#8b949e', margin: 0, fontSize: '0.9rem' }}>Ingresa tus credenciales para acceder al sistema</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#8b949e', fontSize: '0.85rem', marginBottom: '8px' }}>Correo Electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control" 
              placeholder="tu@correo.com"
              required 
              style={{ width: '100%', padding: '12px', backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9', borderRadius: '6px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', color: '#8b949e', fontSize: '0.85rem', marginBottom: '8px' }}>Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control" 
              placeholder="••••••••"
              required 
              style={{ width: '100%', padding: '12px', backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9', borderRadius: '6px' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '12px', backgroundColor: '#D84315', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #30363d', paddingTop: '24px' }}>
          <button 
            type="button" 
            onClick={onLoginSuccess}
            style={{ background: 'none', border: 'none', color: '#58a6ff', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Entrar como Admin (Bypass para pruebas)
          </button>
        </div>

      </div>
    </div>
  );
};