// src/features/auth/components/Login.tsx
import { useState } from 'react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login = ({ onLoginSuccess }: LoginProps) => {
  // Guardaremos el usuario en esta variable
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación temporal estricta
    if (usuario === 'Admin' && password === 'Admin') {
      onLoginSuccess(); // Credenciales correctas -> Entra al Dashboard
    } else {
      alert('Credenciales incorrectas. Por favor verifica tu usuario y contraseña.');
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
            <label className="form-label">Usuario</label>
            <input 
              type="text" /* Cambiado a text para que acepte palabras sin @ */
              className="form-control" 
              placeholder="Ej: Admin" 
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px', padding: '12px' }}>
            Iniciar Sesión
          </button>
          
        </form>
      </div>
    </div>
  );
};