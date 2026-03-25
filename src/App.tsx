// src/App.tsx
import { useState } from 'react';
import { Login } from './features/auth/components/Login';
import OperacionesDashboard from './features/operaciones/components/OperacionesDashboard';
import EmpresasDashboard from './features/empresas/components/EmpresasDashboard';
import TipoCambioDashboard from './features/tipoCambio/components/TipoCambioDashboard';
import CatalogosDashboard from './features/catalogos/components/CatalogosDashboard';
import { CombustibleDashboard } from './features/combustible/components/CombustibleDashboard';
import ProveedoresUnidadDashboard from './features/proveedoresUnidad/components/ProveedoresUnidadDashboard';
import { UnidadesProveedorDashboard } from './features/unidadesProveedor/components/UnidadesProveedorDashboard';
import { ConveniosClientesDashboard } from './features/conveniosClientes/components/ConveniosClientesDashboard';
import { ConveniosProveedoresDashboard } from './features/conveniosProveedores/components/ConveniosProveedoresDashboard';

// NUEVA IMPORTACIÓN: Dashboard de Direcciones
import { DireccionesDashboard } from './features/direcciones/components/DireccionesDashboard';

import './App.css';

function App() {
  const [estaAutenticado, setEstaAutenticado] = useState(false);
  
  // CORRECCIÓN: Se añade 'direcciones' a los módulos aceptados por el estado
  const [moduloActivo, setModuloActivo] = useState<'operaciones' | 'empresas' | 'tipoCambio' | 'catalogos' | 'combustible' | 'proveedoresUnidad' | 'unidadesProveedor' | 'conveniosClientes' | 'conveniosProveedores' | 'direcciones'>('operaciones');
  
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(true);
  
  // Estados para abrir/cerrar los submenús
  const [menuBasesDatosAbierto, setMenuBasesDatosAbierto] = useState(false);
  const [menuClientesAbierto, setMenuClientesAbierto] = useState(false);
  const [menuProveedoresAbierto, setMenuProveedoresAbierto] = useState(false);

  if (!estaAutenticado) {
    return <Login onLoginSuccess={() => setEstaAutenticado(true)} />;
  }

  // CORRECCIÓN: Validaciones para mantener activos los menús padres, incluyendo 'direcciones'
  const esBaseDeDatosActiva = moduloActivo === 'empresas' || moduloActivo === 'tipoCambio' || moduloActivo === 'combustible' || moduloActivo === 'proveedoresUnidad' || moduloActivo === 'unidadesProveedor' || moduloActivo === 'direcciones';
  const esClientesActivo = moduloActivo === 'conveniosClientes';
  const esProveedoresActivo = moduloActivo === 'conveniosProveedores';

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

        {/* ITEM DESPLEGABLE: CLIENTES */}
        <div 
          className={`sidebar-item sidebar-item-with-icon ${esClientesActivo && !menuClientesAbierto ? 'active' : ''}`} 
          onClick={() => setMenuClientesAbierto(!menuClientesAbierto)}
        >
          <span>Clientes</span>
          <span style={{ fontSize: '0.7rem' }}>{menuClientesAbierto ? '▼' : '▶'}</span>
        </div>

        {menuClientesAbierto && (
          <div className="sidebar-submenu">
            <div 
              className={`sidebar-subitem ${moduloActivo === 'conveniosClientes' ? 'active' : ''}`} 
              onClick={() => setModuloActivo('conveniosClientes')}
            >
              Convenio de Clientes
            </div>
          </div>
        )}

        {/* ITEM DESPLEGABLE: PROVEEDORES */}
        <div 
          className={`sidebar-item sidebar-item-with-icon ${esProveedoresActivo && !menuProveedoresAbierto ? 'active' : ''}`} 
          onClick={() => setMenuProveedoresAbierto(!menuProveedoresAbierto)}
        >
          <span>Proveedores</span>
          <span style={{ fontSize: '0.7rem' }}>{menuProveedoresAbierto ? '▼' : '▶'}</span>
        </div>

        {menuProveedoresAbierto && (
          <div className="sidebar-submenu">
            <div 
              className={`sidebar-subitem ${moduloActivo === 'conveniosProveedores' ? 'active' : ''}`} 
              onClick={() => setModuloActivo('conveniosProveedores')}
            >
              Convenio de Proveedores
            </div>
          </div>
        )}

        {/* ITEM DESPLEGABLE: Bases de Datos */}
        <div 
          className={`sidebar-item sidebar-item-with-icon ${esBaseDeDatosActiva && !menuBasesDatosAbierto ? 'active' : ''}`} 
          onClick={() => setMenuBasesDatosAbierto(!menuBasesDatosAbierto)}
        >
          <span>Bases de Datos</span>
          <span style={{ fontSize: '0.7rem' }}>{menuBasesDatosAbierto ? '▼' : '▶'}</span>
        </div>

        {menuBasesDatosAbierto && (
          <div className="sidebar-submenu">
            <div 
              className={`sidebar-subitem ${moduloActivo === 'empresas' ? 'active' : ''}`} 
              onClick={() => setModuloActivo('empresas')}
            >
              Empresas
            </div>
            
            {/* NUEVO ITEM: Direcciones */}
            <div 
              className={`sidebar-subitem ${moduloActivo === 'direcciones' ? 'active' : ''}`} 
              onClick={() => setModuloActivo('direcciones')}
            >
              Direcciones
            </div>

            <div 
              className={`sidebar-subitem ${moduloActivo === 'tipoCambio' ? 'active' : ''}`} 
              onClick={() => setModuloActivo('tipoCambio')}
            >
              Tipo de Cambio
            </div>
            <div 
              className={`sidebar-subitem ${moduloActivo === 'combustible' ? 'active' : ''}`} 
              onClick={() => setModuloActivo('combustible')}
            >
              Combustible
            </div>
            <div 
              className={`sidebar-subitem ${moduloActivo === 'proveedoresUnidad' ? 'active' : ''}`} 
              onClick={() => setModuloActivo('proveedoresUnidad')}
            >
              Proveedores de Unidad
            </div>
            <div 
              className={`sidebar-subitem ${moduloActivo === 'unidadesProveedor' ? 'active' : ''}`} 
              onClick={() => setModuloActivo('unidadesProveedor')}
            >
              Unidades del Proveedor
            </div>
          </div>
        )}

        {/* ITEM: Catálogos */}
        <div 
          className={`sidebar-item ${moduloActivo === 'catalogos' ? 'active' : ''}`} 
          onClick={() => setModuloActivo('catalogos')}
        >
          Catálogos
        </div>

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
        {moduloActivo === 'direcciones' && <DireccionesDashboard />}  {/* NUEVO MÓDULO RENDERIZADO */}
        {moduloActivo === 'tipoCambio' && <TipoCambioDashboard />}
        {moduloActivo === 'combustible' && <CombustibleDashboard />}
        {moduloActivo === 'proveedoresUnidad' && <ProveedoresUnidadDashboard />}
        {moduloActivo === 'unidadesProveedor' && <UnidadesProveedorDashboard />}
        {moduloActivo === 'conveniosClientes' && <ConveniosClientesDashboard />}
        {moduloActivo === 'conveniosProveedores' && <ConveniosProveedoresDashboard />}
        {moduloActivo === 'catalogos' && <CatalogosDashboard />}
        
      </div>
    </div>
  );
}

export default App;