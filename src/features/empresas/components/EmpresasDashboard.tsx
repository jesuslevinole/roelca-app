// src/features/empresas/components/EmpresasDashboard.tsx
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db, eliminarRegistro, actualizarRegistro } from '../../../config/firebase';
import { FormularioEmpresa } from './FormularioEmpresa';
import { registrarLog } from '../../../utils/logger';
import * as XLSX from 'xlsx';

const opcionesFiltro = [
  'Todo', 'Proveedor (Servicios)', 'Empresa Inactiva', 'Baja', 'Cliente (Mercancía)', 
  'Propietario (Remolques)', 'Bodega', 'Cliente (Paga)', 'Proveedor (Transporte)', 'Empresas Roelca'
];

const EmpresasDashboard = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [empresaEditando, setEmpresaEditando] = useState<any | null>(null);
  
  const [empresaViendo, setEmpresaViendo] = useState<any | null>(null);
  const [activeTabDetalle, setActiveTabDetalle] = useState<'general' | 'fiscal' | 'contacto'>('general');

  const [empresas, setEmpresas] = useState<any[]>([]);
  const [filtroActivo, setFiltroActivo] = useState('Todo');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const [modalBajaAbierto, setModalBajaAbierto] = useState(false);
  const [empresaParaBaja, setEmpresaParaBaja] = useState<any | null>(null);
  const [fechaBaja, setFechaBaja] = useState(new Date().toISOString().split('T')[0]);
  const [observacionesBaja, setObservacionesBaja] = useState('');
  const [guardandoBaja, setGuardandoBaja] = useState(false);

  // --- NUEVO: MOTOR DE DICCIONARIOS PARA TRADUCCIÓN DE IDs ---
  const [diccionarios, setDiccionarios] = useState<any>({});

  useEffect(() => {
    // 1. Descargamos las empresas en tiempo real
    const unsubscribe = onSnapshot(collection(db, 'empresas'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => {
        if (a.numCliente && b.numCliente) return a.numCliente.localeCompare(b.numCliente);
        return 0;
      });
      setEmpresas(data);
    });

    // 2. Descargamos los catálogos para traducir los IDs
    const fetchDiccionarios = async () => {
      try {
        const getDict = async (col: string, labelField: string, formatFn?: Function) => {
          const snap = await getDocs(collection(db, col));
          const dict: any = {};
          snap.forEach(doc => dict[doc.id] = formatFn ? formatFn(doc.data()) : doc.data()[labelField]);
          return dict;
        };

        const [reg, mon, fac, dir] = await Promise.all([
          getDict('catalogo_regimen_fiscal', '', (d: any) => `${d.clave} - ${d.descripcion}`),
          getDict('catalogo_moneda', 'moneda'),
          getDict('catalogo_tipo_factura', 'nombre'),
          getDict('direcciones', 'direccionCompleta')
        ]);

        setDiccionarios({ regimenes: reg, monedas: mon, facturas: fac, direcciones: dir });
      } catch (error) {
        console.error("Error cargando diccionarios de traducción:", error);
      }
    };

    fetchDiccionarios();
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
        await registrarLog('Empresas', 'Eliminación', `Eliminó permanentemente una empresa.`);
        setEmpresaViendo(null); 
      } catch (error) {
        alert('Hubo un error al eliminar. Revisa tu conexión a internet.');
      }
    }
  };

  const abrirModalBaja = (empresa: any) => {
    setEmpresaParaBaja(empresa);
    setFechaBaja(new Date().toISOString().split('T')[0]);
    setObservacionesBaja('');
    setModalBajaAbierto(true);
  };

  const confirmarBaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoBaja(true);
    try {
      await actualizarRegistro('empresas', empresaParaBaja.id, {
        status: 'Baja',
        fechaBaja: fechaBaja,
        observacionesBaja: observacionesBaja
      });
      await registrarLog('Empresas', 'Edición', `Dio de baja a la empresa: ${empresaParaBaja.nombre}`);
      
      if (empresaViendo && empresaViendo.id === empresaParaBaja.id) {
        setEmpresaViendo({ ...empresaViendo, status: 'Baja', fechaBaja, observacionesBaja });
      }
      setModalBajaAbierto(false);
    } catch (error) {
      alert("Error al dar de baja. Revisa tu conexión.");
    } finally {
      setGuardandoBaja(false);
    }
  };

  const renderArrayValues = (values: any) => {
    if (!values) return '-';
    if (Array.isArray(values)) {
      if (values.length === 0) return '-';
      return values.join(', ');
    }
    return values; 
  };

  const mostrarDato = (dato: any) => (dato && dato !== '' ? dato : '-');

  // Funciones de ayuda para traducir el ID a su texto correspondiente usando los diccionarios
  const getLabel = (idOrRaw: string, dictName: string) => {
    if (!idOrRaw) return '-';
    const dict = diccionarios[dictName];
    if (dict && dict[idOrRaw]) return dict[idOrRaw];
    return idOrRaw; // Fallback: Si no es un ID o no lo encuentra, asume que ya era el texto
  };

  const getLabelExt = (labelField: string, idField: string, dictName: string) => {
    if (labelField && labelField !== '-') return labelField;
    if (!idField) return '-';
    const dict = diccionarios[dictName];
    if (dict && dict[idField]) return dict[idField];
    return idField;
  };

  // --- TRADUCCIÓN Y FILTRADO MAESTRO ---
  const empresasEnriquecidas = useMemo(() => {
    return empresas.map(emp => {
      // Búsqueda especial para el Cliente Relacionado dentro de la misma colección
      let clienteRelName = emp.clienteRelacionadoNombre;
      if (!clienteRelName && emp.clienteRelacionadoId) {
        const match = empresas.find(e => e.id === emp.clienteRelacionadoId);
        clienteRelName = match ? match.nombre : emp.clienteRelacionadoId;
      }

      // Inyectamos las variables "Limpias" (Traducidas) al objeto para usarlas en la UI y Excel
      return {
        ...emp,
        _regimenLabel: getLabelExt(emp.regimenFiscalLabel, emp.regimenFiscalId || emp.regimenFiscal, 'regimenes'),
        _monedaLabel: getLabel(emp.moneda, 'monedas'),
        _facturaLabel: getLabel(emp.tipoFactura, 'facturas'),
        _direccionLabel: getLabelExt(emp.direccionLabel, emp.direccionId || emp.direccion, 'direcciones'),
        _clienteRelLabel: clienteRelName || '-'
      };
    }).filter(emp => {
      let pasaFiltro = true;
      if (filtroActivo === 'Empresa Inactiva') pasaFiltro = emp.status === 'Inactiva';
      else if (filtroActivo === 'Baja') pasaFiltro = emp.status === 'Baja';
      else if (filtroActivo !== 'Todo') {
        if (Array.isArray(emp.tiposEmpresa)) {
          pasaFiltro = emp.tiposEmpresa.includes(filtroActivo);
        } else {
          pasaFiltro = emp.tiposServicio === filtroActivo || emp.tiposEmpresa === filtroActivo;
        }
      }

      if (!pasaFiltro) return false;
      if (!busqueda.trim()) return true;
      
      const term = busqueda.toLowerCase();
      return (
        (emp.nombre || '').toLowerCase().includes(term) ||
        (emp.numCliente || '').toLowerCase().includes(term) ||
        (emp.rfcTaxId || '').toLowerCase().includes(term)
      );
    });
  }, [empresas, diccionarios, filtroActivo, busqueda]);

  const exportarExcel = () => {
    if (empresasEnriquecidas.length === 0) return;

    // Utilizamos los campos traducidos (_) en el Excel en lugar de los IDs brutos
    const datosExcel = empresasEnriquecidas.map(emp => ({
      '# de Cliente': emp.numCliente || '',
      'Razón Social': emp.nombre || '',
      'Nombre Corto': emp.nombreCorto || '',
      'Status': emp.status || '',
      'Tipo(s) de Empresa': renderArrayValues(emp.tiposEmpresa),
      'Servicios Ofrecidos': renderArrayValues(emp.tiposServicio),
      'Cliente Relacionado': emp._clienteRelLabel !== '-' ? emp._clienteRelLabel : '',
      'RFC/Tax ID': emp.rfcTaxId || '',
      'Último Servicio': emp.fechaUltimoServicio || '',
      'Régimen Fiscal': emp._regimenLabel !== '-' ? emp._regimenLabel : '',
      'Moneda': emp._monedaLabel !== '-' ? emp._monedaLabel : '',
      'Tipo de Factura': emp._facturaLabel !== '-' ? emp._facturaLabel : '',
      'Condición de Pago': emp.condicionPago || '',
      'Días de Crédito': emp.diasCredito || 0,
      'Límite de Crédito': emp.limiteCredito || 0,
      'Dirección': emp._direccionLabel !== '-' ? emp._direccionLabel : '',
      'Maps': emp.maps || '',
      'Teléfono': emp.telefono || '',
      'Correo': emp.correo || '',
      'Fecha de Baja': emp.fechaBaja || '',
      'Observaciones de Baja': emp.observacionesBaja || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);

    const columnWidths = [
      { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 35 }, { wch: 35 }, 
      { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 45 }, { wch: 15 }, { wch: 25 }, 
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 50 }, { wch: 30 }, { wch: 20 }, 
      { wch: 30 }, { wch: 15 }, { wch: 40 }
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Directorio_Empresas');

    XLSX.writeFile(workbook, `Empresas_${new Date().toISOString().split('T')[0]}.xlsx`);
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

      {/* --- HEADER DEL MÓDULO --- */}
      <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '24px' }}>
        <h1 className="module-title" style={{ fontSize: '1.25rem', color: '#8b949e', margin: 0, fontWeight: '400' }}>
          Bases de Datos {'>'} <span style={{ color: '#f0f6fc', fontWeight: '600' }}>Empresas</span>
        </h1>
        <div className="action-buttons" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={exportarExcel} disabled={empresasEnriquecidas.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Exportar Excel
          </button>
          <button className="btn btn-primary" onClick={handleNuevo}>+ Agregar Empresa</button>
        </div>
      </div>

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

      <div className="content-body" style={{ display: 'block' }}>
        <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}> 
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
              <thead style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '16px', width: '120px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', position: 'sticky', left: 0, backgroundColor: '#161b22', zIndex: 11, borderRight: '1px solid #30363d' }}>Acciones</th>
                  <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}># de Cliente</th>
                  <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Empresa</th>
                  <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Nombre Corto</th>
                  <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Tipo de Empresa</th>
                  <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Servicios</th>
                  <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>RFC / Tax Id</th>
                  <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Fecha Serv.</th>
                </tr>
              </thead>
              <tbody>
                {empresasEnriquecidas.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
                      {busqueda ? 'No se encontraron coincidencias.' : 'Aún no hay empresas registradas o ninguna coincide con el filtro.'}
                    </td>
                  </tr>
                ) : (
                  empresasEnriquecidas.map((emp) => (
                    <tr 
                      key={emp.id} 
                      onClick={() => verDetalle(emp)} 
                      style={{ borderBottom: '1px solid #21262d', transition: 'background-color 0.2s', cursor: 'pointer' }}
                      onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = '#21262d'} 
                      onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '16px', textAlign: 'center', position: 'sticky', left: 0, backgroundColor: 'inherit', zIndex: 5, borderRight: '1px solid #30363d' }} onClick={(e: any) => e.stopPropagation()}>
                        <div className="actions-cell" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            className="btn-small btn-edit" 
                            onClick={() => editarEmpresa(emp)}
                            style={{ background: 'transparent', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', cursor: 'pointer', padding: '4px 12px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            Editar
                          </button>
                          <button 
                            className="btn-small btn-danger" 
                            onClick={() => eliminarEmpresa(emp.id)}
                            style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '4px 12px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>

                      <td className="font-mono" style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>
                        {emp.status === 'Baja' ? <span style={{ color: '#ef4444', textDecoration: 'line-through' }}>{emp.numCliente}</span> : emp.numCliente}
                      </td>
                      <td style={{ padding: '16px', fontWeight: '500', color: emp.status === 'Baja' ? '#ef4444' : '#f0f6fc', fontSize: '0.95rem' }}>
                        {emp.nombre} {emp.status === 'Baja' && <span style={{ fontSize: '0.7rem', border: '1px solid #ef4444', padding: '2px 4px', borderRadius: '4px', marginLeft: '6px' }}>BAJA</span>}
                      </td>
                      <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{mostrarDato(emp.nombreCorto)}</td>
                      
                      <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.85rem', maxWidth: '200px', whiteSpace: 'normal' }}>
                        {renderArrayValues(emp.tiposEmpresa)}
                      </td>
                      <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.85rem', maxWidth: '200px', whiteSpace: 'normal' }}>
                        {renderArrayValues(emp.tiposServicio)}
                      </td>
                      
                      <td className="font-mono" style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{mostrarDato(emp.rfcTaxId)}</td>
                      <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{mostrarDato(emp.fechaUltimoServicio)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* MODAL DETALLES */}
      {empresaViendo && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="form-card detail-card" style={{ maxWidth: '850px', backgroundColor: '#0d1117', border: '1px solid #444', borderRadius: '12px', overflow: 'hidden' }}>
            
            <div className="form-header" style={{ borderBottom: '1px solid #30363d', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ color: '#f0f6fc', margin: 0, fontSize: '1.25rem' }}>Detalle de Empresa <span style={{ color: '#D84315' }}>{empresaViendo.numCliente}</span></h2>
                {empresaViendo.status === 'Baja' && (
                  <span style={{ display: 'inline-block', marginTop: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    EMPRESA DADA DE BAJA EL {empresaViendo.fechaBaja}
                  </span>
                )}
              </div>
              <button onClick={() => setEmpresaViendo(null)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', borderBottom: '1px solid #30363d', backgroundColor: '#161b22', padding: '0 24px' }}>
              <button type="button" onClick={() => setActiveTabDetalle('general')} style={tabStyle(activeTabDetalle === 'general')}>General</button>
              <button type="button" onClick={() => setActiveTabDetalle('fiscal')} style={tabStyle(activeTabDetalle === 'fiscal')}>Comercial / Fiscal</button>
              <button type="button" onClick={() => setActiveTabDetalle('contacto')} style={tabStyle(activeTabDetalle === 'contacto')}>Contacto</button>
            </div>

            <div className="detail-content" style={{ padding: '24px', minHeight: '300px' }}>
              
              {activeTabDetalle === 'general' && (
                <div className="detail-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', animation: 'fadeIn 0.3s ease' }}>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Razón Social</span><span className="detail-value" style={{ color: '#f0f6fc', fontSize: '1rem', fontWeight: 'bold' }}>{mostrarDato(empresaViendo.nombre)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Nombre Corto</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.nombreCorto)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Status</span><span className="detail-value" style={{ color: '#c9d1d9', display: 'flex', alignItems: 'center', gap: '8px' }}><span className={`dot ${empresaViendo.status === 'Activa' ? 'dot-green' : empresaViendo.status === 'Baja' ? 'dot-red' : 'dot-gray'}`}></span>{mostrarDato(empresaViendo.status)}</span></div>
                  
                  <div className="detail-item" style={{ gridColumn: 'span 3' }}><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Tipo(s) de Empresa</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{renderArrayValues(empresaViendo.tiposEmpresa)}</span></div>
                  <div className="detail-item" style={{ gridColumn: 'span 3' }}><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Servicios Ofrecidos</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{renderArrayValues(empresaViendo.tiposServicio)}</span></div>
                  
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>RFC / Tax ID</span><span className="detail-value font-mono" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.rfcTaxId)}</span></div>
                  <div className="detail-item" style={{ gridColumn: 'span 2' }}><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Fecha del último servicio</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.fechaUltimoServicio)}</span></div>
                  
                  {Array.isArray(empresaViendo.tiposEmpresa) && empresaViendo.tiposEmpresa.includes('Cliente (Mercancía)') && (
                    <div className="detail-item" style={{ gridColumn: 'span 3' }}><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Cliente Paga (Relacionado)</span><span className="detail-value" style={{ color: '#58a6ff', fontWeight: '500' }}>{mostrarDato(empresaViendo._clienteRelLabel)}</span></div>
                  )}

                  {empresaViendo.status === 'Baja' && (
                    <div style={{ gridColumn: 'span 3', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '8px', border: '1px dashed #ef4444', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                      <div className="detail-item" style={{ marginBottom: '0' }}><span className="detail-label" style={{ color: '#ef4444', fontSize: '0.8rem' }}>Fecha de Baja</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.fechaBaja)}</span></div>
                      <div className="detail-item"><span className="detail-label" style={{ color: '#ef4444', fontSize: '0.8rem' }}>Observaciones de Baja</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.observacionesBaja)}</span></div>
                    </div>
                  )}
                </div>
              )}

              {activeTabDetalle === 'fiscal' && (
                <div className="detail-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', animation: 'fadeIn 0.3s ease' }}>
                  {/* AQUÍ SE IMPRIMEN LAS VARIABLES TRADUCIDAS '_' DEL MOTOR */}
                  <div className="detail-item" style={{ gridColumn: 'span 3' }}><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Régimen Fiscal</span><span className="detail-value" style={{ color: '#f0f6fc', fontSize: '0.95rem' }}>{mostrarDato(empresaViendo._regimenLabel)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Moneda</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo._monedaLabel)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Tipo de Factura</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo._facturaLabel)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Condición de Pago</span><span className="detail-value" style={{ color: '#58a6ff', fontWeight: 'bold' }}>{mostrarDato(empresaViendo.condicionPago)}</span></div>
                  <div className="detail-item"><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Días de Crédito</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.diasCredito)}</span></div>
                  <div className="detail-item" style={{ gridColumn: 'span 2' }}><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Límite de Crédito</span><span className="detail-value font-mono" style={{ color: '#c9d1d9' }}>${Number(empresaViendo.limiteCredito || 0).toFixed(2)}</span></div>
                </div>
              )}

              {activeTabDetalle === 'contacto' && (
                <div className="detail-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', animation: 'fadeIn 0.3s ease' }}>
                  <div className="detail-item" style={{ gridColumn: 'span 3' }}><span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Dirección de la Empresa</span><span className="detail-value" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo._direccionLabel)}</span></div>
                  <div className="detail-item">
                    <span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Teléfono</span>
                    <span className="detail-value font-mono" style={{ color: '#c9d1d9' }}>{mostrarDato(empresaViendo.telefono)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Correo Electrónico</span>
                    <span className="detail-value" style={{ color: '#58a6ff' }}>{mostrarDato(empresaViendo.correo)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>Google Maps (Ubicación)</span>
                    {empresaViendo.maps ? (
                      <a href={empresaViendo.maps} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', textDecoration: 'none', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', marginTop: '4px' }}>
                        📍 Abrir en Google Maps
                      </a>
                    ) : (
                      <span className="detail-value" style={{ color: '#c9d1d9' }}>-</span>
                    )}
                  </div>
                </div>
              )}

            </div>

            <div className="form-actions detail-actions" style={{ padding: '24px', justifyContent: 'space-between', borderTop: '1px solid #30363d', backgroundColor: '#161b22', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => eliminarEmpresa(empresaViendo.id)} className="btn btn-danger-solid" style={{ backgroundColor: '#da3633', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Eliminar</button>
                {empresaViendo.status !== 'Baja' && (
                  <button onClick={() => abrirModalBaja(empresaViendo)} className="btn btn-outline" style={{ border: '1px solid #eab308', color: '#eab308', backgroundColor: 'transparent', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Dar de Baja</button>
                )}
                <button onClick={() => editarEmpresa(empresaViendo)} className="btn btn-primary" style={{ backgroundColor: '#2ea043', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Editar</button>
              </div>
              <button onClick={() => setEmpresaViendo(null)} className="btn btn-outline" style={{ border: '1px solid #30363d', color: '#c9d1d9', backgroundColor: 'transparent', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CONFIRMAR BAJA */}
      {modalBajaAbierto && empresaParaBaja && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', zIndex: 2000 }}>
          <div className="form-card" style={{ maxWidth: '400px', backgroundColor: '#0d1117', border: '1px solid #eab308', borderRadius: '12px' }}>
            <div className="form-header" style={{ padding: '20px', borderBottom: '1px solid #30363d', backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
              <h3 style={{ margin: 0, color: '#eab308', fontSize: '1.1rem' }}>⚠️ Dar de Baja Cliente</h3>
            </div>
            <form onSubmit={confirmarBaja} style={{ padding: '20px' }}>
              <p style={{ color: '#c9d1d9', fontSize: '0.9rem', marginBottom: '20px' }}>Estás a punto de dar de baja a <strong>{empresaParaBaja.nombre}</strong>.</p>
              
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ color: '#8b949e' }}>Fecha de Baja *</label>
                <input type="date" className="form-control" value={fechaBaja} onChange={e => setFechaBaja(e.target.value)} required style={{ backgroundColor: '#010409', color: '#c9d1d9', border: '1px solid #30363d' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ color: '#8b949e' }}>Observaciones *</label>
                <textarea className="form-control" value={observacionesBaja} onChange={e => setObservacionesBaja(e.target.value)} required rows={3} placeholder="Motivo de la baja..." style={{ backgroundColor: '#010409', color: '#c9d1d9', border: '1px solid #30363d', resize: 'none' }}></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setModalBajaAbierto(false)} className="btn btn-outline">Cancelar</button>
                <button type="submit" className="btn" disabled={guardandoBaja} style={{ backgroundColor: '#eab308', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {guardandoBaja ? 'Guardando...' : 'Confirmar Baja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmpresasDashboard;