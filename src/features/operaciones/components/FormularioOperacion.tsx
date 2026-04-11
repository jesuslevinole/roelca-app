// src/features/operaciones/components/FormularioOperacion.tsx
import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { guardarOperacionSegura } from '../services/operacionesService';
import { calcularStatusDinamico } from '../config/statusRules';
import type { Operacion } from '../../../types/operacion';

interface FormProps {
  estado: 'abierto' | 'minimizado';
  initialData?: any;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
}

type TabType = 'general' | 'pedimento' | 'manifiesto' | 'unidad' | 'cobrar';

const ID_USD = '7dca62b3';
const ID_MXN = 'f95d8894';

export const FormularioOperacion = ({ estado, initialData, onClose, onMinimize, onRestore }: FormProps) => {
  const [pestañaActiva, setPestañaActiva] = useState<TabType>('general');
  const [cargando, setCargando] = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [resolviendoConvenio, setResolviendoConvenio] = useState(false);

  const [empresas, setEmpresas] = useState<any[]>([]);
  const [tiposOperacion, setTiposOperacion] = useState<any[]>([]);
  const [embalajes, setEmbalajes] = useState<any[]>([]);
  const [remolques, setRemolques] = useState<any[]>([]);
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [conveniosProv, setConveniosProv] = useState<any[]>([]);

  const [catalogoTC, setCatalogoTC] = useState<any[]>([]);
  const [catalogoConvClientes, setCatalogoConvClientes] = useState<any[]>([]);
  const [catalogoConvDetalles, setCatalogoConvDetalles] = useState<any[]>([]);
  const [listaConveniosCliente, setListaConveniosCliente] = useState<any[]>([]);

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

  const [formData, setFormData] = useState({
    tipoServicio: '', trafico: '', carga: '',

    tipoOperacionId: '',
    fechaServicio: new Date().toISOString().split('T')[0],
    clientePaga: '', convenio: '', numeroRemolque: '', refCliente: '',
    origen: '', destino: '', observacionesEjecutivo: '',

    clienteMercancia: '', descripcionMercancia: '', cantidad: '', embalaje: '',
    pesoKg: '', numDoda: '', fechaEmisionDoda: '',
    pdfCartaPorte: null as File | null, pdfDoda: null as File | null,

    cantEntrys: 0, numManifiesto: '', provServicios: '',
    pdfManifiesto: null as File | null,
    pdfsEntrys: [] as (File | null)[],

    proveedorUnidad: '', facturadoEnUnidad: '', convenioProveedor: '', monedaConvenioProv: '',
    totalAPagarProv: 0,
    dolaresProv: 0, pesosProv: 0, conversionProv: 0,
    unidad: '', operador: ''
  });

  useEffect(() => {
    const fetchCatalogos = async () => {
      setCargandoCatalogos(true);
      try {
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

        setEmpresas(empSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));

        const opsPermitidas = ['Transfer', 'Logistica', 'Logística', 'Fletes'];
        setTiposOperacion(
          opSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
            .filter((op: any) => opsPermitidas.includes(op.tipo_operacion))
        );

        setEmbalajes(embSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        setRemolques(remSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        setTarifas(tarSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        setConveniosProv(convProvSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));

        setCatalogoTC(tcSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        setCatalogoConvClientes(convCliSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        setCatalogoConvDetalles(convDetSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));

      } catch (error) {
        console.error("Error cargando catálogos", error);
      }
      setCargandoCatalogos(false);
    };
    fetchCatalogos();
  }, []);

  useEffect(() => {
    if (!formData.fechaServicio || catalogoTC.length === 0) return;
    setBuscandoTC(true);

    const [y, m, d] = formData.fechaServicio.split('-');
    const fechaLatina = `${d}/${m}/${y}`; 
    const fechaUS = `${m}/${d}/${y}`; 
    const fechaISO = `${y}-${m}-${d}`; 

    let tcEncontrado = null;

    for (const tc of catalogoTC) {
      const valoresFila = Object.values(tc).map(v => String(v).trim());

      if (valoresFila.includes(fechaLatina) || valoresFila.includes(fechaUS) || valoresFila.includes(fechaISO)) {
        const keys = Object.keys(tc);
        const valKey = keys.find(k => {
          const low = k.toLowerCase();
          return low.includes('dof') || low.includes('valor') || low === 'tc' || low.includes('cambio');
        });

        if (valKey) {
          tcEncontrado = Number(String(tc[valKey]).replace(/[^0-9.-]+/g, ""));
        } else {
          const posiblesRates = valoresFila.map(v => parseFloat(v.replace(/[^0-9.-]+/g, ""))).filter(n => !isNaN(n) && n > 15 && n < 25);
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
    if (!clientId && searchClientePaga) {
       const empresaEncontrada = empresas.find(e => e.nombre?.toLowerCase().trim() === searchClientePaga.toLowerCase().trim());
       if (empresaEncontrada) clientId = empresaEncontrada.id;
    }

    if (!clientId || catalogoConvClientes.length === 0) {
      setListaConveniosCliente([]);
      return;
    }

    const maestrosDelCliente = catalogoConvClientes.filter(c => {
      const refVal = String(c.clienteId || c.cliente || c.Cliente || c.CLIENTE || c.id_cliente || c.empresa || '').trim();
      return refVal === clientId;
    });

    if (maestrosDelCliente.length > 0) {
      const masterIds = maestrosDelCliente.map(m => String(m.id).trim());
      const masterNames = maestrosDelCliente.map(m => String(m['# de Convenio'] || m.numeroConvenio || m.nombre || m.id).trim());

      const detalles = catalogoConvDetalles.filter(d => {
        const convRef = String(d.convenioId || d.convenio || d.id_convenio || d.Convenio || d.CONVENIO || '').trim();
        return masterIds.includes(convRef) || masterNames.includes(convRef);
      });

      const mapped = detalles.map(d => {
        const tarifaId = d.tipoConvenioId || d.tipo_convenio_id || d.tipoConvenio || d.tipo_convenio || d['TIPO DE CONVENIO'];
        const tObj = tarifas.find(t => String(t.id).trim() === String(tarifaId).trim());

        const nombreVisible = tObj?.descripcion || tObj?.nombre || (tarifaId ? `Desconocido (${tarifaId})` : 'Sin Asignar');

        return {
          id: d.id,
          tarifaBaseId: tarifaId,
          descripcion: nombreVisible,
          ...d
        };
      });

      setListaConveniosCliente(mapped);
    } else {
      setListaConveniosCliente([]);
    }
  }, [formData.clientePaga, searchClientePaga, catalogoConvClientes, catalogoConvDetalles, tarifas, empresas]);

  useEffect(() => {
    const resolverVariablesDeFlujo = async () => {
      if (!formData.convenio) return;

      setResolviendoConvenio(true);
      try {
        const detalleElegido = listaConveniosCliente.find(c => c.id === formData.convenio);
        if (!detalleElegido) return;

        const tarifaObj = tarifas.find(t => t.id === detalleElegido.tarifaBaseId);

        if (tarifaObj) {
          const cargaDetectada = tarifaObj.estado_carga || 'N/A';
          const tipoTarifarioId = tarifaObj.tipo_operacion;

          let tipoServicioDetectado = 'N/A';
          let traficoDetectado = 'N/A';

          if (tipoTarifarioId) {
            const tipoRef = doc(db, 'catalogo_tipos_tarifarios', String(tipoTarifarioId));
            const tipoSnap = await getDoc(tipoRef);
            if (tipoSnap.exists()) {
              const tipoData = tipoSnap.data();
              tipoServicioDetectado = tipoData.descripcion || 'N/A';
              traficoDetectado = tipoData.movimiento || 'N/A';
            }
          }

          setFormData(prev => ({
            ...prev,
            tipoServicio: tipoServicioDetectado,
            trafico: traficoDetectado,
            carga: cargaDetectada
          }));
        }
      } catch (error) {
        console.error("Error resolviendo la lógica:", error);
      } finally {
        setResolviendoConvenio(false);
      }
    };

    resolverVariablesDeFlujo();
  }, [formData.convenio, listaConveniosCliente, tarifas]);

  useEffect(() => {
    const facturadoEn = formData.facturadoEnUnidad;
    const monedaConv = formData.monedaConvenioProv;
    const total = Number(formData.totalAPagarProv) || 0;
    const tc = tipoCambioDia || 0;

    let dolares = 0; let pesos = 0; let conversion = 0;

    if (tc > 0) {
      if (facturadoEn === ID_USD && monedaConv === ID_USD) dolares = total;

      if (facturadoEn === ID_MXN && monedaConv === ID_MXN) pesos = total;
      else if (facturadoEn === ID_MXN && monedaConv === ID_USD) pesos = total * tc;

      if (facturadoEn === ID_MXN && monedaConv === ID_MXN) conversion = total;
      else if (facturadoEn === ID_MXN && monedaConv === ID_USD) conversion = total * tc;
      else if (facturadoEn === ID_USD && monedaConv === ID_USD) conversion = total * tc;
    }

    setFormData(prev => ({ ...prev, dolaresProv: dolares, pesosProv: pesos, conversionProv: conversion }));
  }, [formData.facturadoEnUnidad, formData.monedaConvenioProv, formData.totalAPagarProv, tipoCambioDia]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, index?: number) => {
    const file = e.target.files?.[0] || null;
    if (index !== undefined) {
      const nuevosPdfs = [...formData.pdfsEntrys];
      nuevosPdfs[index] = file;
      setFormData(prev => ({ ...prev, pdfsEntrys: nuevosPdfs }));
    } else {
      setFormData(prev => ({ ...prev, [field]: file }));
    }
  };

  const filClientesPaga = empresas.filter(e => e.tiposEmpresa?.includes('7eec9cbb'));
  const filClientesMercancia = empresas.filter(e => e.tiposEmpresa?.includes('51246232'));
  const filProveedoresServicios = empresas.filter(e => e.tiposEmpresa?.includes('11894dfd'));
  const filOrigenesDestinos = empresas.filter(e => e.tiposEmpresa?.includes('6e7af5ab'));

  const resultadosOrigen = filOrigenesDestinos.filter(e => e.nombre?.toLowerCase().includes(searchOrigen.toLowerCase()) || e.direccion?.toLowerCase().includes(searchOrigen.toLowerCase()));
  const resultadosDestino = filOrigenesDestinos.filter(e => e.nombre?.toLowerCase().includes(searchDestino.toLowerCase()) || e.direccion?.toLowerCase().includes(searchDestino.toLowerCase()));
  const resultadosClientePaga = filClientesPaga.filter(e => e.nombre?.toLowerCase().includes(searchClientePaga.toLowerCase()));
  const resultadosRemolque = remolques.filter(e => e.nombre?.toLowerCase().includes(searchRemolque.toLowerCase()));
  
  const resultadosClienteMercancia = filClientesMercancia.filter(e => e.nombre?.toLowerCase().includes(searchClienteMercancia.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tipoCambioDia) {
      return alert(`⛔ Imposible Guardar: No existe un Tipo de Cambio registrado para la fecha seleccionada.`);
    }

    setCargando(true);
    try {
      const configId = `${formData.tipoServicio}_${formData.trafico}_${formData.carga}`;
      const statusCalculado = await calcularStatusDinamico(configId, formData, initialData?.status);

      const detalleDoc = listaConveniosCliente.find(c => c.id === formData.convenio);

      const { pdfCartaPorte, pdfDoda, pdfManifiesto, pdfsEntrys, ...datosLimpios } = formData;

      const operacionData: Omit<Operacion, 'ref'> = {
        ...datosLimpios,
        convenioNombre: detalleDoc?.descripcion || 'Sin descripción',
        status: statusCalculado,
        tienePdfDoda: !!pdfDoda,
        cantPdfsEntrys: pdfsEntrys.filter(Boolean).length
      };

      if (initialData) {
        alert(`Operación actualizada correctamente.`);
      } else {
        await guardarOperacionSegura(operacionData);
        alert('Operación guardada exitosamente');
      }
      onClose();
    } catch (error) {
      alert('Error al guardar la operación.');
    } finally {
      setCargando(false);
    }
  };

  if (cargandoCatalogos) return <div className={`modal-overlay`}><div className="form-card" style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>Cargando módulos y catálogos...</div></div>;

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
          </div>

          <form onSubmit={handleSubmit}>
            <div className="tab-content" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '12px' }}>

              {/* =========================================
                  PESTAÑA 1: INFORMACIÓN GENERAL
              ========================================== */}
              {pestañaActiva === 'general' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label orange">Tipo de Operación</label>
                    <select name="tipoOperacionId" className="form-control" value={formData.tipoOperacionId} onChange={handleChange} required>
                      <option value="">-- Seleccionar --</option>
                      {tiposOperacion.map(op => <option key={op.id} value={op.id}>{op.tipo_operacion}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label orange">Fecha de Servicio</label>
                    <input type="date" name="fechaServicio" className="form-control" value={formData.fechaServicio} onChange={handleChange} required />
                    {buscandoTC ? <small style={{ color: '#58a6ff' }}>Buscando TC...</small> : <small style={{ color: tipoCambioDia ? '#3fb950' : '#f85149', fontWeight: 'bold' }}>TC Oficial: {tipoCambioDia ? `$${tipoCambioDia}` : 'Sin Registro'}</small>}
                  </div>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Cliente (Paga)</label>
                    <input
                      type="text" className="form-control" placeholder="Escriba para buscar cliente..." required={!formData.clientePaga && !searchClientePaga}
                      value={searchClientePaga}
                      onChange={e => {
                        setSearchClientePaga(e.target.value);
                        setShowDropdownClientePaga(true);
                        if (formData.clientePaga) setFormData(prev => ({ ...prev, clientePaga: '', convenio: '' }));
                      }}
                      onFocus={() => setShowDropdownClientePaga(true)}
                    />
                    {showDropdownClientePaga && searchClientePaga && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                        {resultadosClientePaga.length === 0 ? <div style={{ padding: '8px', color: '#8b949e' }}>Sin resultados</div> : resultadosClientePaga.map(c => (
                          <div key={c.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }}
                            onClick={() => { setFormData(prev => ({ ...prev, clientePaga: c.id, convenio: '' })); setSearchClientePaga(c.nombre); setShowDropdownClientePaga(false); }}>
                            <div style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{c.nombre}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Convenio (Tarifa)</label>
                    <select name="convenio" className="form-control" value={formData.convenio} onChange={handleChange} required disabled={listaConveniosCliente.length === 0}>
                      <option value="">-- Seleccione un Convenio --</option>
                      {listaConveniosCliente.map(c => (
                        <option key={c.id} value={c.id}>{c.descripcion}</option>
                      ))}
                    </select>
                    {listaConveniosCliente.length === 0 && searchClientePaga && <small style={{ color: '#8b949e' }}>Este cliente no tiene convenios asignados</small>}
                  </div>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label"># de Remolque</label>
                    <input
                      type="text" className="form-control" placeholder="Buscar remolque..."
                      value={searchRemolque}
                      onChange={e => {
                        setSearchRemolque(e.target.value);
                        setShowDropdownRemolque(true);
                        if (formData.numeroRemolque) setFormData(prev => ({ ...prev, numeroRemolque: '' }));
                      }}
                      onFocus={() => setShowDropdownRemolque(true)}
                    />
                    {showDropdownRemolque && searchRemolque && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                        {resultadosRemolque.length === 0 ? <div style={{ padding: '8px', color: '#8b949e' }}>Sin resultados</div> : resultadosRemolque.map(r => (
                          <div key={r.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }}
                            onClick={() => { setFormData(prev => ({ ...prev, numeroRemolque: r.id })); setSearchRemolque(r.nombre); setShowDropdownRemolque(false); }}>
                            <div style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{r.nombre}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group"><label className="form-label">Ref Cliente</label><input type="text" name="refCliente" className="form-control" value={formData.refCliente} onChange={handleChange} /></div>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label orange">Origen</label>
                    <input type="text" className="form-control" placeholder="Buscar origen..." value={searchOrigen} onChange={e => { setSearchOrigen(e.target.value); setShowDropdownOrigen(true); }} onFocus={() => setShowDropdownOrigen(true)} />
                    {showDropdownOrigen && searchOrigen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                        {resultadosOrigen.map(o => (
                          <div key={o.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} onClick={() => { setFormData(prev => ({ ...prev, origen: o.id })); setSearchOrigen(o.nombre); setShowDropdownOrigen(false); }}>
                            <div style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{o.nombre}</div>
                            <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>{o.direccion}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label orange">Destino</label>
                    <input type="text" className="form-control" placeholder="Buscar destino..." value={searchDestino} onChange={e => { setSearchDestino(e.target.value); setShowDropdownDestino(true); }} onFocus={() => setShowDropdownDestino(true)} />
                    {showDropdownDestino && searchDestino && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                        {resultadosDestino.map(d => (
                          <div key={d.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} onClick={() => { setFormData(prev => ({ ...prev, destino: d.id })); setSearchDestino(d.nombre); setShowDropdownDestino(false); }}>
                            <div style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{d.nombre}</div>
                            <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>{d.direccion}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Observaciones Ejecutivo</label><input type="text" name="observacionesEjecutivo" className="form-control" value={formData.observacionesEjecutivo} onChange={handleChange} /></div>
                </div>
              )}

              {/* =========================================
                  PESTAÑA 2: PEDIMENTO Y CT
              ========================================== */}
              {pestañaActiva === 'pedimento' && (
                <div className="form-grid">
                  
                  {/* ✅ BUSCADOR: CLIENTE MERCANCÍA */}
                  <div className="form-group" style={{ position: 'relative', gridColumn: 'span 2' }}>
                    <label className="form-label">Cliente (Mercancía)</label>
                    <input
                      type="text" className="form-control" placeholder="Escriba para buscar cliente mercancía..."
                      value={searchClienteMercancia}
                      onChange={e => {
                        setSearchClienteMercancia(e.target.value);
                        setShowDropdownClienteMercancia(true);
                        if (formData.clienteMercancia) setFormData(prev => ({ ...prev, clienteMercancia: '' }));
                      }}
                      onFocus={() => setShowDropdownClienteMercancia(true)}
                    />
                    {showDropdownClienteMercancia && searchClienteMercancia && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                        {resultadosClienteMercancia.length === 0 ? <div style={{ padding: '8px', color: '#8b949e' }}>Sin resultados</div> : resultadosClienteMercancia.map(c => (
                          <div key={c.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }}
                            onClick={() => { setFormData(prev => ({ ...prev, clienteMercancia: c.id })); setSearchClienteMercancia(c.nombre); setShowDropdownClienteMercancia(false); }}>
                            <div style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{c.nombre}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group"><label className="form-label">Descripción de la Mercancía</label><input type="text" name="descripcionMercancia" className="form-control" value={formData.descripcionMercancia} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">Cantidad (Enteros)</label><input type="number" step="1" name="cantidad" className="form-control" value={formData.cantidad} onChange={handleChange} /></div>
                  <div className="form-group">
                    <label className="form-label">Embalaje</label>
                    <select name="embalaje" className="form-control" value={formData.embalaje} onChange={handleChange}>
                      <option value="">-- Seleccionar --</option>
                      {/* ✅ CAMBIO: Ahora carga la clave (PALLET, PAQUETE, Piezas) */}
                      {embalajes.map(e => <option key={e.id} value={e.id}>{e.clave || e.nombre || e.id}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Peso (Kg) Decimales</label><input type="number" step="0.01" name="pesoKg" className="form-control" value={formData.pesoKg} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">PDF - Carta Porte</label><input type="file" accept=".pdf" className="form-control" onChange={(e) => handleFileChange(e, 'pdfCartaPorte')} /></div>
                  <div className="form-group"><label className="form-label"># DODA</label><input type="text" name="numDoda" className="form-control" value={formData.numDoda} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">Fecha de Emisión</label><input type="date" name="fechaEmisionDoda" className="form-control" value={formData.fechaEmisionDoda} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">PDF - DODA</label><input type="file" accept=".pdf" className="form-control" onChange={(e) => handleFileChange(e, 'pdfDoda')} /></div>
                </div>
              )}

              {/* =========================================
                  PESTAÑA 3: MANIFIESTOS
              ========================================== */}
              {pestañaActiva === 'manifiesto' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Cantidad de Entry's (Max 10)</label>
                    <input type="number" max="10" min="0" name="cantEntrys" className="form-control" value={formData.cantEntrys}
                      onChange={(e) => {
                        const val = Math.min(10, Math.max(0, parseInt(e.target.value) || 0));
                        setFormData(prev => ({ ...prev, cantEntrys: val, pdfsEntrys: new Array(val).fill(null) }));
                      }}
                    />
                  </div>

                  {Array.from({ length: formData.cantEntrys }).map((_, i) => (
                    <div className="form-group" key={i}>
                      <label className="form-label">PDF Entry #{i + 1}</label>
                      <input type="file" accept=".pdf" className="form-control" onChange={(e) => handleFileChange(e, '', i)} />
                    </div>
                  ))}

                  <div className="form-group" style={{ gridColumn: 'span 3' }}><hr style={{ borderColor: '#30363d' }} /></div>

                  <div className="form-group"><label className="form-label"># Manifiesto</label><input type="text" name="numManifiesto" className="form-control" value={formData.numManifiesto} onChange={handleChange} /></div>
                  <div className="form-group">
                    <label className="form-label">Proveedor de Servicios</label>
                    <select name="provServicios" className="form-control" value={formData.provServicios} onChange={handleChange}>
                      <option value="">-- Seleccionar (11894dfd) --</option>
                      {filProveedoresServicios.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">PDF Manifiesto</label><input type="file" accept=".pdf" className="form-control" onChange={(e) => handleFileChange(e, 'pdfManifiesto')} /></div>
                </div>
              )}

              {/* =========================================
                  PESTAÑA 4: UNIDAD Y OPERADOR
              ========================================== */}
              {pestañaActiva === 'unidad' && (
                <div className="form-grid">

                  <div className="form-group"><label className="form-label">Facturado En:</label>
                    <select name="facturadoEnUnidad" className="form-control" value={formData.facturadoEnUnidad} onChange={handleChange}>
                      <option value="">-- Seleccionar --</option>
                      <option value={ID_USD}>Dólares (USD)</option>
                      <option value={ID_MXN}>Pesos (MXN)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Convenio Proveedor</label>
                    <select name="convenioProveedor" className="form-control" value={formData.convenioProveedor}
                      onChange={(e) => {
                        const conv = conveniosProv.find(c => c.id === e.target.value);
                        setFormData(prev => ({ ...prev, convenioProveedor: e.target.value, monedaConvenioProv: conv?.moneda || ID_USD }));
                      }}
                    >
                      <option value="">-- Seleccionar --</option>
                      {conveniosProv.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>

                  <div className="form-group"><label className="form-label">Moneda del Convenio (Base)</label>
                    <input type="text" className="form-control" value={formData.monedaConvenioProv === ID_MXN ? 'Pesos (MXN)' : formData.monedaConvenioProv === ID_USD ? 'Dólares (USD)' : ''} readOnly style={{ backgroundColor: '#0d1117' }} />
                  </div>

                  <div className="form-group"><label className="form-label">Monto a Pagar (Base)</label>
                    <input type="number" step="0.01" name="totalAPagarProv" className="form-control" value={formData.totalAPagarProv} onChange={handleChange} />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 3' }}><hr style={{ borderColor: '#30363d' }} /></div>

                  <div className="form-group"><label className="form-label">Dólares</label>
                    <input type="text" className="form-control" value={`$ ${formData.dolaresProv.toFixed(2)}`} readOnly style={{ backgroundColor: '#161b22', color: '#3fb950', fontWeight: 'bold' }} />
                  </div>
                  <div className="form-group"><label className="form-label">Pesos</label>
                    <input type="text" className="form-control" value={`$ ${formData.pesosProv.toFixed(2)}`} readOnly style={{ backgroundColor: '#161b22', color: '#58a6ff', fontWeight: 'bold' }} />
                  </div>
                  <div className="form-group"><label className="form-label orange">Conversión Final (Contabilidad)</label>
                    <input type="text" className="form-control" value={`$ ${formData.conversionProv.toFixed(2)}`} readOnly style={{ backgroundColor: '#0d1117', color: '#D84315', fontWeight: 'bold', border: '1px solid #D84315' }} />
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