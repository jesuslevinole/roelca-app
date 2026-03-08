// src/features/operaciones/components/OperacionesDashboard.tsx
import { useState } from 'react';
import { FormularioOperacion } from './FormularioOperacion';

const datosIniciales = [
  { id: '1', ref: 'FL-100326-001', fecha: '03/09/2026', tipo: 'Fletes', status: '3. Documentado (Asignado)', convenio: 'Flete de Imp a Cuatitlan...', remolque: '672146 | PA23225', proveedor: 'ROAL' },
  { id: '2', ref: 'TR-060326-041', fecha: '03/06/2026', tipo: 'Transfer', status: '3. Documentado (Asignado)', convenio: 'Exportación Caja Cargada...', remolque: '11379 | 71UG9B', proveedor: 'Roelca Dlls' },
  { id: '3', ref: 'TR-060326-040', fecha: '03/06/2026', tipo: 'Transfer', status: '3. Documentado (Asignado)', convenio: 'Importación Caja Cargada...', remolque: '185 | A1906D', proveedor: 'Roelca Dlls' },
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
      {/* Modales */}
      {estadoFormulario !== 'cerrado' && (
        <FormularioOperacion 
          estado={estadoFormulario} initialData={operacionEditando}
          onClose={() => { setEstadoFormulario('cerrado'); setOperacionEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      {/* Aquí va tu código intacto del Modal de Detalles (el div .modal-overlay con la info) que armamos en la respuesta anterior... */}
      {/* Lo he omitido por longitud de mensaje, pero pega aquí tu {operacionViendo && ( ... )} */}

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