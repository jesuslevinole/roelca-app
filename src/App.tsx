// src/App.tsx
import { useState } from 'react';
import { Login } from './features/auth/components/Login';
import OperacionesDashboard from './features/operaciones/components/OperacionesDashboard';
import EmpresasDashboard from './features/empresas/components/EmpresasDashboard';
import './App.css';

function App() {
  const [estaAutenticado, setEstaAutenticado] = useState(false);
  const [moduloActivo, setModuloActivo] = useState<'operaciones' | 'empresas'>('operaciones');
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  
  // NUEVO: Estado para controlar si el menú está abierto o cerrado
  const [menuAbierto, setMenuAbierto] = useState(true);

  if (!estaAutenticado) {
    return <Login onLoginSuccess={() => setEstaAutenticado(true)} />;
  }

  return (
    <div className="app-wrapper">
      
      {/* --- MENÚ LATERAL (Se le añade la clase 'collapsed' si está cerrado) --- */}
      <div className={`sidebar ${!menuAbierto ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <span style={{ color: '#D84315', marginRight: '8px' }}>■</span> Roelca Inc.
        </div>

        {/* Nombres actualizados según tu petición */}
        <div 
          className={`sidebar-item ${moduloActivo === 'operaciones' ? 'active' : ''}`} 
          onClick={() => setModuloActivo('operaciones')}
        >
          Operaciones
        </div>
        
        <div 
          className={`sidebar-item ${moduloActivo === 'empresas' ? 'active' : ''}`} 
          onClick={() => setModuloActivo('empresas')}
        >
          Clientes
        </div>

        <div className="sidebar-footer">
          <button className="btn-logout-sidebar" onClick={() => setEstaAutenticado(false)}>
            Log Out
          </button>
        </div>
      </div>

      {/* --- ÁREA PRINCIPAL --- */}
      <div className="main-area">
        
        {/* --- BARRA SUPERIOR (TOPBAR) --- */}
        <div className="topbar">
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* NUEVO: Botón de Hamburguesa para contraer/expandir el menú */}
            <button className="menu-toggle-btn" onClick={() => setMenuAbierto(!menuAbierto)} title="Ocultar/Mostrar Menú">
              ☰
            </button>
            
            <div className="search-container">
              <input 
                type="text" 
                className="search-input" 
                placeholder={moduloActivo === 'operaciones' ? "Buscar Operación..." : "Buscar Clientes..."} 
              />
            </div>
          </div>
          
          <div className="topbar-right" style={{ position: 'relative' }}>
            <span style={{ fontSize: '0.8rem', color: '#8b949e', marginRight: '16px' }}>Sync complete</span>
            <div className="notification-wrapper" title="Notificaciones" style={{ marginRight: '16px' }}>
              <span className="notification-icon">🔔</span>
              <span className="notification-badge">3</span>
            </div>
            
            <div className="avatar" style={{ cursor: 'pointer', backgroundColor: '#D84315', color: 'white', border: 'none' }} onClick={() => setPerfilAbierto(!perfilAbierto)}>
              JM
            </div>

            {perfilAbierto && (
              <div className="profile-dropdown">
                <div className="profile-header-info">
                  <div className="profile-avatar-large" style={{ backgroundColor: '#D84315', color: 'white' }}>JM</div>
                  <div className="profile-text">
                    <span className="profile-name">Jesus Molero</span>
                    <span className="profile-role">Admin</span>
                    <span className="profile-dept">Informática</span>
                  </div>
                </div>
                <div className="profile-actions">
                  <button className="btn-profile">Actualizar Foto de Perfil</button>
                  <button className="btn-profile">Configuración</button>
                  <button className="btn-profile logout" onClick={() => setEstaAutenticado(false)}>Cerrar Sesión</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- CONTENIDO DINÁMICO --- */}
        {moduloActivo === 'operaciones' && <OperacionesDashboard />}
        {moduloActivo === 'empresas' && <EmpresasDashboard />}
        
      </div>
    </div>
  );
}

export default App;