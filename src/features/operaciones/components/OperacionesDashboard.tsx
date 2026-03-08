// src/features/operaciones/components/OperacionesDashboard.tsx
import { useState } from 'react';
import { FormularioOperacion } from './FormularioOperacion';

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

const OperacionesDashboard = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [operacionEditando, setOperacionEditando] = useState<any | null>(null);
  const [filtroActivo, setFiltroActivo] = useState('Todo');
  const [operaciones, setOperaciones] = useState(datosIniciales);
  const [operacionViendo, setOperacionViendo] = useState<any | null>(null);

  const handleNuevo = () => { setOperacionEditando(null); setEstadoFormulario('abierto'); };
  const editarOperacion = (operacion: any) => { setOperacionEditando(operacion); setOperacionViendo(null); setEstadoFormulario('abierto'); };
  
  const eliminarOperacion = (id: string) => {
    if (window.confirm('⚠️ ¿Estás seguro de que deseas eliminar permanentemente este registro?')) {
      setOperaciones(operaciones.filter(op => op.id !== id));
      setOperacionViendo(null);
    }
  };

  const mostrarDato = (dato: any) => (dato && dato !== '' ? dato : '-');

  return (
    <>
      {/* Modal del Formulario */}
      {estadoFormulario !== 'cerrado' && (
        <FormularioOperacion 
          estado={estadoFormulario} initialData={operacionEditando}
          onClose={() => { setEstadoFormulario('cerrado'); setOperacionEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      {/* Modal de Detalles Verticales (Ahora sí lo estamos usando) */}
      {operacionViendo && (
        <div className="modal-overlay">
          <div className="form-card detail-card" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
            <div className="form-header">
              <h2>📄 Detalle de Operación <span style={{ color: '#D84315' }}>{operacionViendo.ref}</span></h2>
              <button onClick={() => setOperacionViendo(null)} className="btn-window close">✕</button>
            </div>
            
            <div className="detail-content" style={{ paddingRight: '12px' }}>
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
              </div>
            </div>

            <div className="form-actions detail-actions" style={{ marginTop: '24px', justifyContent: 'space-between', borderTop: '1px solid #21262d', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => eliminarOperacion(operacionViendo.id)} className="btn btn-danger-solid">🗑️ Eliminar</button>
                <button onClick={() => editarOperacion(operacionViendo)} className="btn btn-edit-solid">✏️ Editar</button>
              </div>
              <button onClick={() => setOperacionViendo(null)} className="btn btn-outline">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header del Módulo */}
      <div className="module-header">
        <h1 className="module-title">Operaciones</h1>
        <div className="action-buttons">
          <button className="btn btn-outline">Exportar CSV</button>
          <button className="btn btn-primary" onClick={handleNuevo}>+ Agregar Operación</button>
        </div>
      </div>

      {/* Cuerpo de Filtros y Tabla */}
      <div className="content-body">
        <div className="filters-sidebar">
          <div className={`filter-item ${filtroActivo === 'Todo' ? 'active' : ''}`} onClick={() => setFiltroActivo('Todo')}><span>Todos los registros</span></div>
          <div className={`filter-item ${filtroActivo === 'Fletes' ? 'active' : ''}`} onClick={() => setFiltroActivo('Fletes')}><span>Fletes</span> <span className="filter-badge">31</span></div>
          <div className={`filter-item ${filtroActivo === 'Transfer' ? 'active' : ''}`} onClick={() => setFiltroActivo('Transfer')}><span>Transfer</span> <span className="filter-badge">1265</span></div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th># Ref</th><th>Fecha</th><th>Tipo</th><th>Status</th><th>Convenio</th><th>Remolque</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {operaciones.map((op) => (
                <tr key={op.id} onClick={() => setOperacionViendo(op)}>
                  <td className="font-mono">{op.ref}</td><td>{op.fecha}</td>
                  <td><span className={`dot ${op.tipo === 'Fletes' ? 'dot-green' : 'dot-orange'}`}></span>{op.tipo}</td>
                  <td className="status-text"><span className="dot dot-gray"></span>{op.status}</td>
                  <td>{mostrarDato(op.convenio)}</td><td>{mostrarDato(op.remolque)}</td>
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
    </>
  );
};

export default OperacionesDashboard;