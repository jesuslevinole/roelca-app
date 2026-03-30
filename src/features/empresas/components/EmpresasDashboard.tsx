// src/features/empresas/components/EmpresasDashboard.tsx
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, eliminarRegistro } from '../../../config/firebase';
import { FormularioEmpresa } from './FormularioEmpresa';

const opcionesFiltro = [
  'Todo', 'Proveedor (Servicios)', 'Empresa Inactiva', 'Cliente (Mercancía)', 
  'Propietario (Remolques)', 'Bodega', 'Cliente (Paga)', 'Proveedor (Transporte)', 'Empresas Roelca'
];

const EmpresasDashboard = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [empresaEditando, setEmpresaEditando] = useState<any | null>(null);
  
  const [empresaViendo, setEmpresaViendo] = useState<any | null>(null);
  // ESTADO PARA TRES PESTAÑAS EN EL DETALLE
  const [activeTabDetalle, setActiveTabDetalle] = useState<'general' | 'fiscal' | 'contacto'>('general');

  const [empresas, setEmpresas] = useState<any[]>([]);
  const [filtroActivo, setFiltroActivo] = useState('Todo');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'empresas'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => {
        if (a.numCliente && b.numCliente) return a.numCliente.localeCompare(b.numCliente);
        return 0;
      });
      setEmpresas(data);
    });
    return () => unsubscribe();
  }, []);

  const handleNuevo = () => { setEmpresaEditando(null); setEstadoFormulario('abierto'); };
  
  const editarEmpresa = (empresa: any) => { 
    setEmpresaEditando(empresa); 
    setEmpresaViendo(null); 
    setEstadoFormulario('abierto'); 
  };

  const verDetalle = (empresa: any) => {
    setEmpresaViendo(empresa);
    setActiveTabDetalle('general');
  };
  
  const eliminarEmpresa = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente esta empresa?')) {
      try {
        await eliminarRegistro('empresas', id);
        setEmpresaViendo(null); 
      } catch (error) {
        alert('Hubo un error al eliminar. Revisa tu conexión a internet.');
      }
    }
  };

  const mostrarDato = (dato: any) => (dato && dato !== '' ? dato : '-');

  const empresasFiltradas = useMemo(() => {
    return empresas.filter(emp => {
      let pasaFiltro = true;
      if (filtroActivo === 'Empresa Inactiva') pasaFiltro = emp.status === 'Inactiva';
      else if (filtroActivo !== 'Todo') pasaFiltro = emp.tiposServicio === filtroActivo;

      if (!pasaFiltro) return false;
      if (!busqueda.trim()) return true;
      
      const term = busqueda.toLowerCase();
      return (
        (emp.nombre || '').toLowerCase().includes(term) ||
        (emp.numCliente || '').toLowerCase().includes(term) ||
        (emp.rfcTaxId || '').toLowerCase().includes(term)
      );
    });
  }, [empresas, filtroActivo, busqueda]);

  const exportarCSV = () => {
    if (empresasFiltradas.length === 0) return;
    const headers = ['# de Cliente', 'Razon Social', 'Nombre Corto', 'Status', 'Tipo de Servicios', 'RFC/Tax ID', 'Ultimo Servicio', 'Direccion', 'Telefono', 'Correo'];
    const csvContent = [
      headers.join(','),
      ...empresasFiltradas.map(emp => [
        `"${emp.numCliente || ''}"`, `"${(emp.nombre || '').replace(/"/g, '""')}"`, `"${(emp.nombreCorto || '').replace(/"/g, '""')}"`,
        `"${emp.status || ''}"`, `"${emp.tiposServicio || ''}"`, `"${emp.rfcTaxId || ''}"`, `"${emp.fechaUltimoServicio || ''}"`,
        `"${(emp.direccionLabel || emp.direccion || '').replace(/"/g, '""')}"`, `"${emp.telefono || ''}"`, `"${emp.correo || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Empresas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '12px 20px', background: 'none', border: 'none',
    borderBottom: isActive ? '2px solid #D84315' : '2px solid transparent',
    color: isActive ? '#f0f6fc' : '#8b949e', cursor: 'pointer',
    fontWeight: isActive ? '600' : 'normal', fontSize: '0.9rem',
    transition: 'all 0.2s ease', outline: 'none'
  });

  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      
      {estadoFormulario !== 'cerrado' && (
        <FormularioEmpresa 
          estado={estadoFormulario} initialData={empresaEditando} registros={empresas}
          onClose={() => { setEstadoFormulario('cerrado'); setEmpresaEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      {/* MODAL DETALLES CON 3 PESTAÑAS */}
      {empresaViendo && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="form-card detail-card" style={{ maxWidth: '650px', backgroundColor: '#0d1117', border: '1px solid #444', borderRadius: '12px', overflow: 'hidden' }}>
            
            <div className="form-header" style={{ borderBottom: '1px solid #30363d', padding: '24px' }}>
              <h2 style={{ color: '#f0f6fc', margin: 0, fontSize: '1.25rem' }}>Detalle de Empresa <span style={{ color: '#D84315' }}>{empresaViendo.numCliente}</span></h2>
              <button onClick={() => setEmpresaViendo(null)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            {/* PESTAÑAS DEL DETALLE */}
            <div style={{ display: 'flex', borderBottom: '1px solid #30363d', backgroundColor: '#161b22', padding: '0 24px' }}>
              <button type="button" onClick={() => setActiveTabDetalle('general')} style={tabStyle(activeTabDetalle === 'general')}>General</button>
              <button type="button" onClick={() => setActiveTabDetalle('fiscal')} style={tabStyle(activeTabDetalle === 'fiscal')}>Comercial / Fiscal</button>
              <button type="button" onClick={() => setActiveTabDetalle('contacto')} style={tabStyle(activeTabDetalle === 'contacto')}>Contacto</button>
            </div>

            <div className="detail-content" style={{ padding: '24px', minHeight: '300px' }}>
              
              {/* PESTAÑA: GENERAL */}
              {activeTabDetalle === 'general' && (
                <div className="detail-grid" style={{ gridTemplateColumns: '1fr', gap: '16px', animation: 'fadeIn 0.3s ease' }}>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Razón Social</span><span className="detail-value" style={{ color: '#f0f6fc', fontSize: '1rem', fontWeight: 'bold' }}>{mostrarDato(empresaViendo.nombre)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Nombre Corto</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.nombreCorto)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Status</span><span className="detail-value" style={{ color: '#c9d1d9', display: 'flex', alignItems: 'center', gap: '8px' }}><span className={`dot ${empresaViendo.status === 'Activa' ? 'dot-green' : 'dot-gray'}`}></span>{mostrarDato(empresaViendo.status)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Tipo de Servicios</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.tiposServicio)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>RFC / Tax ID</span><span className="detail-value font-mono" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.rfcTaxId)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Fecha del último servicio</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.fechaUltimoServicio)}</span></div>
                </div>
              )}

              {/* PESTAÑA: FISCAL Y COMERCIAL */}
              {activeTabDetalle === 'fiscal' && (
                <div className="detail-grid" style={{ gridTemplateColumns: '1fr', gap: '16px', animation: 'fadeIn 0.3s ease' }}>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Régimen Fiscal</span><span className="detail-value" style={{ color: '#f0f6fc', fontSize: '0.95rem' }}>{mostrarDato(empresaViendo.regimenFiscalLabel || empresaViendo.regimenFiscal)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Moneda</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.moneda)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Tipo de Factura</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.tipoFactura)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Condición de Pago</span><span className="detail-value" style={{ color: '#58a6ff', fontWeight: 'bold' }}>{mostrarDato(empresaViendo.condicionPago)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Días de Crédito</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.diasCredito)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Límite de Crédito</span><span className="detail-value font-mono" style={{ color: '#c9d1d9' }}>${Number(empresaViendo.limiteCredito || 0).toFixed(2)}</span></div>
                </div>
              )}

              {/* PESTAÑA: CONTACTO */}
              {activeTabDetalle === 'contacto' && (
                <div className="detail-grid" style={{ gridTemplateColumns: '1fr', gap: '16px', animation: 'fadeIn 0.3s ease' }}>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Dirección de la Empresa</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.direccionLabel || empresaViendo.direccion)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Teléfono</span><span className="detail-value font-mono" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.telefono)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Correo Electrónico</span><span className="detail-value" style={{ color: '#58a6ff' }}>{mostrarDato(empresaViendo.correo)}</span></div>
                </div>
              )}

            </div>

            <div className="form-actions detail-actions" style={{ padding: '24px', justifyContent: 'space-between', borderTop: '1px solid #30363d', backgroundColor: '#161b22', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => eliminarEmpresa(empresaViendo.id)} className="btn btn-danger-solid" style={{ backgroundColor: '#da3633', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Eliminar</button>
                <button onClick={() => editarEmpresa(empresaViendo)} className="btn btn-primary" style={{ backgroundColor: '#2ea043', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Editar</button>
              </div>
              <button onClick={() => setEmpresaViendo(null)} className="btn btn-outline" style={{ border: '1px solid #30363d', color: '#c9d1d9', backgroundColor: 'transparent', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER DEL MÓDULO --- */}
      <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '24px' }}>
        <h1 className="module-title" style={{ fontSize: '1.25rem', color: '#8b949e', margin: 0, fontWeight: '400' }}>
          Bases de Datos &gt; <span style={{ color: '#f0f6fc', fontWeight: '600' }}>Empresas</span>
        </h1>
        <div className="action-buttons" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={exportarCSV} disabled={empresasFiltradas.length === 0}>Exportar CSV</button>
          <button className="btn btn-primary" onClick={handleNuevo}>+ Agregar Empresa</button>
        </div>
      </div>

      {/* --- BARRA DE CONTROLES --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        
        <div style={{ position: 'relative', width: '200px' }}>
          <button className="btn btn-outline" onClick={() => setMostrarFiltros(!mostrarFiltros)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <span>Filtro: {filtroActivo}</span> <span>▼</span>
          </button>
          {mostrarFiltros && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', zIndex: 50, minWidth: '220px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', padding: '8px 0' }}>
              {opcionesFiltro.map((f) => (
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
        </div>

        <div style={{ position: 'relative', width: '50%', maxWidth: '600px' }}>
          <input 
            type="text" 
            placeholder="Buscar por Razón Social, RFC, Alias o # Cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ 
              backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9', 
              padding: '10px 12px 10px 40px', borderRadius: '8px', fontSize: '0.95rem', width: '100%' 
            }} 
          />
          <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>

        <div style={{ width: '200px' }}></div>
      </div>

      {/* --- TABLA DE DATOS CON SCROLL --- */}
      <div className="content-body" style={{ display: 'block' }}>
        <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}> 
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}># de Cliente</th>
                  <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Empresa</th>
                  <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Nombre Corto</th>
                  <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Tipo de Servicios</th>
                  <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>RFC / Tax Id</th>
                  <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Fecha Serv.</th>
                  <th style={{ padding: '16px', width: '120px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', position: 'sticky', right: 0, backgroundColor: '#161b22', zIndex: 11 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empresasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
                      {busqueda ? 'No se encontraron coincidencias.' : 'Aún no hay empresas registradas o ninguna coincide con el filtro.'}
                    </td>
                  </tr>
                ) : (
                  empresasFiltradas.map((emp) => (
                    <tr 
                      key={emp.id} 
                      onClick={() => verDetalle(emp)} 
                      style={{ borderBottom: '1px solid #21262d', transition: 'background-color 0.2s', cursor: 'pointer' }}
                      onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = '#21262d'} 
                      onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="font-mono" style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{emp.numCliente}</td>
                      <td style={{ padding: '16px', fontWeight: '500', color: '#f0f6fc', fontSize: '0.95rem' }}>{emp.nombre}</td>
                      <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{mostrarDato(emp.nombreCorto)}</td>
                      <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{emp.tiposServicio}</td>
                      <td className="font-mono" style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{mostrarDato(emp.rfcTaxId)}</td>
                      <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{mostrarDato(emp.fechaUltimoServicio)}</td>
                      
                      <td style={{ padding: '16px', textAlign: 'center', position: 'sticky', right: 0, backgroundColor: 'inherit', zIndex: 5 }} onClick={(e: any) => e.stopPropagation()}>
                        <div className="actions-cell" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            className="btn-small btn-edit" 
                            onClick={() => editarEmpresa(emp)}
                            style={{ background: 'transparent', border: '1px solid #30363d', borderRadius: '4px', color: '#c9d1d9', cursor: 'pointer', padding: '4px 12px', fontSize: '0.85rem' }}
                          >
                            Editar
                          </button>
                          <button 
                            className="btn-small btn-danger" 
                            onClick={() => eliminarEmpresa(emp.id)}
                            style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '4px 12px', fontSize: '0.85rem' }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EmpresasDashboard;