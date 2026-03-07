// src/App.tsx
import { useState } from 'react';
import { Login } from './features/auth/components/Login';
import OperacionesDashboard from './features/operaciones/components/OperacionesDashboard';
import './App.css';

function App() {
  // Estado que controla si el usuario ha iniciado sesión
  const [estaAutenticado, setEstaAutenticado] = useState(false);

  return (
    <>
      {estaAutenticado ? (
        <OperacionesDashboard onLogout={() => setEstaAutenticado(false)} />
      ) : (
        <Login onLoginSuccess={() => setEstaAutenticado(true)} />
      )}
    </>
  );
}

export default App;