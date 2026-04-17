// src/features/gastos/components/mtto/MttoDashboard.tsx
import { useState, useEffect } from 'react';
import { FormularioMtto } from './FormularioMtto';
import { collection, query, getDocs, orderBy, limit, doc, writeBatch } from 'firebase/firestore'; 
import { db } from '../../../../config/firebase';

const MttoDashboard = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [mttoEditando, setMttoEditando] = useState<any | null>(null);
  
  const [mttoGlobales, setMttoGlobales] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const [catalogosCacheados, setCatalogosCacheados] = useState<any>({});
  const [busqueda, setBusqueda] = useState('');

  // ✅ ESTADOS DE PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 50;

  // Estado para el hover de las filas
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // ✅ NUEVOS ESTADOS PARA SELECCIÓN MÚLTIPLE E INVOICE MASIVO
  const [gastosSeleccionados, setGastosSeleccionados] = useState<string[]>([]);
  const [modalInvoiceMasivo, setModalInvoiceMasivo] = useState(false);
  const [nuevoInvoiceTexto, setNuevoInvoiceTexto] = useState('');
  const [cargandoMasivo, setCargandoMasivo] = useState(false);

  // ✅ DESCARGA DE DATOS
  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      try {
        let catGuardados = null;
        const cacheCatStr = sessionStorage.getItem('roelca_catalogos_v1');

        if (cacheCatStr) {
          catGuardados = JSON.parse(cacheCatStr);
          setCatalogosCacheados(catGuardados);
        } else {
          // Descargamos catálogos base si no existen en caché
          const [empSnap, unidSnap, servSnap, monSnap, fpSnap, opSnap] = await Promise.all([
            getDocs(collection(db, 'empresas')),
            getDocs(collection(db, 'unidades')),
            getDocs(collection(db, 'catalogo_tipo_servicio')),
            getDocs(collection(db, 'catalogo_moneda')),
            getDocs(collection(db, 'catalogo_formas_pago')),
            getDocs(query(collection(db, 'operaciones'), limit(200)))
          ]);

          catGuardados = {
            empresas: empSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
            unidades: unidSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
            servicios: servSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
            monedas: monSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
            formasPago: fpSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
            operaciones: opSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
          };
          
          sessionStorage.setItem('roelca_catalogos_v1', JSON.stringify(catGuardados));
          setCatalogosCacheados(catGuardados);
        }

        // Cargar Gastos MTTO
        const q = query(collection(db, 'gastos_mtto'), orderBy('createdAt', 'desc'), limit(100));
        const snap = await getDocs(q);
        
        const mttoData = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setMttoGlobales(mttoData);

      } catch (e) {
        console.error("Error al cargar datos MTTO:", e);
      }
      setCargando(false);
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
    setGastosSeleccionados([]); // Limpiar selección al buscar
  }, [busqueda]);

  const handleNuevo = () => { setMttoEditando(null); setEstadoFormulario('abierto'); };
  const editarMtto = (mtto: any) => { setMttoEditando(mtto); setEstadoFormulario('abierto'); };
  
  const eliminarMtto = (id: string) => {
    if (window.confirm('¿Eliminar registro permanentemente?')) {
      setMttoGlobales(prev => prev.filter((m: any) => m.id !== id));
      // Si estaba seleccionado, lo quitamos
      setGastosSeleccionados(prev => prev.filter(selId => selId !== id));
    }
  };

  // ✅ FUNCIONES DE MAPEO PARA RENDERIZAR NOMBRES EN LUGAR DE IDs
  const mostrarNombreUnidad = (unidadValor: string) => {
    if (!unidadValor) return '-';
    if (unidadValor.length > 15 && catalogosCacheados.unidades) {
        const uni = catalogosCacheados.unidades.find((u:any) => u.id === unidadValor);
        return uni ? (uni.numeroEconomico || uni.nombre) : unidadValor;
    }
    return unidadValor;
  };

  const mostrarDatoMapeado = (id: string | null | undefined, catalogo: string, campoRetorno: string = 'nombre') => {
    if (!id) return '-';
    if (!catalogosCacheados[catalogo] || !Array.isArray(catalogosCacheados[catalogo])) return id;
    
    const elemento = catalogosCacheados[catalogo].find((item: any) => item.id === id);
    if (!elemento) return id;

    return elemento[campoRetorno] || elemento.nombre || elemento.descripcion || elemento.ref || id;
  };

  const formatoMoneda = (monto: any) => {
    if (monto === undefined || monto === null || monto === '') return '-';
    return `$ ${parseFloat(monto).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const handleGuardado = (nuevoMtto: any) => {
    if (mttoEditando) {
      setMttoGlobales(prev => prev.map((m: any) => m.id === nuevoMtto.id ? nuevoMtto : m));
    } else {
      setMttoGlobales(prev => [nuevoMtto, ...prev]);
    }
    setEstadoFormulario('cerrado');
    setMttoEditando(null);
  };

  // ✅ Lógica de Selección Múltiple (Checkboxes)
  const toggleSeleccion = (id: string) => {
    setGastosSeleccionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // ✅ Guardado Masivo de Invoices (Batch Transaction)
  const aplicarInvoiceMasivo = async () => {
    if (!nuevoInvoiceTexto.trim()) return alert("Debes escribir un número o texto para el Invoice.");
    if (gastosSeleccionados.length === 0) return alert("No hay gastos seleccionados.");

    setCargandoMasivo(true);
    try {
      const batch = writeBatch(db);
      const estatusFacturado = 'Facturado'; // Regla de negocio: Si tiene invoice, está facturado

      // Agregamos cada actualización al lote (Batch)
      gastosSeleccionados.forEach(id => {
        const docRef = doc(db, 'gastos_mtto', id);
        batch.update(docRef, { 
          invoice: nuevoInvoiceTexto.trim(),
          estatus: estatusFacturado 
        });
      });

      // Ejecutamos todo de una sola vez
      await batch.commit();

      // Actualizamos el estado local para reflejar los cambios en pantalla inmediatamente
      setMttoGlobales(prev => prev.map(m => {
        if (gastosSeleccionados.includes(m.id)) {
          return { ...m, invoice: nuevoInvoiceTexto.trim(), estatus: estatusFacturado };
        }
        return m;
      }));

      alert(`Se aplicó el Invoice a ${gastosSeleccionados.length} registro(s) exitosamente.`);
      setModalInvoiceMasivo(false);
      setGastosSeleccionados([]); // Limpiar selección tras el éxito
      setNuevoInvoiceTexto('');

    } catch (error) {
      console.error("Error en actualización masiva:", error);
      alert("Hubo un error al aplicar el Invoice masivo.");
    } finally {
      setCargandoMasivo(false);
    }
  };


  // ✅ Filtrado GLOBAL por buscador
  const registrosFiltrados = mttoGlobales.filter(m => {
    const b = busqueda.toLowerCase();
    return (
      String(m.numeroGasto || '').toLowerCase().includes(b) ||
      String(m.invoice || '').toLowerCase().includes(b) ||
      String(m.estatus || '').toLowerCase().includes(b) ||
      String(m.operador || '').toLowerCase().includes(b) ||
      String(m.proveedorNombre || '').toLowerCase().includes(b)
    );
  });

  // ✅ LÓGICA DE PAGINACIÓN
  const totalPaginas = Math.ceil(registrosFiltrados.length / registrosPorPagina);
  const indiceUltimoRegistro = paginaActual * registrosPorPagina;
  const indicePrimerRegistro = indiceUltimoRegistro - registrosPorPagina;
  const registrosEnPantalla = registrosFiltrados.slice(indicePrimerRegistro, indiceUltimoRegistro);

  const irPaginaSiguiente = () => setPaginaActual(prev => Math.min(prev + 1, totalPaginas));
  const irPaginaAnterior = () => setPaginaActual(prev => Math.max(prev - 1, 1));

  // ✅ Sincronización de exportador CSV con las 24 columnas exactas
  const exportarCSV = () => {
    if (registrosFiltrados.length === 0) return alert("No hay datos para exportar.");
    const encabezados = [
      '# de Gasto', '# de Invoice', 'Estatus', 'Fecha', 'Unidad', 'Operador', 
      'Descripcion', 'Proveedor', 'Tipo de Servicio', 'Autorizado por', 
      'Credito/Contado', 'Moneda', 'Importe', 'IVA', 'Ret IVA', 'Ret ISR', 
      'Total', 'Factura', 'Fecha Factura', 'Descripcion', 'Fecha de Pago', 
      'Forma de pago', 'Observaciones', 'Asignar Operacion'
    ];
    
    const lineas = registrosFiltrados.map(m => [
      `"${m.numeroGasto || ''}"`,
      `"${m.invoice || ''}"`, 
      `"${m.estatus || ''}"`,
      `"${m.fecha || ''}"`,
      `"${mostrarNombreUnidad(m.unidadId || m.unidad)}"`,
      `"${m.operador || ''}"`,
      `"${m.descripcion || m.descripcionGeneral || ''}"`,
      `"${m.proveedorNombre || mostrarDatoMapeado(m.proveedorId, 'empresas')}"`,
      `"${mostrarDatoMapeado(m.tipoServicioId, 'servicios')}"`,
      `"${m.autorizadoPor || ''}"`,
      `"${m.condicionPago || ''}"`,
      `"${mostrarDatoMapeado(m.monedaId, 'monedas')}"`,
      `"${Number(m.importe || 0).toFixed(2)}"`,
      `"${Number(m.ivaMonto || 0).toFixed(2)} (${m.ivaPorcentaje || 0}%)"`,
      `"${Number(m.retIva || 0).toFixed(2)}"`,
      `"${Number(m.retIsr || 0).toFixed(2)}"`,
      `"${Number(m.total || 0).toFixed(2)}"`,
      `"${m.facturaTexto || ''}"`,
      `"${m.fechaFactura || ''}"`,
      `"${m.descripcionFactura || ''}"`,
      `"${m.fechaPago || ''}"`,
      `"${mostrarDatoMapeado(m.formaPagoId, 'formasPago')}"`,
      `"${m.observaciones || ''}"`,
      `"${mostrarDatoMapeado(m.operacionAsignadaId, 'operaciones', 'ref')}"`
    ].join(','));

    const csvContent = [encabezados.join(','), ...lineas].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MTTO_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease', width: '100%', boxSizing: 'border-box' }}>
      
      {estadoFormulario !== 'cerrado' && (
        <FormularioMtto 
          estado={estadoFormulario} 
          initialData={mttoEditando}
          onClose={() => { setEstadoFormulario('cerrado'); setMttoEditando(null); }}
          catalogos={catalogosCacheados} 
          onSave={handleGuardado}
        />
      )}

      {/* CONTENEDOR MAESTRO */}
     <div style={{ width: '100%', margin: '0 auto' }}>
        
        {/* TÍTULO LIMPIO */}
        <h1 className="module-title" style={{ fontSize: '1.5rem', color: '#f0f6fc', margin: '0 0 24px 0', fontWeight: 'bold', textAlign: 'center' }}>
          Gastos Mantenimiento (MTTO)
        </h1>

        {/* ✅ FILA 1: BARRA DE BÚSQUEDA Y FILTROS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px', width: '100%' }}>
          <div style={{ flex: '1 1 auto', maxWidth: '200px', minWidth: '120px' }}>
            <select className="form-control" style={{ width: '100%', backgroundColor: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9' }}>
              <option>Filtro: Todo</option>
            </select>
          </div>

          <div style={{ flex: '2 1 250px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
              <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder="Buscar por # Gasto, Invoice, Operador..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 40px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Espaciador invisible para mantener el buscador centrado */}
          <div style={{ flex: '1 1 auto', maxWidth: '200px', minWidth: '120px' }}></div> 
        </div>

        {/* ✅ FILA 2: BARRA DE BOTONES (SIEMPRE CENTRADOS) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '24px', width: '100%' }}>
          
          {/* BOTÓN ESTÉTICO DE ASIGNACIÓN MASIVA */}
          {gastosSeleccionados.length > 0 && (
            <button 
              onClick={() => setModalInvoiceMasivo(true)} 
              style={{ 
                background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
                color: '#ffffff', 
                border: 'none', 
                padding: '10px 24px', 
                borderRadius: '50px', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                boxShadow: '0 4px 12px rgba(35, 134, 54, 0.3)',
                animation: 'fadeIn 0.2s ease', 
                whiteSpace: 'nowrap',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e: any) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(35, 134, 54, 0.5)';
              }}
              onMouseLeave={(e: any) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(35, 134, 54, 0.3)';
              }}
            >
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M1.5 1.5A.5.5 0 0 0 1 2v4.8a2.5 2.5 0 0 0 2.5 2.5h9.793l-3.347 3.346a.5.5 0 0 0 .708.708l4.2-4.2a.5.5 0 0 0 0-.708l-4-4a.5.5 0 1 0-.708.708L13.293 8.3H3.5A1.5 1.5 0 0 1 2 6.8V2a.5.5 0 0 0-.5-.5z"/></svg>
              Asignar Invoice ({gastosSeleccionados.length})
            </button>
          )}

          <button className="btn btn-outline" onClick={exportarCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', borderRadius: '50px', padding: '10px 24px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Exportar CSV
          </button>
          <button className="btn btn-primary" onClick={handleNuevo} style={{ whiteSpace: 'nowrap', borderRadius: '50px', padding: '10px 24px' }}>
            + Agregar Gasto
          </button>
        </div>

        {/* TABLA RESPONSIVE */}
        <div className="content-body" style={{ display: 'block', width: '100%' }}>
          <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', width: '100%' }}>
            {cargando ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>Descargando base de datos MTTO...</div>
            ) : (
              <table className="data-table" style={{ width: '100%', minWidth: '3200px', borderCollapse: 'collapse', textAlign: 'left' }}>
                {/* Cabeceras de la Tabla */}
                <thead style={{ backgroundColor: '#161b22', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    {/* ✅ ELIMINADO EL CHECKBOX MAESTRO: Solo dejamos el espacio vacío para mantener el diseño */}
                    <th style={{ padding: '16px 8px', width: '40px', textAlign: 'center', position: 'sticky', left: 0, backgroundColor: '#161b22', zIndex: 12, borderRight: '1px solid #30363d', borderBottom: '1px solid #30363d' }}>
                    </th>

                    <th style={{ padding: '16px', width: '140px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', position: 'sticky', left: '56px', backgroundColor: '#161b22', zIndex: 12, borderRight: '1px solid #30363d', borderBottom: '1px solid #30363d' }}>
                      Acciones
                    </th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}># de Gasto</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}># de Invoice</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Estatus</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Fecha</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Unidad</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Operador</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Descripción</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Proveedor</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Tipo de Servicio</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Autorizado por</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Crédito/Contado</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Moneda</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Importe</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>IVA</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Ret IVA</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Ret ISR</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Total</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Factura</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Fecha Factura</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Descripción (Factura)</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Fecha de Pago</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Forma de pago</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Observaciones</th>
                    <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Asignar Operación</th>
                  </tr>
                </thead>
                
                {/* Cuerpo de la Tabla */}
                <tbody>
                  {registrosEnPantalla.length === 0 ? (
                    <tr>
                      <td colSpan={26} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
                        {busqueda ? 'No se encontraron gastos para tu búsqueda.' : 'No hay gastos MTTO registrados.'}
                      </td>
                    </tr>
                  ) : (
                    registrosEnPantalla.map((m: any) => {
                      const isSelected = gastosSeleccionados.includes(m.id);
                      // ✅ BLOQUEO DE SELECCIÓN SI YA ESTÁ FACTURADO
                      const yaFacturado = m.estatus === 'Facturado' || (m.invoice && m.invoice.trim() !== '');

                      return (
                      <tr 
                        key={m.id} 
                        style={{ borderBottom: '1px solid #21262d', backgroundColor: isSelected ? 'rgba(56, 139, 253, 0.1)' : (hoveredRowId === m.id ? '#21262d' : '#0d1117'), transition: 'background-color 0.2s' }}
                        onMouseEnter={() => setHoveredRowId(m.id)} 
                        onMouseLeave={() => setHoveredRowId(null)}
                      >
                        {/* CELDA DE SELECCIÓN INDIVIDUAL */}
                        <td style={{ padding: '16px 8px', textAlign: 'center', position: 'sticky', left: 0, backgroundColor: isSelected ? '#1f2937' : 'inherit', zIndex: 5, borderRight: '1px solid #30363d' }}>
                          {!yaFacturado && (
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => toggleSeleccion(m.id)}
                              style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                            />
                          )}
                        </td>

                        {/* Botones Fijos */}
                        <td style={{ padding: '16px', textAlign: 'center', position: 'sticky', left: '56px', backgroundColor: isSelected ? '#1f2937' : 'inherit', zIndex: 5, borderRight: '1px solid #30363d' }}>
                          <div className="actions-cell" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                              className="btn-small btn-edit" 
                              onClick={() => editarMtto(m)}
                              style={{ background: 'transparent', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', cursor: 'pointer', padding: '4px 8px', fontSize: '0.8rem', transition: 'all 0.2s' }}
                              onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                              onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              Editar
                            </button>
                            <button 
                              className="btn-small btn-danger-outline" 
                              onClick={() => eliminarMtto(m.id)}
                              style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '4px 8px', fontSize: '0.8rem', transition: 'all 0.2s' }}
                              onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                              onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>

                        {/* 24 Columnas de Datos */}
                        <td className="font-mono" style={{ padding: '16px', color: '#58a6ff', fontWeight: 'bold', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{m.numeroGasto || '-'}</td>
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap', fontWeight: m.invoice ? 'bold' : 'normal' }}>{m.invoice || '-'}</td>
                        <td className="status-text" style={{ padding: '16px', color: m.estatus === 'Facturado' ? '#3fb950' : '#f85149', fontWeight: 'bold', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{m.estatus || '-'}</td>
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{m.fecha || '-'}</td>
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{mostrarNombreUnidad(m.unidadId || m.unidad)}</td>
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{m.operador || '-'}</td>
                        
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.descripcion || m.descripcionGeneral}>
                          {m.descripcion || m.descripcionGeneral || '-'}
                        </td>
                        
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.proveedorNombre || mostrarDatoMapeado(m.proveedorId, 'empresas')}>
                          {m.proveedorNombre || mostrarDatoMapeado(m.proveedorId, 'empresas')}
                        </td>
                        
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{mostrarDatoMapeado(m.tipoServicioId, 'servicios')}</td>
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{m.autorizadoPor || '-'}</td>
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{m.condicionPago || '-'}</td>
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{mostrarDatoMapeado(m.monedaId, 'monedas')}</td>
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{formatoMoneda(m.importe)}</td>
                        
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                          {formatoMoneda(m.ivaMonto)} <span style={{ color: '#8b949e', fontSize: '0.8rem' }}>({m.ivaPorcentaje || 0}%)</span>
                        </td>
                        
                        <td style={{ padding: '16px', color: '#f85149', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{formatoMoneda(m.retIva)}</td>
                        <td style={{ padding: '16px', color: '#f85149', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{formatoMoneda(m.retIsr)}</td>
                        <td style={{ padding: '16px', color: '#3fb950', fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap' }}>{formatoMoneda(m.total)}</td>
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{m.facturaTexto || '-'}</td>
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{m.fechaFactura || '-'}</td>
                        
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.descripcionFactura}>
                          {m.descripcionFactura || '-'}
                        </td>
                        
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{m.fechaPago || '-'}</td>
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{mostrarDatoMapeado(m.formaPagoId, 'formasPago')}</td>
                        
                        <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.observaciones}>
                          {m.observaciones || '-'}
                        </td>
                        
                        <td style={{ padding: '16px', color: '#58a6ff', fontSize: '0.95rem', whiteSpace: 'nowrap', fontWeight: '500' }}>
                          {mostrarDatoMapeado(m.operacionAsignadaId, 'operaciones', 'ref')}
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* CONTROLES DE PAGINACIÓN */}
          {registrosFiltrados.length > 0 && !cargando && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ color: '#8b949e', fontSize: '0.9rem' }}>
                Mostrando {indicePrimerRegistro + 1} - {Math.min(indiceUltimoRegistro, registrosFiltrados.length)} de {registrosFiltrados.length} gastos
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

      {/* ✅ MODAL INVOICE MASIVO */}
      {modalInvoiceMasivo && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="form-card" style={{ maxWidth: '450px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px' }}>
            <div className="form-header" style={{ padding: '16px 24px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, color: '#f0f6fc', fontSize: '1.25rem' }}>Asignar Invoice Masivo</h2>
              <button onClick={() => setModalInvoiceMasivo(false)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ color: '#8b949e', fontSize: '0.9rem', marginBottom: '20px' }}>
                Estás a punto de asignar el mismo número de Invoice a <strong>{gastosSeleccionados.length}</strong> registro(s). El estatus de todos pasará automáticamente a <span style={{ color: '#3fb950', fontWeight: 'bold' }}>Facturado</span>.
              </p>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem', fontWeight: 'bold' }}>Número de Invoice a Asignar</label>
                <input 
                  type="text" 
                  placeholder="Ej: INV-99234"
                  value={nuevoInvoiceTexto} 
                  onChange={e => setNuevoInvoiceTexto(e.target.value)} 
                  autoFocus
                  style={{ width: '100%', padding: '12px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', color: '#f0f6fc', fontSize: '1.1rem' }} 
                />
              </div>
            </div>
            <div className="form-actions" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #30363d', backgroundColor: '#161b22', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
              <button onClick={() => setModalInvoiceMasivo(false)} disabled={cargandoMasivo} className="btn btn-outline" style={{ padding: '8px 16px', borderRadius: '6px' }}>Cancelar</button>
              <button onClick={aplicarInvoiceMasivo} disabled={cargandoMasivo || !nuevoInvoiceTexto.trim()} className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#238636', border: 'none' }}>
                {cargandoMasivo ? 'Aplicando...' : 'Aplicar a Seleccionados'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MttoDashboard;