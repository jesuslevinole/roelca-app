// src/features/operaciones/components/FormularioOperacion.tsx
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { guardarOperacionSegura } from '../services/operacionesService';
import { calcularStatusDinamico } from '../config/statusRules';

interface FormProps {
  estado: 'abierto' | 'minimizado';
  initialData?: any;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
  catalogosCacheados: any;
  onSave?: (opNueva: any) => void; 
}

type TabType = 'general' | 'pedimento' | 'manifiesto' | 'unidad' | 'cobrar';

const ID_USD = '7dca62b3';
const ID_MXN = 'f95d8894';

export const FormularioOperacion = ({ estado, initialData, onClose, onMinimize, onRestore, catalogosCacheados, onSave }: FormProps) => {
  const [pestañaActiva, setPestañaActiva] = useState<TabType>('general');
  const [cargando, setCargando] = useState(false);
  const [resolviendoConvenio, setResolviendoConvenio] = useState(false);

  const {
    empresas,
    tiposOperacion,
    embalajes,
    remolques,
    tarifas,
    conveniosProv,
    catalogoTC,
    catalogoConvClientes,
    catalogoConvDetalles,
    catalogoConvProvDetalles
  } = catalogosCacheados || {};

  const [listaConveniosCliente, setListaConveniosCliente] = useState<any[]>([]);
  const [listaConveniosProveedor, setListaConveniosProveedor] = useState<any[]>([]);
  
  const [tipoCambioDia, setTipoCambioDia] = useState<number | null>(null);
  const [buscandoTC, setBuscandoTC] = useState(false);

  const [searchOrigen, setSearchOrigen] = useState('');
  const [showDropdownOrigen, setShowDropdownOrigen] = useState(false);
  const [searchDestino, setSearchDestino] = useState('');
  const [showDropdownDestino, setShowDropdownDestino] = useState(false);
  const [searchClientePaga, setSearchClientePaga] = useState('');
  const [showDropdownClientePaga, setShowDropdownClientePaga] = useState(false);
  const [searchRemolque, setSearchRemolque] = useState('');
  const [showDropdownRemolque, setShowDropdownRemolque] = useState(false);
  const [searchClienteMercancia, setSearchClienteMercancia] = useState('');
  const [showDropdownClienteMercancia, setShowDropdownClienteMercancia] = useState(false);
  const [searchProvServicios, setSearchProvServicios] = useState('');
  const [showDropdownProvServicios, setShowDropdownProvServicios] = useState(false);
  const [searchProvTransporte, setSearchProvTransporte] = useState('');
  const [showDropdownProvTransporte, setShowDropdownProvTransporte] = useState(false);

  const [formData, setFormData] = useState({
    // Configuración Flujo
    tipoServicio: '', trafico: '', carga: '',
    
    // Tab 1: General
    tipoOperacionId: '',
    fechaServicio: new Date().toISOString().split('T')[0],
    clientePaga: '', convenio: '', numeroRemolque: '', refCliente: '',
    origen: '', destino: '', observacionesEjecutivo: '',
    
    // Tab 2: Pedimento
    clienteMercancia: '', descripcionMercancia: '', cantidad: '', embalaje: '',
    pesoKg: '', numDoda: '', fechaEmisionDoda: '',
    pdfCartaPorte: null as File | null, pdfDoda: null as File | null,
    
    // Tab 3: Manifiestos
    cantEntrys: 0, numManifiesto: '', provServicios: '',
    pdfManifiesto: null as File | null, pdfsEntrys: [] as (File | null)[],
    
    // Tab 4: Unidad y Proveedor
    proveedorUnidad: '', facturadoEnUnidad: '', convenioProveedor: '', monedaConvenioProv: '',
    totalAPagarProv: 0, dolaresProv: 0, pesosProv: 0, conversionProv: 0,
    unidad: '', operador: '',

    // Tab 5: Por Cobrar (Cliente)
    facturadoEnCobrar: '', monedaConvenioCliente: '', montoConvenioCliente: 0,
    cargosAdicionales: 0, subtotalCliente: 0,
    dolaresCliente: 0, pesosCliente: 0, conversionCliente: 0,
    utilidadEstimada: 0
  });

  useEffect(() => {
    if (!formData.fechaServicio || !catalogoTC || catalogoTC.length === 0) return;
    setBuscandoTC(true);

    const [y, m, d] = formData.fechaServicio.split('-');
    const fechaLatina = `${d}/${m}/${y}`; 
    const fechaUS = `${m}/${d}/${y}`; 
    const fechaISO = `${y}-${m}-${d}`; 

    let tcEncontrado = null;

    for (const tc of catalogoTC) {
      const valoresFila = Object.values(tc).map((v: any) => String(v).trim());

      if (valoresFila.includes(fechaLatina) || valoresFila.includes(fechaUS) || valoresFila.includes(fechaISO)) {
        const keys = Object.keys(tc);
        const valKey = keys.find((k: any) => String(k).toLowerCase().includes('dof') || String(k).toLowerCase().includes('valor') || String(k).toLowerCase() === 'tc' || String(k).toLowerCase().includes('cambio'));
        if (valKey) tcEncontrado = Number(String(tc[valKey]).replace(/[^0-9.-]+/g, ""));
        else {
          const posiblesRates = valoresFila.map((v: any) => parseFloat(v.replace(/[^0-9.-]+/g, ""))).filter((n: any) => !isNaN(n) && n > 15 && n < 25);
          if (posiblesRates.length > 0) tcEncontrado = posiblesRates[0];
        }
        break;
      }
    }

    setTipoCambioDia(tcEncontrado);
    setBuscandoTC(false);
  }, [formData.fechaServicio, catalogoTC]);

  useEffect(() => {
    let clientId = formData.clientePaga;
    if (!clientId && searchClientePaga && empresas) {
       const emp = empresas.find((e:any) => e.nombre?.toLowerCase().trim() === searchClientePaga.toLowerCase().trim());
       if (emp) clientId = emp.id;
    }
    if (!clientId || !catalogoConvClientes || catalogoConvClientes.length === 0) return setListaConveniosCliente([]);

    const maestros = catalogoConvClientes.filter((c:any) => {
      const refVal = String(c.clienteId || c.cliente || c.Cliente || c.CLIENTE || c.id_cliente || c.empresa || '').trim();
      return refVal === clientId;
    });

    if (maestros.length > 0) {
      const mIds = maestros.map((m:any) => String(m.id).trim());
      const mNames = maestros.map((m:any) => String(m['# de Convenio'] || m.numeroConvenio || m.nombre || m.id).trim());
      
      const detalles = catalogoConvDetalles?.filter((d:any) => {
        const convRef = String(d.convenioId || d.convenio || d.id_convenio || d.Convenio || d.CONVENIO || '').trim();
        return mIds.includes(convRef) || mNames.includes(convRef);
      }) || [];

      const mapped = detalles.map((d:any) => {
        const tarifaId = d.tipoConvenioId || d.tipo_convenio_id || d.tipoConvenio || d.tipo_convenio || d['TIPO DE CONVENIO'];
        const tObj = tarifas?.find((t:any) => String(t.id).trim() === String(tarifaId).trim());
        const maestroAsociado = maestros.find((m:any) => m.id === d.convenioId || m.id === d.convenio || m.numeroConvenio === d.convenio || m['# de Convenio'] === d.convenio);

        return {
          id: d.id, 
          tarifaBaseId: tarifaId,
          descripcion: tObj?.descripcion || tObj?.nombre || (tarifaId ? `Desconocido (${tarifaId})` : 'Sin Asignar'),
          monedaMaestro: d.moneda || maestroAsociado?.moneda || ID_USD,
          tarifaMonto: Number(d.tarifa || d.monto || d.precio || 0),
          ...d
        };
      });
      setListaConveniosCliente(mapped);
    } else setListaConveniosCliente([]);
  }, [formData.clientePaga, searchClientePaga, catalogoConvClientes, catalogoConvDetalles, tarifas, empresas]);

  useEffect(() => {
    let provId = formData.proveedorUnidad;
    if (!provId && searchProvTransporte && empresas) {
       const prov = empresas.find((e:any) => e.nombre?.toLowerCase().trim() === searchProvTransporte.toLowerCase().trim());
       if (prov) provId = prov.id;
    }
    if (!provId || !conveniosProv || conveniosProv.length === 0) return setListaConveniosProveedor([]);

    const maestros = conveniosProv.filter((c:any) => String(c.proveedorId || c.proveedor || c.id_proveedor || c.empresa || '').trim() === provId);
    if (maestros.length > 0) {
      const mIds = maestros.map((m:any) => String(m.id).trim());
      const mNames = maestros.map((m:any) => String(m['# de Convenio'] || m.numeroConvenio || m.nombre || m.id).trim());
      const detalles = catalogoConvProvDetalles?.filter((d:any) => {
        const convRef = String(d.convenioId || d.convenio || d.id_convenio || '').trim();
        return mIds.includes(convRef) || mNames.includes(convRef);
      }) || [];

      const mapped = detalles.map((d:any) => {
        const tarifaId = d.tipoConvenioId || d.tipo_convenio || d.tarifaId || d['TIPO DE CONVENIO'];
        const tObj = tarifas?.find((t:any) => String(t.id).trim() === String(tarifaId).trim());
        return {
          id: d.id, tarifaBaseId: tarifaId,
          descripcion: tObj?.descripcion || tObj?.nombre || d.descripcion || (tarifaId ? `Detalle (${tarifaId})` : 'Sin Asignar'),
          monedaBase: d.moneda || maestros[0]?.moneda || ID_USD,
          ...d
        };
      });
      setListaConveniosProveedor(mapped);
    } else setListaConveniosProveedor([]);
  }, [formData.proveedorUnidad, searchProvTransporte, conveniosProv, catalogoConvProvDetalles, tarifas, empresas]);

  useEffect(() => {
    const resolverFlujo = async () => {
      if (!formData.convenio) return;
      setResolviendoConvenio(true);
      try {
        const detalleElegido = listaConveniosCliente.find((c:any) => c.id === formData.convenio);
        if (!detalleElegido) return;

        setFormData(prev => ({ 
            ...prev, 
            monedaConvenioCliente: detalleElegido.monedaMaestro, 
            montoConvenioCliente: detalleElegido.tarifaMonto 
        }));

        const tarifaObj = tarifas?.find((t:any) => t.id === detalleElegido.tarifaBaseId);
        if (tarifaObj) {
          const tipoRef = doc(db, 'catalogo_tipos_tarifarios', String(tarifaObj.tipo_operacion));
          const tipoSnap = await getDoc(tipoRef);
          if (tipoSnap.exists()) {
            setFormData(prev => ({
              ...prev,
              tipoServicio: tipoSnap.data().descripcion || 'N/A',
              trafico: tipoSnap.data().movimiento || 'N/A',
              carga: tarifaObj.estado_carga || 'N/A'
            }));
          }
        }
      } catch (error) { console.error("Error", error); } finally { setResolviendoConvenio(false); }
    };
    resolverFlujo();
  }, [formData.convenio, listaConveniosCliente, tarifas]);

  useEffect(() => {
    const fact = formData.facturadoEnUnidad; const mon = formData.monedaConvenioProv; const tot = Number(formData.totalAPagarProv) || 0; const tc = tipoCambioDia || 0;
    let dol = 0; let pes = 0; let conv = 0;
    if (tc > 0) {
      if (fact === ID_USD && mon === ID_USD) dol = tot;
      if (fact === ID_MXN && mon === ID_MXN) pes = tot; else if (fact === ID_MXN && mon === ID_USD) pes = tot * tc;
      if (fact === ID_MXN && mon === ID_MXN) conv = tot; else if (fact === ID_MXN && mon === ID_USD) conv = tot * tc; else if (fact === ID_USD && mon === ID_USD) conv = tot * tc;
    }
    setFormData(prev => ({ ...prev, dolaresProv: dol, pesosProv: pes, conversionProv: conv }));
  }, [formData.facturadoEnUnidad, formData.monedaConvenioProv, formData.totalAPagarProv, tipoCambioDia]);

  useEffect(() => {
    const fact = formData.facturadoEnCobrar; 
    const mon = formData.monedaConvenioCliente; 
    const tc = tipoCambioDia || 0;
    const subtotal = Number(formData.montoConvenioCliente) + Number(formData.cargosAdicionales || 0);
    
    let dol = 0; let pes = 0; let conv = 0;
    if (tc > 0) {
      if (fact === ID_USD && mon === ID_USD) dol = subtotal;
      if (fact === ID_MXN && mon === ID_MXN) pes = subtotal; else if (fact === ID_MXN && mon === ID_USD) pes = subtotal * tc;
      if (fact === ID_MXN && mon === ID_MXN) conv = subtotal; else if (fact === ID_MXN && mon === ID_USD) conv = subtotal * tc; else if (fact === ID_USD && mon === ID_USD) conv = subtotal * tc;
    }
    
    const utilidad = conv - formData.conversionProv; 

    setFormData(prev => ({ 
      ...prev, 
      subtotalCliente: subtotal, dolaresCliente: dol, pesosCliente: pes, conversionCliente: conv, utilidadEstimada: utilidad 
    }));
  }, [formData.facturadoEnCobrar, formData.monedaConvenioCliente, formData.montoConvenioCliente, formData.cargosAdicionales, tipoCambioDia, formData.conversionProv]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, index?: number) => {
    const file = e.target.files?.[0] || null;
    if (index !== undefined) {
      const nuevosPdfs = [...formData.pdfsEntrys]; nuevosPdfs[index] = file;
      setFormData(prev => ({ ...prev, pdfsEntrys: nuevosPdfs }));
    } else {
      setFormData(prev => ({ ...prev, [field]: file }));
    }
  };

  const filClientesPaga = empresas?.filter((e:any) => e.tiposEmpresa?.includes('7eec9cbb')) || [];
  const filClientesMercancia = empresas?.filter((e:any) => e.tiposEmpresa?.includes('51246232')) || [];
  const filProveedoresServicios = empresas?.filter((e:any) => e.tiposEmpresa?.includes('11894dfd')) || [];
  const filOrigenesDestinos = empresas?.filter((e:any) => e.tiposEmpresa?.includes('6e7af5ab')) || [];
  const filProveedoresTransporte = empresas?.filter((e:any) => e.tiposEmpresa?.includes('ca21ab07')) || []; 

  const resultadosOrigen = filOrigenesDestinos.filter((e:any) => e.nombre?.toLowerCase().includes(searchOrigen.toLowerCase()) || e.direccion?.toLowerCase().includes(searchOrigen.toLowerCase()));
  const resultadosDestino = filOrigenesDestinos.filter((e:any) => e.nombre?.toLowerCase().includes(searchDestino.toLowerCase()) || e.direccion?.toLowerCase().includes(searchDestino.toLowerCase()));
  const resultadosClientePaga = filClientesPaga.filter((e:any) => e.nombre?.toLowerCase().includes(searchClientePaga.toLowerCase()));
  const resultadosRemolque = remolques?.filter((e:any) => e.nombre?.toLowerCase().includes(searchRemolque.toLowerCase())) || [];
  const resultadosClienteMercancia = filClientesMercancia.filter((e:any) => e.nombre?.toLowerCase().includes(searchClienteMercancia.toLowerCase()));
  const resultadosProvServicios = filProveedoresServicios.filter((e:any) => e.nombre?.toLowerCase().includes(searchProvServicios.toLowerCase()));
  const resultadosProvTransporte = filProveedoresTransporte.filter((e:any) => e.nombre?.toLowerCase().includes(searchProvTransporte.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoCambioDia) return alert(`⛔ Imposible Guardar: No existe un Tipo de Cambio registrado para la fecha seleccionada.`);
    setCargando(true);
    try {
      const configId = `${formData.tipoServicio}_${formData.trafico}_${formData.carga}`;
      const statusCalculado = await calcularStatusDinamico(configId, formData, initialData?.status);
      const detalleDoc = listaConveniosCliente.find((c:any) => c.id === formData.convenio);
      const { pdfCartaPorte, pdfDoda, pdfManifiesto, pdfsEntrys, ...datosLimpios } = formData;
      const operacionData: any = { ...datosLimpios, convenioNombre: detalleDoc?.descripcion || 'Sin descripción', status: statusCalculado, tienePdfDoda: !!pdfDoda, cantPdfsEntrys: pdfsEntrys.filter(Boolean).length };
      
      if (initialData) {
        alert(`Operación actualizada correctamente.`);
        if (onSave) onSave({ id: initialData.id, ...operacionData });
      } else {
        await guardarOperacionSegura(operacionData); 
        alert('Operación guardada exitosamente'); 
        if (onSave) onSave({ id: Date.now().toString(), ...operacionData });
      }
      onClose();
    } catch (error) { alert('Error al guardar la operación.'); } finally { setCargando(false); }
  };

  if (!catalogosCacheados || !catalogosCacheados.empresas) return <div className={`modal-overlay`}><div className="form-card" style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>Cargando catálogos de Roelca...</div></div>;

  return (
    <div className={`modal-overlay ${estado === 'minimizado' ? 'minimized' : ''}`}>
      <div className="form-card" style={{ maxWidth: '1000px' }}>
        <div className="form-header">
          <h2>{estado === 'minimizado' ? 'Operación en curso...' : (initialData ? `Editar Operación ${initialData.ref}` : 'Nueva Operación')}</h2>
          <div className="header-actions">
            {estado === 'abierto' ? <button type="button" onClick={onMinimize} className="btn-window">🗕</button> : <button type="button" onClick={onRestore} className="btn-window restore">🗖</button>}
            <button type="button" onClick={onClose} className="btn-window close">✕</button>
          </div>
        </div>

        <div style={{ display: estado === 'minimizado' ? 'none' : 'block' }}>

          <div className="tabs-container" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <button type="button" className={`tab-button ${pestañaActiva === 'general' ? 'active' : ''}`} onClick={() => setPestañaActiva('general')}>Información General</button>
            <button type="button" className={`tab-button ${pestañaActiva === 'pedimento' ? 'active' : ''}`} onClick={() => setPestañaActiva('pedimento')}>Pedimento y CT</button>
            <button type="button" className={`tab-button ${pestañaActiva === 'manifiesto' ? 'active' : ''}`} onClick={() => setPestañaActiva('manifiesto')}>Entry's y Manifiestos</button>
            <button type="button" className={`tab-button ${pestañaActiva === 'unidad' ? 'active' : ''}`} onClick={() => setPestañaActiva('unidad')}>Unidad y Operador</button>
            <button type="button" className={`tab-button ${pestañaActiva === 'cobrar' ? 'active' : ''}`} onClick={() => setPestañaActiva('cobrar')}>Por Cobrar</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="tab-content" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '12px' }}>

              {pestañaActiva === 'general' && (
                <div className="form-grid">
                  <div className="form-group"><label className="form-label orange">Tipo de Operación</label><select name="tipoOperacionId" className="form-control" value={formData.tipoOperacionId} onChange={handleChange} required><option value="">-- Seleccionar --</option>{tiposOperacion?.map((op:any) => <option key={op.id} value={op.id}>{op.tipo_operacion}</option>)}</select></div>
                  <div className="form-group"><label className="form-label orange">Fecha de Servicio</label><input type="date" name="fechaServicio" className="form-control" value={formData.fechaServicio} onChange={handleChange} required />{buscandoTC ? <small style={{ color: '#58a6ff' }}>Buscando TC...</small> : <small style={{ color: tipoCambioDia ? '#3fb950' : '#f85149', fontWeight: 'bold' }}>TC Oficial: {tipoCambioDia ? `$${tipoCambioDia}` : 'Sin Registro'}</small>}</div>
                  <div className="form-group" style={{ position: 'relative' }}><label className="form-label">Cliente (Paga)</label><input type="text" className="form-control" placeholder="Escriba para buscar cliente..." required={!formData.clientePaga && !searchClientePaga} value={searchClientePaga} onChange={e => { setSearchClientePaga(e.target.value); setShowDropdownClientePaga(true); if (formData.clientePaga) setFormData(prev => ({ ...prev, clientePaga: '', convenio: '' })); }} onFocus={() => setShowDropdownClientePaga(true)} />{showDropdownClientePaga && searchClientePaga && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>{resultadosClientePaga.length === 0 ? <div style={{ padding: '8px', color: '#8b949e' }}>Sin resultados</div> : resultadosClientePaga.map((c:any) => (<div key={c.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} onClick={() => { setFormData(prev => ({ ...prev, clientePaga: c.id, convenio: '' })); setSearchClientePaga(c.nombre); setShowDropdownClientePaga(false); }}><div style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{c.nombre}</div></div>))}</div>)}</div>
                  <div className="form-group"><label className="form-label">Convenio (Tarifa)</label><select name="convenio" className="form-control" value={formData.convenio} onChange={handleChange} required disabled={listaConveniosCliente.length === 0}><option value="">-- Seleccione un Convenio --</option>{listaConveniosCliente.map((c:any) => (<option key={c.id} value={c.id}>{c.descripcion}</option>))}</select>{listaConveniosCliente.length === 0 && searchClientePaga && <small style={{ color: '#8b949e' }}>Este cliente no tiene convenios asignados</small>}</div>
                  <div className="form-group" style={{ position: 'relative' }}><label className="form-label"># de Remolque</label><input type="text" className="form-control" placeholder="Buscar remolque..." value={searchRemolque} onChange={e => { setSearchRemolque(e.target.value); setShowDropdownRemolque(true); if (formData.numeroRemolque) setFormData(prev => ({ ...prev, numeroRemolque: '' })); }} onFocus={() => setShowDropdownRemolque(true)} />{showDropdownRemolque && searchRemolque && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>{resultadosRemolque.length === 0 ? <div style={{ padding: '8px', color: '#8b949e' }}>Sin resultados</div> : resultadosRemolque.map((r:any) => (<div key={r.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} onClick={() => { setFormData(prev => ({ ...prev, numeroRemolque: r.id })); setSearchRemolque(r.nombre); setShowDropdownRemolque(false); }}><div style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{r.nombre}</div></div>))}</div>)}</div>
                  <div className="form-group"><label className="form-label">Ref Cliente</label><input type="text" name="refCliente" className="form-control" value={formData.refCliente} onChange={handleChange} /></div>
                  <div className="form-group" style={{ position: 'relative' }}><label className="form-label orange">Origen</label><input type="text" className="form-control" placeholder="Buscar origen..." value={searchOrigen} onChange={e => { setSearchOrigen(e.target.value); setShowDropdownOrigen(true); }} onFocus={() => setShowDropdownOrigen(true)} />{showDropdownOrigen && searchOrigen && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>{resultadosOrigen.map((o:any) => (<div key={o.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} onClick={() => { setFormData(prev => ({ ...prev, origen: o.id })); setSearchOrigen(o.nombre); setShowDropdownOrigen(false); }}><div style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{o.nombre}</div><div style={{ fontSize: '0.8rem', color: '#8b949e' }}>{o.direccion}</div></div>))}</div>)}</div>
                  <div className="form-group" style={{ position: 'relative' }}><label className="form-label orange">Destino</label><input type="text" className="form-control" placeholder="Buscar destino..." value={searchDestino} onChange={e => { setSearchDestino(e.target.value); setShowDropdownDestino(true); }} onFocus={() => setShowDropdownDestino(true)} />{showDropdownDestino && searchDestino && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>{resultadosDestino.map((d:any) => (<div key={d.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} onClick={() => { setFormData(prev => ({ ...prev, destino: d.id })); setSearchDestino(d.nombre); setShowDropdownDestino(false); }}><div style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{d.nombre}</div><div style={{ fontSize: '0.8rem', color: '#8b949e' }}>{d.direccion}</div></div>))}</div>)}</div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Observaciones Ejecutivo</label><input type="text" name="observacionesEjecutivo" className="form-control" value={formData.observacionesEjecutivo} onChange={handleChange} /></div>
                </div>
              )}

              {pestañaActiva === 'pedimento' && (
                <div className="form-grid">
                  <div className="form-group" style={{ position: 'relative', gridColumn: 'span 2' }}><label className="form-label">Cliente (Mercancía)</label><input type="text" className="form-control" placeholder="Escriba para buscar cliente mercancía..." value={searchClienteMercancia} onChange={e => { setSearchClienteMercancia(e.target.value); setShowDropdownClienteMercancia(true); if (formData.clienteMercancia) setFormData(prev => ({ ...prev, clienteMercancia: '' })); }} onFocus={() => setShowDropdownClienteMercancia(true)} />{showDropdownClienteMercancia && searchClienteMercancia && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>{resultadosClienteMercancia.length === 0 ? <div style={{ padding: '8px', color: '#8b949e' }}>Sin resultados</div> : resultadosClienteMercancia.map((c:any) => (<div key={c.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} onClick={() => { setFormData(prev => ({ ...prev, clienteMercancia: c.id })); setSearchClienteMercancia(c.nombre); setShowDropdownClienteMercancia(false); }}><div style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{c.nombre}</div></div>))}</div>)}</div>
                  <div className="form-group"><label className="form-label">Descripción de la Mercancía</label><input type="text" name="descripcionMercancia" className="form-control" value={formData.descripcionMercancia} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">Cantidad (Enteros)</label><input type="number" step="1" name="cantidad" className="form-control" value={formData.cantidad} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">Embalaje</label><select name="embalaje" className="form-control" value={formData.embalaje} onChange={handleChange}><option value="">-- Seleccionar --</option>{embalajes?.map((e:any) => <option key={e.id} value={e.id}>{e.clave}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Peso (Kg) Decimales</label><input type="number" step="0.01" name="pesoKg" className="form-control" value={formData.pesoKg} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">PDF - Carta Porte</label><input type="file" accept=".pdf" className="form-control" onChange={(e) => handleFileChange(e, 'pdfCartaPorte')} /></div>
                  <div className="form-group"><label className="form-label"># DODA</label><input type="text" name="numDoda" className="form-control" value={formData.numDoda} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">Fecha de Emisión</label><input type="date" name="fechaEmisionDoda" className="form-control" value={formData.fechaEmisionDoda} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">PDF - DODA</label><input type="file" accept=".pdf" className="form-control" onChange={(e) => handleFileChange(e, 'pdfDoda')} /></div>
                </div>
              )}

              {pestañaActiva === 'manifiesto' && (
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Cantidad de Entry's (Max 10)</label><input type="number" max="10" min="0" name="cantEntrys" className="form-control" value={formData.cantEntrys} onChange={(e) => { const val = Math.min(10, Math.max(0, parseInt(e.target.value) || 0)); setFormData(prev => ({ ...prev, cantEntrys: val, pdfsEntrys: new Array(val).fill(null) })); }} /></div>
                  {Array.from({ length: formData.cantEntrys }).map((_, i) => (<div className="form-group" key={i}><label className="form-label">PDF Entry #{i + 1}</label><input type="file" accept=".pdf" className="form-control" onChange={(e) => handleFileChange(e, '', i)} /></div>))}
                  <div className="form-group" style={{ gridColumn: 'span 3' }}><hr style={{ borderColor: '#30363d' }} /></div>
                  <div className="form-group"><label className="form-label"># Manifiesto</label><input type="text" name="numManifiesto" className="form-control" value={formData.numManifiesto} onChange={handleChange} /></div>
                  <div className="form-group" style={{ position: 'relative' }}><label className="form-label">Proveedor de Servicios</label><input type="text" className="form-control" placeholder="Escriba para buscar proveedor..." value={searchProvServicios} onChange={e => { setSearchProvServicios(e.target.value); setShowDropdownProvServicios(true); if (formData.provServicios) setFormData(prev => ({ ...prev, provServicios: '' })); }} onFocus={() => setShowDropdownProvServicios(true)} />{showDropdownProvServicios && searchProvServicios && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>{resultadosProvServicios.length === 0 ? <div style={{ padding: '8px', color: '#8b949e' }}>Sin resultados</div> : resultadosProvServicios.map((c:any) => (<div key={c.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} onClick={() => { setFormData(prev => ({ ...prev, provServicios: c.id })); setSearchProvServicios(c.nombre); setShowDropdownProvServicios(false); }}><div style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{c.nombre}</div></div>))}</div>)}</div>
                  <div className="form-group"><label className="form-label">PDF Manifiesto</label><input type="file" accept=".pdf" className="form-control" onChange={(e) => handleFileChange(e, 'pdfManifiesto')} /></div>
                </div>
              )}

              {pestañaActiva === 'unidad' && (
                <div className="form-grid">
                  <div className="form-group" style={{ position: 'relative', gridColumn: 'span 3' }}><label className="form-label">Proveedor de Transporte</label><input type="text" className="form-control" placeholder="Escriba para buscar proveedor de transporte..." value={searchProvTransporte} onChange={e => { setSearchProvTransporte(e.target.value); setShowDropdownProvTransporte(true); if (formData.proveedorUnidad) setFormData(prev => ({ ...prev, proveedorUnidad: '' })); }} onFocus={() => setShowDropdownProvTransporte(true)} />{showDropdownProvTransporte && searchProvTransporte && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>{resultadosProvTransporte.length === 0 ? <div style={{ padding: '8px', color: '#8b949e' }}>Sin resultados</div> : resultadosProvTransporte.map((p:any) => (<div key={p.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} onClick={() => { setFormData(prev => ({ ...prev, proveedorUnidad: p.id })); setSearchProvTransporte(p.nombre); setShowDropdownProvTransporte(false); }}><div style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{p.nombre}</div></div>))}</div>)}</div>
                  <div className="form-group"><label className="form-label">Facturado En:</label><select name="facturadoEnUnidad" className="form-control" value={formData.facturadoEnUnidad} onChange={handleChange}><option value="">-- Seleccionar --</option><option value={ID_USD}>Dólares (USD)</option><option value={ID_MXN}>Pesos (MXN)</option></select></div>
                  <div className="form-group"><label className="form-label">Convenio Proveedor</label><select name="convenioProveedor" className="form-control" value={formData.convenioProveedor} onChange={(e) => { const conv = listaConveniosProveedor.find((c:any) => c.id === e.target.value); setFormData(prev => ({ ...prev, convenioProveedor: e.target.value, monedaConvenioProv: conv?.monedaBase || ID_USD })); }} disabled={listaConveniosProveedor.length === 0}><option value="">-- Seleccionar --</option>{listaConveniosProveedor.map((c:any) => <option key={c.id} value={c.id}>{c.descripcion}</option>)}</select>{listaConveniosProveedor.length === 0 && searchProvTransporte && <small style={{ color: '#8b949e' }}>Este proveedor no tiene convenios</small>}</div>
                  <div className="form-group"><label className="form-label">Moneda del Convenio (Base)</label><input type="text" className="form-control" value={formData.monedaConvenioProv === ID_MXN ? 'Pesos (MXN)' : formData.monedaConvenioProv === ID_USD ? 'Dólares (USD)' : ''} readOnly style={{ backgroundColor: '#0d1117' }} /></div>
                  <div className="form-group"><label className="form-label">Monto a Pagar (Base)</label><input type="number" step="0.01" name="totalAPagarProv" className="form-control" value={formData.totalAPagarProv} onChange={handleChange} /></div>
                  <div className="form-group" style={{ gridColumn: 'span 3' }}><hr style={{ borderColor: '#30363d' }} /></div>
                  <div className="form-group"><label className="form-label">Dólares</label><input type="text" className="form-control" value={`$ ${formData.dolaresProv.toFixed(2)}`} readOnly style={{ backgroundColor: '#161b22', color: '#3fb950', fontWeight: 'bold' }} /></div>
                  <div className="form-group"><label className="form-label">Pesos</label><input type="text" className="form-control" value={`$ ${formData.pesosProv.toFixed(2)}`} readOnly style={{ backgroundColor: '#161b22', color: '#58a6ff', fontWeight: 'bold' }} /></div>
                  <div className="form-group"><label className="form-label orange">Conversión Final (Contabilidad)</label><input type="text" className="form-control" value={`$ ${formData.conversionProv.toFixed(2)}`} readOnly style={{ backgroundColor: '#0d1117', color: '#D84315', fontWeight: 'bold', border: '1px solid #D84315' }} /></div>
                </div>
              )}

              {pestañaActiva === 'cobrar' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Facturado En:</label>
                    <select name="facturadoEnCobrar" className="form-control" value={formData.facturadoEnCobrar} onChange={handleChange} required>
                      <option value="">-- Seleccionar Moneda --</option>
                      <option value={ID_USD}>Dólares (USD)</option>
                      <option value={ID_MXN}>Pesos (MXN)</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Moneda Convenio (Cliente)</label>
                    <input type="text" className="form-control" value={formData.monedaConvenioCliente === ID_MXN ? 'Pesos (MXN)' : formData.monedaConvenioCliente === ID_USD ? 'Dólares (USD)' : 'Sin Asignar'} readOnly style={{ backgroundColor: '#0d1117' }} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Convenio Seleccionado (Monto Base)</label>
                    <input type="number" className="form-control" value={formData.montoConvenioCliente} readOnly style={{ backgroundColor: '#0d1117' }} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cargos Adicionales</label>
                    <input type="number" step="0.01" name="cargosAdicionales" className="form-control" value={formData.cargosAdicionales} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label orange">Subtotal (Convenio + Cargos)</label>
                    <input type="text" className="form-control" value={`$ ${formData.subtotalCliente.toFixed(2)}`} readOnly style={{ backgroundColor: '#161b22', color: '#f0f6fc', fontWeight: 'bold' }} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tipo de Cambio del Día</label>
                    <input type="text" className="form-control" value={tipoCambioDia ? `$ ${tipoCambioDia}` : 'No encontrado'} readOnly style={{ backgroundColor: '#0d1117' }} />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 3' }}><hr style={{ borderColor: '#30363d' }} /></div>

                  <div className="form-group">
                    <label className="form-label">Dólares (Cliente)</label>
                    <input type="text" className="form-control" value={`$ ${formData.dolaresCliente.toFixed(2)}`} readOnly style={{ backgroundColor: '#161b22', color: '#3fb950', fontWeight: 'bold' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pesos (Cliente)</label>
                    <input type="text" className="form-control" value={`$ ${formData.pesosCliente.toFixed(2)}`} readOnly style={{ backgroundColor: '#161b22', color: '#58a6ff', fontWeight: 'bold' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label orange">Conversión Final (Ingreso)</label>
                    <input type="text" className="form-control" value={`$ ${formData.conversionCliente.toFixed(2)}`} readOnly style={{ backgroundColor: '#0d1117', color: '#D84315', fontWeight: 'bold', border: '1px solid #D84315' }} />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <div style={{ backgroundColor: formData.utilidadEstimada >= 0 ? 'rgba(63, 185, 80, 0.1)' : 'rgba(248, 81, 73, 0.1)', border: `1px solid ${formData.utilidadEstimada >= 0 ? '#3fb950' : '#f85149'}`, padding: '16px', borderRadius: '8px', textAlign: 'center', marginTop: '12px' }}>
                      <span style={{ display: 'block', color: '#8b949e', fontSize: '0.9rem', marginBottom: '8px' }}>UTILIDAD ESTIMADA DE LA OPERACIÓN (Ingreso - Gasto)</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: formData.utilidadEstimada >= 0 ? '#3fb950' : '#f85149' }}>
                        $ {formData.utilidadEstimada.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="form-actions" style={{ marginTop: '16px' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={cargando || resolviendoConvenio}>
                {cargando ? 'Evaluando...' : resolviendoConvenio ? 'Calculando Flujo...' : (initialData ? 'Guardar Cambios' : 'Guardar Operación')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};