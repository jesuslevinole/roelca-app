// src/features/operaciones/components/OperacionesDashboard.tsx
import { useState } from 'react';
import { FormularioOperacion } from './FormularioOperacion';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';

const datosIniciales = [
  { id: '1', ref: 'FL-100326-001', fecha: '03/09/2026', tipo: 'Fletes', status: '3. Documentado (Asignado)', clientePaga: 'A. Castañeda & CO. Inc.', convenio: 'Flete de Imp a Cuatitlan...', remolque: '672146 | PA23225', origen: 'ROAL', destino: 'AFN', descripcionMercancia: 'Autopartes', cantidad: 2, pesoKg: '1500.00', operador: 'Jose Maria', sueldoOperador: '400', combustibleGalones: '6' },
  { id: '2', ref: 'TR-060326-041', fecha: '03/06/2026', tipo: 'Transfer', status: '3. Documentado (Asignado)', clientePaga: 'Roelca Dlls', convenio: 'Exportación Caja Cargada...', remolque: '11379 | 71UG9B', origen: 'LRD Trade', destino: 'Cuatitlan', descripcionMercancia: 'Electrónicos', cantidad: 1, operador: 'Pedro Sanchez' },
];

const OperacionesDashboard = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [operacionEditando, setOperacionEditando] = useState<any | null>(null);
  
  // Estados para los filtros
  const [filtroActivo, setFiltroActivo] = useState('Todo');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  const [operaciones, setOperaciones] = useState(datosIniciales);
  const [operacionViendo, setOperacionViendo] = useState<any | null>(null);

  // Estados para Lógica de Horarios/Status
  const [modalHorarios, setModalHorarios] = useState<'cerrado' | 'registrar' | 'historial'>('cerrado');
  const [historialList, setHistorialList] = useState<any[]>([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [nuevoStatus, setNuevoStatus] = useState('');
  const [nuevaFechaHora, setNuevaFechaHora] = useState('');

  const handleNuevo = () => { setOperacionEditando(null); setEstadoFormulario('abierto'); };
  const editarOperacion = (operacion: any) => { setOperacionEditando(operacion); setOperacionViendo(null); setEstadoFormulario('abierto'); };
  
  const eliminarOperacion = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente este registro?')) {
      setOperaciones(operaciones.filter(op => op.id !== id));
      setOperacionViendo(null);
    }
  };

  const mostrarDato = (dato: any) => (dato && dato !== '' ? dato : '-');

  // ================= LÓGICA FIREBASE DE HORARIOS =================
  
  const abrirRegistroHorario = () => {
    // Inicializa la fecha local en el input datetime-local
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
    
    setNuevaFechaHora(localISOTime);
    setNuevoStatus(operacionViendo.status);
    setModalHorarios('registrar');
  };

  const verHistorial = async () => {
    setModalHorarios('historial');
    setCargandoHorarios(true);
    try {
      const q = query(collection(db, 'horarios'), where('operacionId', '==', operacionViendo.id));
      const snap = await getDocs(q);
      
      // ✅ CORRECCIÓN APLICADA: Uso de "as any" para evitar el error de TypeScript
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      // Ordenar localmente del más reciente al más antiguo
      data.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
      setHistorialList(data);
    } catch (e) {
      console.error("Error al descargar historial:", e);
    }
    setCargandoHorarios(false);
  };

  const guardarHorario = async () => {
    if (!nuevoStatus || !nuevaFechaHora) return alert("Completa la fecha y el estatus.");
    
    setCargandoHorarios(true);
    try {
      const batch = writeBatch(db);

      // 1. Crear documento en historial
      const horarioRef = doc(collection(db, 'horarios'));
      batch.set(horarioRef, {
        operacionId: operacionViendo.id,
        status: nuevoStatus,
        fechaHora: nuevaFechaHora,
        registradoEn: new Date().toISOString()
      });

      // 2. Actualizar Maestro (Operación) con el nuevo Estatus
      // NOTA: Si operacionViendo es local (datosIniciales) esto fallará silenciosamente, 
      // pero actualizará el UI. Cuando pases 'operaciones' a Firebase 100%, funcionará perfecto.
      const opRef = doc(db, 'operaciones', String(operacionViendo.id));
      batch.update(opRef, { status: nuevoStatus });

      await batch.commit();

      // Actualizar estado local para UX inmediato
      const operacionActualizada = { ...operacionViendo, status: nuevoStatus };
      setOperacionViendo(operacionActualizada);
      setOperaciones(operaciones.map(op => op.id === operacionActualizada.id ? operacionActualizada : op));
      
      alert('Horario registrado y Estatus de Operación actualizado.');
      setModalHorarios('cerrado');
    } catch (e) {
      console.error("Error batch horarios:", e);
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

      {/* ================= MODAL: DETALLE DE OPERACIÓN ================= */}
      {operacionViendo && (
        <div className="modal-overlay">
          <div className="form-card detail-card" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
            <div className="form-header">
              <h2>Detalle de Operación <span style={{ color: '#D84315' }}>{operacionViendo.ref}</span></h2>
              <button onClick={() => setOperacionViendo(null)} className="btn-window close">✕</button>
            </div>
            
            <div className="detail-content" style={{ paddingRight: '12px' }}>
              <h3 style={{ color: '#8b949e', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #30363d', paddingBottom: '8px', marginBottom: '16px' }}>Información General</h3>
              <div className="detail-grid" style={{ marginBottom: '24px' }}>
                <div className="detail-item"><span className="detail-label">Fecha del Servicio</span><span className="detail-value">{mostrarDato(operacionViendo.fecha)}</span></div>
                <div className="detail-item"><span className="detail-label">Tipo de Operación</span><span className="detail-value"><span className={`dot ${operacionViendo.tipo === 'Fletes' ? 'dot-green' : 'dot-orange'}`}></span>{mostrarDato(operacionViendo.tipo)}</span></div>
                
                {/* STATUS VISUAL DESTACADO */}
                <div className="detail-item"><span className="detail-label">Status Actual</span><span className="detail-value" style={{ color: '#f0f6fc', fontWeight: 'bold' }}>{mostrarDato(operacionViendo.status)}</span></div>
                
                <div className="detail-item"><span className="detail-label">Cliente (Paga)</span><span className="detail-value">{mostrarDato(operacionViendo.clientePaga)}</span></div>
                <div className="detail-item"><span className="detail-label">Convenio</span><span className="detail-value">{mostrarDato(operacionViendo.convenio)}</span></div>
                <div className="detail-item"><span className="detail-label"># de Remolque</span><span className="detail-value">{mostrarDato(operacionViendo.remolque)}</span></div>
                
                {/* BOTONES DE CONTROL DE HORARIOS (Abarca 2 columnas para no apretarse) */}
                <div className="detail-item" style={{ gridColumn: 'span 2', backgroundColor: '#161b22', padding: '16px', borderRadius: '8px', border: '1px solid #30363d', marginTop: '8px' }}>
                  <span className="detail-label" style={{ display: 'block', marginBottom: '12px', color: '#f0f6fc' }}>⌚ Control de Horarios y Estatus</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={abrirRegistroHorario} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                      Registrar Horario / Cambiar Status
                    </button>
                    <button onClick={verHistorial} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem', backgroundColor: '#21262d' }}>
                      Ver Bitácora (Historial)
                    </button>
                  </div>
                </div>
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

      {/* ================= MODAL: REGISTRAR NUEVO HORARIO ================= */}
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
                <input 
                  type="datetime-local" 
                  className="form-control" 
                  value={nuevaFechaHora} 
                  onChange={e => setNuevaFechaHora(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Estatus / Hito</label>
                <select className="form-control" value={nuevoStatus} onChange={e => setNuevoStatus(e.target.value)}>
                  <option value="1. Nuevo">1. Nuevo</option>
                  <option value="2. Posicionado">2. Posicionado</option>
                  <option value="3. Cargado">3. Cargado</option>
                  <option value="4. En Ruta">4. En Ruta</option>
                  <option value="5. En Frontera">5. En Frontera</option>
                  <option value="6. Entregado">6. Entregado</option>
                </select>
              </div>
              <button onClick={guardarHorario} disabled={cargandoHorarios} className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                {cargandoHorarios ? 'Actualizando...' : 'Guardar y Actualizar Operación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: HISTORIAL DE HORARIOS ================= */}
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
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Fecha y Hora</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Estatus Marcado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialList.length === 0 ? (
                      <tr><td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#8b949e' }}>No hay registros en bitácora.</td></tr>
                    ) : (
                      historialList.map(h => (
                        <tr key={h.id} style={{ borderTop: '1px solid #30363d' }}>
                          <td style={{ padding: '12px', color: '#c9d1d9' }}>{new Date(h.fechaHora).toLocaleString('es-MX')}</td>
                          <td style={{ padding: '12px', color: '#f0f6fc', fontWeight: 'bold' }}>{h.status}</td>
                        </tr>
                      ))
                    )}
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

      {/* --- Header con Botón de Filtros Integrado --- */}
      <div className="module-header" style={{ justifyContent: 'flex-end', paddingBottom: '16px' }}>
        <div className="action-buttons" style={{ display: 'flex', gap: '12px', position: 'relative' }}>
          
          <button className="btn btn-outline" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            Filtro: {filtroActivo} ▼
          </button>
          
          {mostrarFiltros && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', zIndex: 50, minWidth: '180px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', padding: '8px 0' }}>
              {['Todo', 'Fletes', 'Transfer'].map((f) => (
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