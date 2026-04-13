// src/features/operaciones/components/OperacionesDashboard.tsx
import { useState, useEffect } from 'react';
import { FormularioOperacion } from './FormularioOperacion';
import { collection, doc, writeBatch, query, where, getDocs, orderBy, limit } from 'firebase/firestore'; 
import { db } from '../../../config/firebase';
import { obtenerBotonesHorarioDinamicos } from '../config/statusRules';

const OperacionesDashboard = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [operacionEditando, setOperacionEditando] = useState<any | null>(null);
  
  const [operacionesGlobales, setOperacionesGlobales] = useState<any[]>([]);
  const [cargandoOperaciones, setCargandoOperaciones] = useState(true);
  const [operacionViendo, setOperacionViendo] = useState<any | null>(null);

  const [modalHorarios, setModalHorarios] = useState<'cerrado' | 'registrar' | 'historial'>('cerrado');
  const [historialList, setHistorialList] = useState<any[]>([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [nuevoStatus, setNuevoStatus] = useState('');
  const [nuevaFechaHora, setNuevaFechaHora] = useState('');
  
  const [botonesDisponibles, setBotonesDisponibles] = useState<string[]>([]);
  const [catalogosGlobales, setCatalogosGlobales] = useState<any>({});

  const [busqueda, setBusqueda] = useState('');

  // ✅ ESTADOS DE PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 50;

  // Estado para el hover de las filas (solución fondo sólido en móvil)
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // ✅ DESCARGA BLINDADA (Sobrevive al F5 y limita a 100 registros)
  useEffect(() => {
    const descargarTodo = async () => {
      setCargandoOperaciones(true);
      try {
        let catGuardados = null;
        const cacheCatStr = sessionStorage.getItem('roelca_catalogos_v1');

        if (cacheCatStr) {
          catGuardados = JSON.parse(cacheCatStr);
          setCatalogosGlobales(catGuardados);
        } else {
          const [empSnap, opSnap, embSnap, remSnap, tarSnap, convProvSnap, tcSnap, convCliSnap, convDetSnap] = await Promise.all([
            getDocs(collection(db, 'empresas')),
            getDocs(collection(db, 'catalogo_tipo_operacion')),
            getDocs(collection(db, 'catalogo_embalaje')),
            getDocs(collection(db, 'remolques')),
            getDocs(collection(db, 'catalogo_tarifas_referencia')), 
            getDocs(collection(db, 'convenios_proveedores')),
            getDocs(collection(db, 'tipo_cambio')),
            getDocs(collection(db, 'convenios_clientes')),
            getDocs(collection(db, 'convenios_clientes_detalles'))
          ]);

          catGuardados = {
            empresas: empSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })),
            tiposOperacion: opSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })),
            embalajes: embSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })),
            remolques: remSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })),
            tarifas: tarSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })),
            conveniosProv: convProvSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })),
            catalogoTC: tcSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })),
            catalogoConvClientes: convCliSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })),
            catalogoConvDetalles: convDetSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }))
          };
          
          sessionStorage.setItem('roelca_catalogos_v1', JSON.stringify(catGuardados));
          setCatalogosGlobales(catGuardados);
        }

        const operacionesSnap = await getDocs(query(collection(db, 'operaciones'), orderBy('fechaServicio', 'desc'), limit(100)));

        const opData = operacionesSnap.docs.map((d: any) => {
          const data = d.data() as any;
          const clienteObj = catGuardados.empresas.find((e: any) => e.id === data.clientePaga);
          return {
            id: d.id,
            ...data,
            nombreCliente: clienteObj ? clienteObj.nombre : (data.clientePaga || 'Desconocido')
          };
        });

        setOperacionesGlobales(opData);

      } catch (e) {
        console.error("Error al pre-cargar datos:", e);
      }
      setCargandoOperaciones(false);
    };
    descargarTodo();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  useEffect(() => {
    const cargarBotones = async () => {
      if (operacionViendo) {
        const botones = await obtenerBotonesHorarioDinamicos(operacionViendo);
        setBotonesDisponibles(botones);
      }
    };
    cargarBotones();
  }, [operacionViendo]);

  const handleNuevo = () => { setOperacionEditando(null); setEstadoFormulario('abierto'); };
  const editarOperacion = (operacion: any) => { setOperacionEditando(operacion); setOperacionViendo(null); setEstadoFormulario('abierto'); };
  
  const eliminarOperacion = (id: string) => {
    if (window.confirm('¿Eliminar registro permanentemente?')) {
      setOperacionesGlobales(prev => prev.filter((op: any) => op.id !== id));
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
      const data = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
      data.sort((a: any, b: any) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
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
      
      setOperacionesGlobales(prev => prev.map((op: any) => op.id === operacionActualizada.id ? operacionActualizada : op));
      
      alert('Horario registrado y Estatus actualizado.');
      setModalHorarios('cerrado');
    } catch (e) {
      alert("Error al actualizar la base de datos.");
    }
    setCargandoHorarios(false);
  };

  const handleOperacionGuardada = (opNueva: any) => {
    const clienteObj = catalogosGlobales.empresas?.find((e:any) => e.id === opNueva.clientePaga);
    const opConNombre = { ...opNueva, nombreCliente: clienteObj ? clienteObj.nombre : 'Desconocido' };

    if (operacionEditando) {
      setOperacionesGlobales(prev => prev.map((op: any) => op.id === opConNombre.id ? opConNombre : op));
    } else {
      setOperacionesGlobales(prev => [opConNombre, ...prev]);
    }
    
    setEstadoFormulario('cerrado');
    setOperacionEditando(null);
  };

  const forzarRecarga = () => {
    sessionStorage.removeItem('roelca_catalogos_v1');
    window.location.reload();
  };

  // ✅ Filtrado GLOBAL por buscador inteligente (A prueba de números)
  const operacionesFiltradas = operacionesGlobales.filter(op => {
    const b = busqueda.toLowerCase();
    return (
      String(op.ref || op.id || '').toLowerCase().includes(b) ||
      String(op.fechaServicio || '').toLowerCase().includes(b) ||
      String(op.nombreCliente || '').toLowerCase().includes(b) ||
      String(op.tipoServicio || '').toLowerCase().includes(b) ||
      String(op.trafico || '').toLowerCase().includes(b) ||
      String(op.status || '').toLowerCase().includes(b)
    );
  });

  // ✅ LOGICA DE PAGINACIÓN
  const totalPaginas = Math.ceil(operacionesFiltradas.length / registrosPorPagina);
  const indiceUltimoRegistro = paginaActual * registrosPorPagina;
  const indicePrimerRegistro = indiceUltimoRegistro - registrosPorPagina;
  const operacionesEnPantalla = operacionesFiltradas.slice(indicePrimerRegistro, indiceUltimoRegistro);

  const irPaginaSiguiente = () => setPaginaActual(prev => Math.min(prev + 1, totalPaginas));
  const irPaginaAnterior = () => setPaginaActual(prev => Math.max(prev - 1, 1));

  // ✅ Función para Exportar a CSV
  const exportarCSV = () => {
    if (operacionesFiltradas.length === 0) return alert("No hay datos para exportar.");
    const encabezados = ['# Ref', 'Fecha', 'Cliente', 'Servicio', 'Tráfico', 'Status'];
    const lineas = operacionesFiltradas.map(op => [
      `"${op.ref || op.id?.substring(0,6) || ''}"`, `"${op.fechaServicio || ''}"`, 
      `"${op.nombreCliente || ''}"`, `"${op.tipoServicio || ''}"`, 
      `"${op.trafico || ''}"`, `"${op.status || ''}"`
    ].join(','));
    const csvContent = [encabezados.join(','), ...lineas].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Operaciones_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease', width: '100%', boxSizing: 'border-box' }}>
      
      {estadoFormulario !== 'cerrado' && (
        <FormularioOperacion 
          estado={estadoFormulario} initialData={operacionEditando}
          onClose={() => { setEstadoFormulario('cerrado'); setOperacionEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} onRestore={() => setEstadoFormulario('abierto')}
          catalogosCacheados={catalogosGlobales} 
          onSave={handleOperacionGuardada}
        />
      )}

      {/* CONTENEDOR MAESTRO */}
     <div style={{ width: '100%', margin: '0 auto' }}>
        
        {/* TÍTULO LIMPIO */}
        <h1 className="module-title" style={{ fontSize: '1.5rem', color: '#f0f6fc', margin: '0 0 24px 0', fontWeight: 'bold' }}>
          Operaciones
        </h1>

        {/* BARRA DE CONTROLES: Responsive y Alineada */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', width: '100%' }}>
          
          {/* Izquierda: Filtro Estático */}
          <div style={{ flex: '1 1 auto', maxWidth: '200px', minWidth: '120px' }}>
            <select className="form-control" style={{ width: '100%', backgroundColor: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9' }}>
              <option>Filtro: Todo</option>
            </select>
          </div>

          {/* Centro: Buscador Inteligente */}
          <div style={{ flex: '2 1 250px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
              <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder="Buscar por Ref, Cliente, Status..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 40px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Derecha: Botones */}
          <div style={{ flex: '1 1 auto', display: 'flex', gap: '12px', justifyContent: 'flex-end', minWidth: '280px' }}>
            <button className="btn btn-outline" onClick={forzarRecarga} style={{ fontSize: '0.8rem', padding: '4px 12px' }} title="Recargar Catálogos">
              ↻ Actualizar
            </button>
            <button className="btn btn-outline" onClick={exportarCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Exportar CSV
            </button>
            <button className="btn btn-primary" onClick={handleNuevo} style={{ whiteSpace: 'nowrap' }}>+ Agregar Operación</button>
          </div>
        </div>

        {/* TABLA RESPONSIVE */}
        <div className="content-body" style={{ display: 'block', width: '100%' }}>
          <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', width: '100%' }}>
            {cargandoOperaciones ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>Descargando base de datos de Operaciones...</div>
            ) : (
              <table className="data-table" style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#161b22', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '16px', width: '100px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', position: 'sticky', left: 0, backgroundColor: '#161b22', zIndex: 12, borderRight: '1px solid #30363d', borderBottom: '1px solid #30363d' }}>
                      Acciones
                    </th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}># Ref</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Fecha</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Cliente</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Servicio / Tráfico</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {operacionesEnPantalla.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
                        {busqueda ? 'No se encontraron operaciones para tu búsqueda.' : 'No hay operaciones registradas.'}
                      </td>
                    </tr>
                  ) : (
                    operacionesEnPantalla.map((op: any) => (
                      <tr 
                        key={op.id} 
                        style={{ borderBottom: '1px solid #21262d', backgroundColor: hoveredRowId === op.id ? '#21262d' : '#0d1117', transition: 'background-color 0.2s', cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredRowId(op.id)} 
                        onMouseLeave={() => setHoveredRowId(null)}
                        onClick={() => setOperacionViendo(op)}
                      >
                        {/* CELDA ACCIONES FIJA Y SÓLIDA */}
                        <td style={{ padding: '16px', textAlign: 'center', position: 'sticky', left: 0, backgroundColor: 'inherit', zIndex: 5, borderRight: '1px solid #30363d' }} onClick={(e: any) => e.stopPropagation()}>
                          <div className="actions-cell" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                              className="btn-small btn-edit" 
                              onClick={(e) => { e.stopPropagation(); editarOperacion(op); }}
                              style={{ background: 'transparent', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                              onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                              onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              Editar
                            </button>
                          </div>
                        </td>

                        <td className="font-mono" style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{op.ref || op.id?.substring(0,6)}</td>
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{op.fechaServicio}</td>
                        <td style={{ padding: '16px', fontWeight: '500', color: '#f0f6fc', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{op.nombreCliente}</td>
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{op.tipoServicio} - {op.trafico}</td>
                        <td className="status-text" style={{ padding: '16px', color: '#10b981', fontWeight: 'bold', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{op.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* CONTROLES DE PAGINACIÓN */}
          {operacionesFiltradas.length > 0 && !cargandoOperaciones && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ color: '#8b949e', fontSize: '0.9rem' }}>
                Mostrando {indicePrimerRegistro + 1} - {Math.min(indiceUltimoRegistro, operacionesFiltradas.length)} de {operacionesFiltradas.length} operaciones (Últimas 100)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={irPaginaAnterior} 
                  disabled={paginaActual === 1}
                  style={{ padding: '6px 12px', backgroundColor: paginaActual === 1 ? '#0d1117' : '#21262d', color: paginaActual === 1 ? '#484f58' : '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Anterior
                </button>
                <span style={{ padding: '6px 12px', color: '#f0f6fc', fontWeight: 'bold' }}>{paginaActual} / {totalPaginas || 1}</span>
                <button 
                  onClick={irPaginaSiguiente} 
                  disabled={paginaActual === totalPaginas || totalPaginas === 0}
                  style={{ padding: '6px 12px', backgroundColor: paginaActual === totalPaginas || totalPaginas === 0 ? '#0d1117' : '#21262d', color: paginaActual === totalPaginas || totalPaginas === 0 ? '#484f58' : '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: paginaActual === totalPaginas || totalPaginas === 0 ? 'not-allowed' : 'pointer' }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODALES ADICIONALES */}
      {operacionViendo && (
        <div className="modal-overlay">
          <div className="form-card detail-card" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
            <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Detalle de Operación <span style={{ color: '#D84315' }}>{operacionViendo.ref || operacionViendo.id?.substring(0,6)}</span></h2>
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
                <div className="detail-item"><span className="detail-label">Fecha del Servicio</span><span className="detail-value">{mostrarDato(operacionViendo.fechaServicio)}</span></div>
                <div className="detail-item"><span className="detail-label">Configuración Combinada</span><span className="detail-value"><span className={`dot dot-orange`}></span>{mostrarDato(operacionViendo.tipoServicio)} | {mostrarDato(operacionViendo.trafico)} | {mostrarDato(operacionViendo.carga)}</span></div>
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
                  {botonesDisponibles.map((botonStr: string) => (
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
                    {historialList.map((h: any) => (
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

    </div>
  );
};

export default OperacionesDashboard;