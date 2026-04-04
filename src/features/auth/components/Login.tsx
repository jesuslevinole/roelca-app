// src/features/auth/components/Login.tsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
      // 1. Validar correo y contraseña en Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Traer el perfil del usuario para ver qué roles tiene asignados
      const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
      if (!userDoc.exists()) throw new Error("Perfil de usuario no encontrado.");
      const userData = userDoc.data();

      // 3. Traer la configuración de seguridad global (La IP de la Oficina)
      const configDoc = await getDoc(doc(db, 'configuracion', 'seguridad'));
      const ipOficina = configDoc.exists() ? configDoc.data().ipOficina : '';

      // 4. Verificar si alguno de sus roles requiere estar en la oficina
      let requiereEstarEnOficina = false;
      if (userData.roles && userData.roles.length > 0) {
        const rolesQuery = query(collection(db, 'catalogo_roles'), where('nombre', 'in', userData.roles));
        const rolesSnap = await getDocs(rolesQuery);
        
        rolesSnap.forEach((rolDoc) => {
          if (rolDoc.data().requiereIPOficina) {
            requiereEstarEnOficina = true;
          }
        });
      }

      // 5. EL CENTINELA: Si su rol exige oficina, comprobamos su IP actual
      if (requiereEstarEnOficina) {
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipRes.json();
          const userIPActual = ipData.ip;

          if (userIPActual !== ipOficina) {
            // ¡INTRUSO BLOQUEADO!
            await signOut(auth); // Cerramos la sesión que Firebase acababa de abrir
            await registrarLog('Seguridad', 'Bloqueo de Red', `Intento de acceso denegado para ${email}. IP detectada: ${userIPActual}`);
            setError('ACCESO DENEGADO. Por medidas de seguridad, tu rol solo permite iniciar sesión desde la red WiFi de la oficina de Roelca Inc.');
            setLoading(false);
            return; // Cortamos la ejecución aquí
          }
        } catch (fetchError) {
          // Si por alguna razón el bloqueador de anuncios del usuario bloquea la comprobación de IP
          await signOut(auth);
          setError('No pudimos verificar la seguridad de tu red. Desactiva tu bloqueador de anuncios (AdBlock) e intenta de nuevo.');
          setLoading(false);
          return;
        }
      }

      // 6. SI PASÓ TODAS LAS PRUEBAS: Lo dejamos entrar al sistema
      await updateDoc(doc(db, 'usuarios', user.uid), {
        isOnline: true,
        ultimoAcceso: new Date().toISOString()
      });

      await registrarLog('Sesión', 'Inicio de Sesión', 'El usuario ingresó exitosamente al sistema.');

      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("ACCESO DENEGADO")) {
        setError(err.message);
      } else {
        setError('Correo o contraseña incorrectos. Por favor, verifica tus datos.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', backgroundColor: '#010409', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="form-card" style={{ maxWidth: '400px', width: '100%', padding: '40px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '2.5rem', color: '#D84315', marginBottom: '16px' }}>■</div>
          <h1 style={{ color: '#f0f6fc', fontSize: '1.5rem', margin: '0 0 8px 0', fontWeight: '500' }}>Roelca Inc.</h1>
          <p style={{ color: '#8b949e', margin: 0, fontSize: '0.9rem' }}>Ingresa tus credenciales para acceder al sistema</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '16px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center', lineHeight: '1.5', fontWeight: '500' }}>
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
            {loading ? 'Verificando red y accesos...' : 'Iniciar Sesión'}
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