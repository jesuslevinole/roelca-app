// src/App.tsx
import { useState } from 'react';
import { Login } from './features/auth/components/Login';
import OperacionesDashboard from './features/operaciones/components/OperacionesDashboard';
import EmpresasDashboard from './features/empresas/components/EmpresasDashboard';
import TipoCambioDashboard from './features/tipoCambio/components/TipoCambioDashboard';
import './App.css';

function App() {
  const [estaAutenticado, setEstaAutenticado] = useState(false);
  const [moduloActivo, setModuloActivo] = useState<'operaciones' | 'empresas' | 'tipoCambio'>('operaciones');
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(true);
  
  // NUEVO: Estado para abrir/cerrar el submenú de Bases de Datos
  const [menuBasesDatosAbierto, setMenuBasesDatosAbierto] = useState(false);

  if (!estaAutenticado) {
    return <Login onLoginSuccess={() => setEstaAutenticado(true)} />;
  }

  return (
    <div className="app-wrapper">
      
      {/* --- MENÚ LATERAL --- */}
      <div className={`sidebar ${!menuAbierto ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <span style={{ color: '#D84315', marginRight: '8px' }}>■</span> Roelca Inc.
        </div>

        <div 
          className={`sidebar-item ${moduloActivo === 'operaciones' ? 'active' : ''}`} 
          onClick={() => setModuloActivo('operaciones')}
        >
          Operaciones
        </div>
        
        {/* ITEM DESPLEGABLE: Bases de Datos */}
        <div 
          className={`sidebar-item sidebar-item-with-icon ${(moduloActivo === 'empresas' || moduloActivo === 'tipoCambio') && !menuBasesDatosAbierto ? 'active' : ''}`} 
          onClick={() => setMenuBasesDatosAbierto(!menuBasesDatosAbierto)}
        >
          <span>Bases de Datos</span>
          <span style={{ fontSize: '0.7rem' }}>{menuBasesDatosAbierto ? '▼' : '▶'}</span>
        </div>

        {/* LOS SUB-ITEMS (Empresas y Tipo de Cambio) */}
        {menuBasesDatosAbierto && (
          <div className="sidebar-submenu">
            <div 
              className={`sidebar-subitem ${moduloActivo === 'empresas' ? 'active' : ''}`} 
              onClick={() => setModuloActivo('empresas')}
            >
              Empresas
            </div>
            <div 
              className={`sidebar-subitem ${moduloActivo === 'tipoCambio' ? 'active' : ''}`} 
              onClick={() => setModuloActivo('tipoCambio')}
            >
              Tipo de Cambio
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <button className="btn-logout-sidebar" onClick={() => setEstaAutenticado(false)}>
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* --- ÁREA PRINCIPAL --- */}
      <div className="main-area">
        
        {/* --- BARRA SUPERIOR (TOPBAR) --- */}
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="menu-toggle-btn" onClick={() => setMenuAbierto(!menuAbierto)} title="Ocultar/Mostrar Menú">
              ☰
            </button>
            <div className="search-container">
              <input 
                type="text" 
                className="search-input" 
                placeholder="Buscar..." 
              />
            </div>
          </div>
          
          <div className="topbar-right" style={{ position: 'relative' }}>
            <div className="notification-wrapper" title="Notificaciones" style={{ marginRight: '16px' }}>
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#8b949e' }}>
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
              </svg>
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
        {moduloActivo === 'tipoCambio' && <TipoCambioDashboard />}
        
      </div>
    </div>
  );
}

export default App;