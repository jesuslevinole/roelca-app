// src/features/gastos/components/mtto/FormularioMtto.tsx
import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
// ✅ CORRECCIÓN: Ajustamos la ruta para subir solo un nivel (../) 
import { guardarMttoSeguro } from '../services/mttoService';

interface FormProps {
  estado: 'abierto' | 'minimizado' | 'cerrado';
  catalogos: any;
  initialData?: any; // ✅ Recibimos initialData para saber si es edición
  onClose: () => void;
  onSave?: (data: any) => void;
}

type TabType = 'general' | 'finanzas' | 'documentos';

export const FormularioMtto = ({ estado, catalogos, initialData, onClose, onSave }: FormProps) => {
  const [cargando, setCargando] = useState(false);
  const [pestañaActiva, setPestañaActiva] = useState<TabType>('general');

  // Estados visuales de búsqueda
  const [searchUnidad, setSearchUnidad] = useState('');
  const [searchProveedor, setSearchProveedor] = useState('');
  const [searchOperacion, setSearchOperacion] = useState('');
  const [showUnidad, setShowUnidad] = useState(false);
  const [showProveedor, setShowProveedor] = useState(false);
  const [showOperacion, setShowOperacion] = useState(false);

  const [formData, setFormData] = useState({
    numeroGasto: 'Generando...', 
    invoice: '',
    estatus: 'No facturado',
    fecha: new Date().toISOString().split('T')[0],
    tipoGasto: '',
    unidadId: '',
    operador: '',
    descripcion: '',
    proveedorId: '',
    proveedorNombre: '',
    tipoServicioId: '',
    autorizadoPor: '',
    condicionPago: '',
    monedaId: '',
    importe: '',
    ivaPorcentaje: '0',
    ivaMonto: 0,
    retIva: '',
    retIsr: '',
    total: 0,
    facturaTexto: '',
    descripcionFactura: '',
    archivoPdf: null as File | null,
    fechaPago: '',
    formaPagoId: '',
    observaciones: '',
    operacionAsignadaId: ''
  });

  // ✅ 1. LÓGICA PARA VER EL CONSECUTIVO EN VIVO (Si es nuevo)
  useEffect(() => {
    const predecirConsecutivo = async () => {
      // Si estamos editando, usamos el número que ya tiene guardado
      if (initialData && initialData.numeroGasto) {
        setFormData(prev => ({ ...prev, numeroGasto: initialData.numeroGasto }));
        return;
      }

      // Si es nuevo, buscamos cuál sería el consecutivo de hoy
      const dateObj = new Date(formData.fecha || new Date());
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const yyyy = dateObj.getFullYear();
      const dateString = `${mm}${dd}${yyyy}`;

      try {
        const q = query(
          collection(db, 'gastos_mtto'), 
          orderBy('createdAt', 'desc'), 
          limit(1)
        );
        const snap = await getDocs(q);
        
        let proximoNumero = 1;
        
        // Filtramos para asegurarnos que el último registro es del mismo día
        const regexHoy = new RegExp(`MTTO-${dateString}-`);
        if (!snap.empty) {
          const ultimoRef = snap.docs[0].data().numeroGasto;
          if (ultimoRef && regexHoy.test(ultimoRef)) {
             const partes = ultimoRef.split('-');
             proximoNumero = parseInt(partes[2], 10) + 1;
          }
        }
        
        const paddedCorrelativo = String(proximoNumero).padStart(3, '0');
        setFormData(prev => ({ ...prev, numeroGasto: `MTTO-${dateString}-${paddedCorrelativo}` }));

      } catch (error) {
        console.error("Error prediciendo consecutivo", error);
        setFormData(prev => ({ ...prev, numeroGasto: `MTTO-${dateString}-XXX` }));
      }
    };

    predecirConsecutivo();
  }, [formData.fecha, initialData]);

  // ✅ 2. CARGAR DATOS AL EDITAR (Corregido para las Unidades)
  useEffect(() => {
    if (initialData && catalogos) {
      
      const safeInitialData = {
        ...initialData,
        importe: initialData.importe || '',
        ivaPorcentaje: initialData.ivaPorcentaje || '0',
        retIva: initialData.retIva || '',
        retIsr: initialData.retIsr || '',
      };

      setFormData(prev => ({ ...prev, ...safeInitialData }));

      // Buscamos nombres para rellenar los inputs visuales
      if (initialData.unidadId && catalogos.unidades) {
        const uni = catalogos.unidades.find((u:any) => u.id === initialData.unidadId);
        setSearchUnidad(uni ? (uni.numeroEconomico || uni.nombre) : '');
      }

      if (initialData.proveedorId && catalogos.empresas) {
        const prov = catalogos.empresas.find((e:any) => e.id === initialData.proveedorId);
        setSearchProveedor(prov ? prov.nombre : '');
      }

      if (initialData.operacionAsignadaId && catalogos.operaciones) {
        const op = catalogos.operaciones.find((o:any) => o.id === initialData.operacionAsignadaId);
        setSearchOperacion(op ? (op.ref || op.id) : '');
      }
    }
  }, [initialData, catalogos]);


  // Detecta cambio de Gasto (Oficina vs Operación)
  const prevGastoRef = useRef(formData.tipoGasto);
  useEffect(() => {
    if (formData.tipoGasto === 'Gastos de Oficina') {
      setFormData(prev => ({ ...prev, unidadId: 'Oficina', operador: 'Roberto' }));
      setSearchUnidad('Oficina');
    } else if (formData.tipoGasto === 'Gastos de Operación' && prevGastoRef.current === 'Gastos de Oficina') {
      setFormData(prev => ({ ...prev, unidadId: '', operador: '' }));
      setSearchUnidad('');
    }
    prevGastoRef.current = formData.tipoGasto;
  }, [formData.tipoGasto]);

  // Estatus basado en Invoice
  useEffect(() => {
    setFormData(prev => ({ ...prev, estatus: prev.invoice.trim() ? 'Facturado' : 'No facturado' }));
  }, [formData.invoice]);

  // Cálculos Financieros Reactivos
  useEffect(() => {
    const imp = Number(formData.importe) || 0;
    const ivaPct = Number(formData.ivaPorcentaje) || 0;
    const rIva = Number(formData.retIva) || 0;
    const rIsr = Number(formData.retIsr) || 0;

    const calcIva = imp * (ivaPct / 100);
    const totalCalc = imp + calcIva - rIva - rIsr;

    setFormData(prev => ({ ...prev, ivaMonto: calcIva, total: totalCalc }));
  }, [formData.importe, formData.ivaPorcentaje, formData.retIva, formData.retIsr]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, archivoPdf: e.target.files?.[0] || null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      const { archivoPdf, ...dataLista } = formData;
      await guardarMttoSeguro(dataLista);
      
      if (initialData) {
        alert("Gasto actualizado con éxito.");
        if (onSave) onSave({ id: initialData.id, ...dataLista });
      } else {
        alert("Gasto guardado con éxito.");
        if (onSave) onSave({ id: Date.now().toString(), ...dataLista });
      }
    } catch (error) {
      alert("Error al guardar el gasto");
    } finally {
      setCargando(false);
    }
  };

  // Filtros interactivos usando los catálogos proporcionados
  const proveedoresFiltro = catalogos.empresas?.filter((e:any) => e.tiposEmpresa?.includes('11894dfd') && (e.nombre || '').toLowerCase().includes(searchProveedor.toLowerCase())) || [];
  const unidadesFiltro = catalogos.unidades?.filter((u:any) => (u.numeroEconomico || u.nombre || '').toLowerCase().includes(searchUnidad.toLowerCase())) || [];
  const serviciosProveedor = catalogos.servicios?.filter((s:any) => s.proveedorId === formData.proveedorId) || [];
  const operacionesFiltro = catalogos.operaciones?.filter((o:any) => (o.ref || '').toLowerCase().includes(searchOperacion.toLowerCase())) || [];

  if (estado === 'cerrado') return null;

  // Definición de las Pestañas
  const tabs = [
    { id: 'general', label: 'Información General' },
    { id: 'finanzas', label: 'Detalles Financieros' },
    { id: 'documentos', label: 'Documentos y Cierre' }
  ];

  return (
    <div className="modal-overlay">
      <div className="form-card" style={{ maxWidth: '1200px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        {/* ENCABEZADO */}
        <div className="form-header" style={{ padding: '16px 24px', borderBottom: 'none', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ margin: 0, color: '#f0f6fc', fontSize: '1.25rem' }}>{initialData ? `Editar Gasto ${initialData.numeroGasto}` : 'Nuevo Gasto (MTTO)'}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* ✅ BARRA DE PESTAÑAS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #30363d', padding: '0 24px', overflowX: 'auto', flexShrink: 0 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPestañaActiva(tab.id as TabType)}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: pestañaActiva === tab.id ? '2px solid #D84315' : '2px solid transparent',
                color: pestañaActiva === tab.id ? '#f0f6fc' : '#8b949e',
                cursor: 'pointer',
                fontWeight: pestañaActiva === tab.id ? '600' : 'normal',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENIDO DEL FORMULARIO */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          
          {/* ✅ PESTAÑA 1: INFORMACIÓN GENERAL */}
          {pestañaActiva === 'general' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#8b949e', fontSize: '0.85rem' }}># de Gasto</label>
                <input type="text" readOnly value={formData.numeroGasto} style={{ width: '100%', padding: '10px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', color: '#8b949e' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}># de Invoice</label>
                <input type="text" name="invoice" value={formData.invoice} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#8b949e', fontSize: '0.85rem' }}>Estatus</label>
                <input type="text" readOnly value={formData.estatus} style={{ width: '100%', padding: '10px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', color: formData.estatus === 'Facturado' ? '#3fb950' : '#f85149', fontWeight: 'bold' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#D84315', fontSize: '0.85rem', fontWeight: 'bold' }}>Fecha</label>
                <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} required style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Tipo de Gasto</label>
                <select name="tipoGasto" value={formData.tipoGasto} onChange={handleChange} required style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }}>
                  <option value="">-- Seleccionar --</option>
                  <option value="Gastos de Oficina">Gastos de Oficina</option>
                  <option value="Gastos de Operación">Gastos de Operación</option>
                </select>
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Unidad</label>
                <input type="text" value={searchUnidad} onChange={(e) => { setSearchUnidad(e.target.value); setShowUnidad(true); }} onFocus={() => setShowUnidad(true)} readOnly={formData.tipoGasto === 'Gastos de Oficina'} style={{ width: '100%', padding: '10px', backgroundColor: formData.tipoGasto === 'Gastos de Oficina' ? '#161b22' : '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} placeholder={formData.tipoGasto === 'Gastos de Oficina' ? '' : 'Buscar unidad...'} />
                {showUnidad && formData.tipoGasto !== 'Gastos de Oficina' && searchUnidad && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }}>
                    {unidadesFiltro.map((u:any) => (
                      <div key={u.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} onClick={() => { setFormData(prev => ({...prev, unidadId: u.id})); setSearchUnidad(u.numeroEconomico || u.nombre); setShowUnidad(false); }}>{u.numeroEconomico || u.nombre}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Operador</label>
                <input type="text" name="operador" value={formData.operador} onChange={handleChange} readOnly={formData.tipoGasto === 'Gastos de Oficina'} style={{ width: '100%', padding: '10px', backgroundColor: formData.tipoGasto === 'Gastos de Oficina' ? '#161b22' : '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Descripción General</label>
                <input type="text" name="descripcion" value={formData.descripcion} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
              </div>
            </div>
          )}

          {/* ✅ PESTAÑA 2: DETALLES FINANCIEROS */}
          {pestañaActiva === 'finanzas' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
              <div className="form-group" style={{ position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Proveedor</label>
                <input type="text" value={searchProveedor} onChange={(e) => { setSearchProveedor(e.target.value); setShowProveedor(true); }} onFocus={() => setShowProveedor(true)} placeholder="Buscar proveedor..." style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
                {showProveedor && searchProveedor && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }}>
                    {proveedoresFiltro.map((p:any) => (
                      <div key={p.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} onClick={() => { setFormData(prev => ({...prev, proveedorId: p.id, proveedorNombre: p.nombre, tipoServicioId: ''})); setSearchProveedor(p.nombre); setShowProveedor(false); }}>{p.nombre}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Tipo de Servicio</label>
                <select name="tipoServicioId" value={formData.tipoServicioId} onChange={handleChange} disabled={!formData.proveedorId} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }}>
                  <option value="">-- Seleccionar --</option>
                  {serviciosProveedor.map((s:any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Condición de Pago</label>
                <select name="condicionPago" value={formData.condicionPago} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }}>
                  <option value="">-- Seleccionar --</option>
                  <option value="Crédito">Crédito</option>
                  <option value="Contado">Contado</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Moneda</label>
                <select name="monedaId" value={formData.monedaId} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }}>
                  <option value="">-- Seleccionar --</option>
                  {catalogos.monedas?.map((m:any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}><hr style={{ borderColor: '#30363d' }} /></div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#58a6ff', fontSize: '0.85rem', fontWeight: 'bold' }}>Importe (Monto Base)</label>
                <input type="number" step="0.01" name="importe" value={formData.importe} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #58a6ff', borderRadius: '6px', color: '#58a6ff', fontWeight: 'bold' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>IVA (%)</label>
                <select name="ivaPorcentaje" value={formData.ivaPorcentaje} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }}>
                  <option value="0">0%</option>
                  <option value="8">8%</option>
                  <option value="16">16%</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#8b949e', fontSize: '0.85rem' }}>IVA ($) Calculado (+)</label>
                <input type="text" readOnly value={`$ ${formData.ivaMonto.toFixed(2)}`} style={{ width: '100%', padding: '10px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', color: '#8b949e' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>RET IVA ($) (-)</label>
                <input type="number" step="0.01" name="retIva" value={formData.retIva} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#f85149' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>RET ISR ($) (-)</label>
                <input type="number" step="0.01" name="retIsr" value={formData.retIsr} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#f85149' }} />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2', backgroundColor: '#161b22', padding: '16px', borderRadius: '8px', border: '1px solid #3fb950' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#8b949e', fontSize: '0.85rem', textTransform: 'uppercase' }}>TOTAL FINAL</label>
                <div style={{ color: '#3fb950', fontSize: '1.8rem', fontWeight: 'bold' }}>$ {formData.total.toFixed(2)}</div>
              </div>
            </div>
          )}

          {/* ✅ PESTAÑA 3: DOCUMENTOS Y CIERRE */}
          {pestañaActiva === 'documentos' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Factura (Texto)</label>
                <input type="text" name="facturaTexto" value={formData.facturaTexto} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Descripción Factura</label>
                <input type="text" name="descripcionFactura" value={formData.descripcionFactura} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Archivo (PDF)</label>
                <input type="file" accept=".pdf" onChange={handleFileChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Fecha de Pago</label>
                <input type="date" name="fechaPago" value={formData.fechaPago} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Forma de Pago</label>
                <select name="formaPagoId" value={formData.formaPagoId} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }}>
                  <option value="">-- Seleccionar --</option>
                  {catalogos.formasPago?.map((f:any) => <option key={f.id} value={f.id}>{f.nombre || f.clave}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Autorizado Por</label>
                <input type="text" name="autorizadoPor" value={formData.autorizadoPor} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
              </div>
              <div className="form-group" style={{ position: 'relative', gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Asignar a Operación</label>
                <input type="text" value={searchOperacion} onChange={(e) => { setSearchOperacion(e.target.value); setShowOperacion(true); }} onFocus={() => setShowOperacion(true)} placeholder="Buscar # Referencia..." style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9' }} />
                {showOperacion && searchOperacion && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }}>
                    {operacionesFiltro.map((o:any) => (
                      <div key={o.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} onClick={() => { setFormData(prev => ({...prev, operacionAsignadaId: o.id})); setSearchOperacion(o.ref || o.id); setShowOperacion(false); }}>{o.ref || o.id}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9', fontSize: '0.85rem' }}>Observaciones</label>
                <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', minHeight: '80px', resize: 'vertical' }} />
              </div>
            </div>
          )}
          
        </form>

        {/* PIE DEL MODAL (BOTONES FIJOS) */}
        <div className="form-actions" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#161b22', borderTop: '1px solid #30363d', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', flexShrink: 0 }}>
          <button type="button" onClick={onClose} disabled={cargando} style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: 'transparent', border: '1px solid #8b949e', color: '#c9d1d9', cursor: 'pointer', transition: 'all 0.2s' }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={cargando} style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: '#D84315', border: 'none', color: '#fff', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>{cargando ? 'Guardando...' : (initialData ? 'Actualizar Gasto' : 'Guardar Gasto')}</button>
        </div>

      </div>
    </div>
  );
};