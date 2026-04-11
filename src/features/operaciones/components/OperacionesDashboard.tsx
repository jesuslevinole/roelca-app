// src/features/operaciones/components/OperacionesDashboard.tsx
import { useState, useEffect } from 'react';
import { FormularioOperacion } from './FormularioOperacion';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { obtenerBotonesHorarioDinamicos } from '../config/statusRules'; 

const datosIniciales = [
  { id: '1', ref: 'IM-100326-001', fecha: '03/09/2026', tipo: 'Importación', status: '3. Documentado (Asignado)', clientePaga: 'A. Castañeda', convenio: 'Flete de Imp...', remolque: '672146', origen: 'ROAL', destino: 'AFN', descripcionMercancia: 'Autopartes', cantidad: 2, pesoKg: '1500', operador: 'Jose Maria' },
];

const OperacionesDashboard = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [operacionEditando, setOperacionEditando] = useState<any | null>(null);
  const [filtroActivo, setFiltroActivo] = useState('Todo');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [operaciones, setOperaciones] = useState(datosIniciales);
  const [operacionViendo, setOperacionViendo] = useState<any | null>(null);

  // Estados de Horarios
  const [modalHorarios, setModalHorarios] = useState<'cerrado' | 'registrar' | 'historial'>('cerrado');
  const [historialList, setHistorialList] = useState<any[]>([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [nuevoStatus, setNuevoStatus] = useState('');
  const [nuevaFechaHora, setNuevaFechaHora] = useState('');
  
  // Estado para guardar los botones dinámicos
  const [botonesDisponibles, setBotonesDisponibles] = useState<string[]>([]);

  useEffect(() => {
    const cargarBotones = async () => {
      if (operacionViendo && operacionViendo.tipo) {
        const botones = await obtenerBotonesHorarioDinamicos(operacionViendo.tipo);
        setBotonesDisponibles(botones);
      }
    };
    cargarBotones();
  }, [operacionViendo]);

  const handleNuevo = () => { setOperacionEditando(null); setEstadoFormulario('abierto'); };
  const editarOperacion = (operacion: any) => { setOperacionEditando(operacion); setOperacionViendo(null); setEstadoFormulario('abierto'); };
  const eliminarOperacion = (id: string) => {
    if (window.confirm('¿Eliminar registro permanentemente?')) {
      setOperaciones(operaciones.filter(op => op.id !== id));
      setOperacionViendo(null);
    }
  };
  const mostrarDato = (dato: any) => (dato && dato !== '' ? dato : '-');
  
  const abrirRegistroHorario = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
    
    setNuevaFechaHora(localISOTime);
    setNuevoStatus(botonesDisponibles[0] || ''); 
    setModalHorarios('registrar');
  };

  const verHistorial = async () => {
    setModalHorarios('historial');
    setCargandoHorarios(true);
    try {
      const q = query(collection(db, 'horarios'), where('operacionId', '==', operacionViendo.id));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
      setHistorialList(data);
    } catch (e) {
      console.error(e);
    }
    setCargandoHorarios(false);
  };

  const guardarHorario = async () => {
    if (!nuevoStatus || !nuevaFechaHora) return alert("Completa la fecha y el estatus.");
    
    setCargandoHorarios(true);
    try {
      const batch = writeBatch(db);

      const horarioRef = doc(collection(db, 'horarios'));
      batch.set(horarioRef, { operacionId: operacionViendo.id, status: nuevoStatus, fechaHora: nuevaFechaHora, registradoEn: new Date().toISOString() });

      const opRef = doc(db, 'operaciones', String(operacionViendo.id));
      batch.update(opRef, { status: nuevoStatus });

      await batch.commit();

      const operacionActualizada = { ...operacionViendo, status: nuevoStatus };
      setOperacionViendo(operacionActualizada);
      setOperaciones(operaciones.map(op => op.id === operacionActualizada.id ? operacionActualizada : op));
      
      alert('Horario registrado y Estatus actualizado.');
      setModalHorarios('cerrado');
    } catch (e) {
      alert("Error al actualizar la base de datos.");
    }
    setCargandoHorarios(false);
  };

  return (
    <>
      {estadoFormulario !== 'cerrado' && (
        <FormularioOperacion 
          estado={estadoFormulario} initialData={operacionEditando}
          onClose={() => { setEstadoFormulario('cerrado'); setOperacionEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      {operacionViendo && (
        <div className="modal-overlay">
          <div className="form-card detail-card" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
            <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Detalle de Operación <span style={{ color: '#D84315' }}>{operacionViendo.ref}</span></h2>
              
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button onClick={abrirRegistroHorario} title="Registrar Horario / Cambiar Status" style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </button>
                <button onClick={verHistorial} title="Ver Bitácora (Historial)" style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </button>
                <div style={{ width: '1px', height: '24px', backgroundColor: '#30363d', margin: '0 4px' }}></div>
                <button onClick={() => setOperacionViendo(null)} className="btn-window close">✕</button>
              </div>
            </div>
            
            <div className="detail-content" style={{ paddingRight: '12px' }}>
              <div className="detail-grid" style={{ marginBottom: '24px' }}>
                <div className="detail-item"><span className="detail-label">Fecha del Servicio</span><span className="detail-value">{mostrarDato(operacionViendo.fecha)}</span></div>
                <div className="detail-item"><span className="detail-label">Tipo de Operación</span><span className="detail-value"><span className={`dot ${operacionViendo.tipo === 'Importación' ? 'dot-green' : 'dot-orange'}`}></span>{mostrarDato(operacionViendo.tipo)}</span></div>
                <div className="detail-item"><span className="detail-label">Status Actual</span><span className="detail-value" style={{ color: '#f0f6fc', fontWeight: 'bold' }}>{mostrarDato(operacionViendo.status)}</span></div>
              </div>
            </div>

            <div className="form-actions detail-actions" style={{ marginTop: '24px', justifyContent: 'space-between', borderTop: '1px solid #21262d', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => eliminarOperacion(operacionViendo.id)} className="btn btn-danger-solid">Eliminar Registro</button>
                <button onClick={() => editarOperacion(operacionViendo)} className="btn btn-edit-solid">Editar Información</button>
              </div>
              <button onClick={() => setOperacionViendo(null)} className="btn btn-outline">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {modalHorarios === 'registrar' && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="form-card" style={{ maxWidth: '400px', backgroundColor: '#0d1117', border: '1px solid #30363d' }}>
            <div className="form-header" style={{ borderBottom: '1px solid #30363d' }}>
              <h2>Nuevo Movimiento</h2>
              <button onClick={() => setModalHorarios('cerrado')} className="btn-window close">✕</button>
            </div>
            <div style={{ padding: '24px' }}>
              <div className="form-group">
                <label className="form-label">Fecha y Hora</label>
                <input type="datetime-local" className="form-control" value={nuevaFechaHora} onChange={e => setNuevaFechaHora(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Estatus / Hito</label>
                <select className="form-control" value={nuevoStatus} onChange={e => setNuevoStatus(e.target.value)}>
                  {botonesDisponibles.map((botonStr) => (
                    <option key={botonStr} value={botonStr}>{botonStr}</option>
                  ))}
                </select>
              </div>
              <button onClick={guardarHorario} disabled={cargandoHorarios} className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                {cargandoHorarios ? 'Actualizando...' : 'Guardar y Actualizar Operación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalHorarios === 'historial' && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="form-card" style={{ maxWidth: '600px', backgroundColor: '#0d1117', border: '1px solid #30363d' }}>
            <div className="form-header" style={{ borderBottom: '1px solid #30363d' }}>
              <h2>Bitácora de Movimientos</h2>
              <button onClick={() => setModalHorarios('cerrado')} className="btn-window close">✕</button>
            </div>
            <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
              {cargandoHorarios ? (
                <div style={{ textAlign: 'center', color: '#8b949e', padding: '20px' }}>Descargando historial...</div>
              ) : (
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#161b22', color: '#8b949e' }}>
                    <tr><th style={{ padding: '12px', textAlign: 'left' }}>Fecha y Hora</th><th style={{ padding: '12px', textAlign: 'left' }}>Estatus Marcado</th></tr>
                  </thead>
                  <tbody>
                    {historialList.map(h => (
                      <tr key={h.id} style={{ borderTop: '1px solid #30363d' }}>
                        <td style={{ padding: '12px', color: '#c9d1d9' }}>{new Date(h.fechaHora).toLocaleString('es-MX')}</td>
                        <td style={{ padding: '12px', color: '#f0f6fc', fontWeight: 'bold' }}>{h.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #30363d', textAlign: 'right' }}>
              <button onClick={() => setModalHorarios('cerrado')} className="btn btn-outline">Cerrar Historial</button>
            </div>
          </div>
        </div>
      )}

      {/* Bloque restaurado para evitar el error ts(6133) */}
      <div className="module-header" style={{ justifyContent: 'flex-end', paddingBottom: '16px' }}>
        <div className="action-buttons" style={{ display: 'flex', gap: '12px', position: 'relative' }}>
          <button className="btn btn-outline" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            Filtro: {filtroActivo} ▼
          </button>
          
          {mostrarFiltros && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', zIndex: 50, minWidth: '180px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', padding: '8px 0' }}>
              {['Todo', 'Importación', 'Exportación'].map((f) => (
                <div 
                  key={f} 
                  style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '0.9rem', color: filtroActivo === f ? '#f0f6fc' : '#8b949e', backgroundColor: filtroActivo === f ? '#21262d' : 'transparent' }}
                  onClick={() => { setFiltroActivo(f); setMostrarFiltros(false); }}
                >
                  {f}
                </div>
              ))}
            </div>
          )}
          
          <button className="btn btn-outline">Exportar CSV</button>
          <button className="btn btn-primary" onClick={handleNuevo}>+ Agregar Operación</button>
        </div>
      </div>

      <div className="content-body" style={{ display: 'block' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th># Ref</th><th>Fecha</th><th>Tipo</th><th>Status</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {operaciones.map((op) => (
                <tr key={op.id} onClick={() => setOperacionViendo(op)}>
                  <td className="font-mono">{op.ref}</td><td>{op.fecha}</td>
                  <td>{op.tipo}</td>
                  <td className="status-text">{op.status}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn-small btn-edit" onClick={() => editarOperacion(op)}>Editar</button>
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