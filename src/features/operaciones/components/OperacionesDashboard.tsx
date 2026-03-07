// src/features/operaciones/components/OperacionesDashboard.tsx
import { useState } from 'react';
import { FormularioOperacion } from './FormularioOperacion';

interface DashboardProps {
  onLogout: () => void;
}

// Datos iniciales extendidos para probar la vista de detalles
const datosIniciales = [
  { 
    id: '1', ref: 'FL-100326-001', fecha: '03/09/2026', tipo: 'Fletes', status: '3. Documentado (Asignado)', 
    clientePaga: 'A. Castañeda & CO. Inc.', convenio: 'Flete de Imp a Cuatitlan...', remolque: '672146 | PA23225', 
    origen: 'ROAL', destino: 'AFN', descripcionMercancia: 'Autopartes', cantidad: 2, pesoKg: '1500.00', operador: 'Jose Maria',
    sueldoOperador: '400', combustibleGalones: '6'
  },
  { 
    id: '2', ref: 'TR-060326-041', fecha: '03/06/2026', tipo: 'Transfer', status: '3. Documentado (Asignado)', 
    clientePaga: 'Roelca Dlls', convenio: 'Exportación Caja Cargada...', remolque: '11379 | 71UG9B', 
    origen: 'LRD Trade', destino: 'Cuatitlan', descripcionMercancia: 'Electrónicos', cantidad: 1, operador: 'Pedro Sanchez'
  },
];

const OperacionesDashboard = ({ onLogout }: DashboardProps) => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [operacionEditando, setOperacionEditando] = useState<any | null>(null);
  const [filtroActivo, setFiltroActivo] = useState('Todo');
  
  const [operaciones, setOperaciones] = useState(datosIniciales);
  const [operacionViendo, setOperacionViendo] = useState<any | null>(null);
  const [perfilAbierto, setPerfilAbierto] = useState(false);

  const handleNuevo = () => {
    setOperacionEditando(null);
    setEstadoFormulario('abierto');
  };

  const editarOperacion = (operacion: any) => {
    setOperacionEditando(operacion);
    setOperacionViendo(null);
    setEstadoFormulario('abierto');
  };

  const eliminarOperacion = (id: string) => {
    if (window.confirm('⚠️ ¿Estás seguro de que deseas eliminar permanentemente este registro?')) {
      setOperaciones(operaciones.filter(op => op.id !== id));
      setOperacionViendo(null);
    }
  };

  // Función auxiliar para mostrar un guion si el dato está vacío
  const mostrarDato = (dato: any) => {
    return dato && dato !== '' ? dato : '-';
  };

  return (
    <div className="app-wrapper">
      
      {/* 1. Modal del Formulario (Creación y Edición) */}
      {estadoFormulario !== 'cerrado' && (
        <FormularioOperacion 
          estado={estadoFormulario}
          initialData={operacionEditando}
          onClose={() => {
            setEstadoFormulario('cerrado');
            setOperacionEditando(null);
          }}
          onMinimize={() => setEstadoFormulario('minimizado')}
          onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      {/* 2. Modal de Detalles (Más Grande, scrollable y con todas las secciones) */}
      {operacionViendo && (
        <div className="modal-overlay">
          <div className="form-card detail-card" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
            <div className="form-header">
              <h2>📄 Detalle de Operación <span style={{ color: '#D84315' }}>{operacionViendo.ref}</span></h2>
              <button onClick={() => setOperacionViendo(null)} className="btn-window close">✕</button>
            </div>
            
            <div className="detail-content" style={{ paddingRight: '12px' }}>
              
              {/* --- SECCIÓN: INFORMACIÓN GENERAL --- */}
              <h3 style={{ color: '#8b949e', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #30363d', paddingBottom: '8px', marginBottom: '16px' }}>Información General</h3>
              <div className="detail-grid" style={{ marginBottom: '24px' }}>
                <div className="detail-item"><span className="detail-label">Fecha del Servicio</span><span className="detail-value">{mostrarDato(operacionViendo.fecha)}</span></div>
                <div className="detail-item">
                  <span className="detail-label">Tipo de Operación</span>
                  <span className="detail-value">
                    <span className={`dot ${operacionViendo.tipo === 'Fletes' ? 'dot-green' : 'dot-orange'}`}></span>
                    {mostrarDato(operacionViendo.tipo)}
                  </span>
                </div>
                <div className="detail-item"><span className="detail-label">Status Actual</span><span className="detail-value">{mostrarDato(operacionViendo.status)}</span></div>
                <div className="detail-item"><span className="detail-label">Cliente (Paga)</span><span className="detail-value">{mostrarDato(operacionViendo.clientePaga)}</span></div>
                <div className="detail-item"><span className="detail-label">Convenio</span><span className="detail-value">{mostrarDato(operacionViendo.convenio)}</span></div>
                <div className="detail-item"><span className="detail-label"># de Remolque</span><span className="detail-value">{mostrarDato(operacionViendo.remolque)}</span></div>
                <div className="detail-item"><span className="detail-label">Ref Cliente</span><span className="detail-value">{mostrarDato(operacionViendo.refCliente)}</span></div>
                <div className="detail-item"><span className="detail-label">Origen</span><span className="detail-value">{mostrarDato(operacionViendo.origen)}</span></div>
                <div className="detail-item"><span className="detail-label">Destino</span><span className="detail-value">{mostrarDato(operacionViendo.destino)}</span></div>
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}><span className="detail-label">Observaciones Ejecutivo</span><span className="detail-value">{mostrarDato(operacionViendo.observacionesEjecutivo)}</span></div>
              </div>

              {/* --- SECCIÓN: PEDIMENTO Y CT --- */}
              <h3 style={{ color: '#8b949e', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #30363d', paddingBottom: '8px', marginBottom: '16px' }}>Pedimento y CT</h3>
              <div className="detail-grid" style={{ marginBottom: '24px' }}>
                <div className="detail-item"><span className="detail-label">Cliente (Mercancía)</span><span className="detail-value">{mostrarDato(operacionViendo.clienteMercancia)}</span></div>
                <div className="detail-item"><span className="detail-label">Descripción de la Mercancía</span><span className="detail-value">{mostrarDato(operacionViendo.descripcionMercancia)}</span></div>
                <div className="detail-item"><span className="detail-label">Cantidad</span><span className="detail-value">{mostrarDato(operacionViendo.cantidad)}</span></div>
                <div className="detail-item"><span className="detail-label">Embalaje</span><span className="detail-value">{mostrarDato(operacionViendo.embalaje)}</span></div>
                <div className="detail-item"><span className="detail-label">Peso (Kg)</span><span className="detail-value">{mostrarDato(operacionViendo.pesoKg)}</span></div>
                <div className="detail-item"><span className="detail-label"># DODA</span><span className="detail-value">{mostrarDato(operacionViendo.numDoda)}</span></div>
              </div>

              {/* --- SECCIÓN: ENTRY'S Y MANIFIESTO --- */}
              <h3 style={{ color: '#8b949e', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #30363d', paddingBottom: '8px', marginBottom: '16px' }}>Entry's y Manifiesto</h3>
              <div className="detail-grid" style={{ marginBottom: '24px' }}>
                <div className="detail-item"><span className="detail-label"># Entry</span><span className="detail-value">{mostrarDato(operacionViendo.numEntry)}</span></div>
                <div className="detail-item"><span className="detail-label">Cantidad de Entry's</span><span className="detail-value">{mostrarDato(operacionViendo.cantEntrys)}</span></div>
                <div className="detail-item"><span className="detail-label"># Manifiesto</span><span className="detail-value">{mostrarDato(operacionViendo.numManifiesto)}</span></div>
                <div className="detail-item"><span className="detail-label">Proveedor de Servicios</span><span className="detail-value">{mostrarDato(operacionViendo.provServicios)}</span></div>
              </div>

              {/* --- SECCIÓN: UNIDAD Y OPERADOR --- */}
              <h3 style={{ color: '#8b949e', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #30363d', paddingBottom: '8px', marginBottom: '16px' }}>Unidad, Operador y Gastos</h3>
              <div className="detail-grid" style={{ marginBottom: '24px' }}>
                <div className="detail-item"><span className="detail-label">Proveedor Unidad</span><span className="detail-value">{mostrarDato(operacionViendo.proveedorUnidad)}</span></div>
                <div className="detail-item"><span className="detail-label">Convenio Proveedor</span><span className="detail-value">{mostrarDato(operacionViendo.convenioProveedor)}</span></div>
                <div className="detail-item"><span className="detail-label">Unidad</span><span className="detail-value">{mostrarDato(operacionViendo.unidad)}</span></div>
                <div className="detail-item"><span className="detail-label">Operador</span><span className="detail-value">{mostrarDato(operacionViendo.operador)}</span></div>
                <div className="detail-item"><span className="detail-label">Sueldo Operador</span><span className="detail-value">${mostrarDato(operacionViendo.sueldoOperador)}</span></div>
                <div className="detail-item"><span className="detail-label">Combustible (Galones)</span><span className="detail-value">{mostrarDato(operacionViendo.combustibleGalones)}</span></div>
                <div className="detail-item"><span className="detail-label">Puente Monto</span><span className="detail-value">${mostrarDato(operacionViendo.puenteMonto)}</span></div>
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}><span className="detail-label">Observaciones (Gastos)</span><span className="detail-value">{mostrarDato(operacionViendo.observacionesGastos)}</span></div>
              </div>

              {/* --- SECCIÓN: POR COBRAR --- */}
              <h3 style={{ color: '#8b949e', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #30363d', paddingBottom: '8px', marginBottom: '16px' }}>Por Cobrar</h3>
              <div className="detail-grid" style={{ marginBottom: '24px' }}>
                <div className="detail-item"><span className="detail-label">Facturado En</span><span className="detail-value">{mostrarDato(operacionViendo.facturadoEnCobrar)}</span></div>
                <div className="detail-item"><span className="detail-label">Convenio</span><span className="detail-value">{mostrarDato(operacionViendo.convenioCobrar)}</span></div>
                <div className="detail-item"><span className="detail-label">Cargos Adicionales</span><span className="detail-value">${mostrarDato(operacionViendo.cargosAdicionales)}</span></div>
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}><span className="detail-label">Observaciones (Costos)</span><span className="detail-value">{mostrarDato(operacionViendo.observacionesCostos)}</span></div>
              </div>

            </div>

            <div className="form-actions detail-actions" style={{ marginTop: '24px', justifyContent: 'space-between', borderTop: '1px solid #21262d', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => eliminarOperacion(operacionViendo.id)} className="btn btn-danger-solid">
                  🗑️ Eliminar Registro
                </button>
                <button onClick={() => editarOperacion(operacionViendo)} className="btn btn-edit-solid">
                  ✏️ Editar Información
                </button>
              </div>
              <button onClick={() => setOperacionViendo(null)} className="btn btn-outline">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Sidebar Base --- */}
      <div className="sidebar">
        <div className="sidebar-item active">OP</div>
        <div className="sidebar-item">LG</div>
        <div className="sidebar-item">FL</div>
        <div className="sidebar-item">TR</div>
      </div>

      <div className="main-area">
        
        {/* --- Topbar --- */}
        <div className="topbar">
          <div className="brand">
            <span style={{ color: '#D84315', marginRight: '6px' }}>■</span> Roelca Inc.
          </div>
          <div className="search-container">
            <input type="text" className="search-input" placeholder="Buscar por # Ref..." />
          </div>
          
          <div className="topbar-right" style={{ position: 'relative' }}>
            <div className="notification-wrapper" title="Notificaciones">
              <span className="notification-icon">🔔</span>
              <span className="notification-badge">3</span>
            </div>
            <div className="avatar" style={{ cursor: 'pointer' }} onClick={() => setPerfilAbierto(!perfilAbierto)}>
              JM
            </div>

            {perfilAbierto && (
              <div className="profile-dropdown">
                <div className="profile-header-info">
                  <div className="profile-avatar-large">JM</div>
                  <div className="profile-text">
                    <span className="profile-name">Jesus Molero</span>
                    <span className="profile-role">Admin</span>
                    <span className="profile-dept">Informática</span>
                  </div>
                </div>
                <div className="profile-actions">
                  <button className="btn-profile">Actualizar Foto de Perfil</button>
                  <button className="btn-profile">Configuración</button>
                  <button className="btn-profile logout" onClick={onLogout}>Cerrar Sesión</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- Header del Módulo --- */}
        <div className="module-header">
          <h1 className="module-title">Operaciones</h1>
          <div className="action-buttons">
            <button className="btn btn-outline">Exportar CSV</button>
            <button className="btn btn-primary" onClick={handleNuevo}>
              + Agregar Operación
            </button>
          </div>
        </div>

        {/* --- Cuerpo Principal (Filtros y Tabla) --- */}
        <div className="content-body">
          <div className="filters-sidebar">
            <div className={`filter-item ${filtroActivo === 'Todo' ? 'active' : ''}`} onClick={() => setFiltroActivo('Todo')}>
              <span>Todos los registros</span>
            </div>
            <div className={`filter-item ${filtroActivo === 'Fletes' ? 'active' : ''}`} onClick={() => setFiltroActivo('Fletes')}>
              <span>Fletes</span> <span className="filter-badge">31</span>
            </div>
            <div className={`filter-item ${filtroActivo === 'Transfer' ? 'active' : ''}`} onClick={() => setFiltroActivo('Transfer')}>
              <span>Transfer</span> <span className="filter-badge">1265</span>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th># Ref</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Convenio</th>
                  <th>Remolque</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {operaciones.map((op) => (
                  <tr key={op.id} onClick={() => setOperacionViendo(op)}>
                    <td className="font-mono">{op.ref}</td>
                    <td>{op.fecha}</td>
                    <td><span className={`dot ${op.tipo === 'Fletes' ? 'dot-green' : 'dot-orange'}`}></span>{op.tipo}</td>
                    <td className="status-text"><span className="dot dot-gray"></span>{op.status}</td>
                    <td>{mostrarDato(op.convenio)}</td>
                    <td>{mostrarDato(op.remolque)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="actions-cell">
                        <button className="btn-small btn-edit" onClick={() => editarOperacion(op)}>Editar</button>
                        <button className="btn-small btn-danger" onClick={() => eliminarOperacion(op.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperacionesDashboard;