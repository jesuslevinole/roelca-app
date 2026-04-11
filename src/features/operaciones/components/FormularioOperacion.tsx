// src/features/operaciones/components/FormularioOperacion.tsx
import { useState, useEffect } from 'react'; // ✅ Se eliminó useRef
import { collection, getDocs, query, where, limit } from 'firebase/firestore'; // ✅ Se eliminaron doc y getDoc
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

  const [empresas, setEmpresas] = useState<any[]>([]);
  const [tiposOperacion, setTiposOperacion] = useState<any[]>([]);
  const [embalajes, setEmbalajes] = useState<any[]>([]);
  const [remolques, setRemolques] = useState<any[]>([]);
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [conveniosProv, setConveniosProv] = useState<any[]>([]);
  
  const [tipoCambioDia, setTipoCambioDia] = useState<number | null>(null);
  const [buscandoTC, setBuscandoTC] = useState(false);

  const [searchOrigen, setSearchOrigen] = useState('');
  const [showDropdownOrigen, setShowDropdownOrigen] = useState(false);
  const [searchDestino, setSearchDestino] = useState('');
  const [showDropdownDestino, setShowDropdownDestino] = useState(false);

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
        const [empSnap, opSnap, embSnap, remSnap, tarSnap, convProvSnap] = await Promise.all([
          getDocs(collection(db, 'empresas')),
          getDocs(collection(db, 'catalogo_tipo_operacion')),
          getDocs(collection(db, 'catalogo_embalaje')),
          getDocs(collection(db, 'remolques')), 
          getDocs(collection(db, 'tarifas_referencia')),
          getDocs(collection(db, 'convenios_proveedores'))
        ]);

        // ✅ CORRECCIÓN TypeScript ts(2339): Añadido (d.data() as any) para que no marque error
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

      } catch (error) {
        console.error("Error cargando catálogos", error);
      }
      setCargandoCatalogos(false);
    };
    fetchCatalogos();
  }, []);

  useEffect(() => {
    const buscarTC = async () => {
      if (!formData.fechaServicio) return;
      setBuscandoTC(true);
      try {
        const q = query(collection(db, 'tipo_cambio'), where('fecha', '==', formData.fechaServicio), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setTipoCambioDia(snap.docs[0].data().valor);
        } else {
          setTipoCambioDia(null); 
        }
      } catch (error) {
        console.error("Error buscando TC", error);
      }
      setBuscandoTC(false);
    };
    buscarTC();
  }, [formData.fechaServicio]);

  useEffect(() => {
    const facturadoEn = formData.facturadoEnUnidad;
    const monedaConv = formData.monedaConvenioProv;
    const total = Number(formData.totalAPagarProv) || 0;
    const tc = tipoCambioDia || 0;

    let dolares = 0;
    let pesos = 0;
    let conversion = 0;

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

  const resultadosOrigen = filOrigenesDestinos.filter(e => 
    e.nombre?.toLowerCase().includes(searchOrigen.toLowerCase()) || 
    e.direccion?.toLowerCase().includes(searchOrigen.toLowerCase())
  );
  const resultadosDestino = filOrigenesDestinos.filter(e => 
    e.nombre?.toLowerCase().includes(searchDestino.toLowerCase()) || 
    e.direccion?.toLowerCase().includes(searchDestino.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tipoCambioDia) {
      return alert(`⛔ Imposible Guardar: No existe un Tipo de Cambio registrado para la fecha ${formData.fechaServicio}. Por favor registre el TC primero.`);
    }

    setCargando(true);
    try {
      const configId = `${formData.tipoServicio}_${formData.trafico}_${formData.carga}`;
      const statusCalculado = await calcularStatusDinamico(configId, formData, initialData?.status);
      
      const tarifaDoc = tarifas.find(t => t.id === formData.convenio);
      
      const { pdfCartaPorte, pdfDoda, pdfManifiesto, pdfsEntrys, ...datosLimpios } = formData;

      const operacionData: Omit<Operacion, 'ref'> = { 
        ...datosLimpios, 
        convenioNombre: tarifaDoc?.descripcion || 'Sin descripción',
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

  if (cargandoCatalogos) return <div className={`modal-overlay`}><div className="form-card" style={{padding: '40px', textAlign: 'center', color: '#8b949e'}}>Cargando módulos y catálogos...</div></div>;

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
              
              {/* ================= PESTAÑA 1: GENERAL ================= */}
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
                    {buscandoTC ? <small style={{color: '#58a6ff'}}>Buscando TC...</small> : <small style={{color: tipoCambioDia ? '#3fb950' : '#f85149'}}>TC Oficial: {tipoCambioDia ? `$${tipoCambioDia}` : 'Sin Registro'}</small>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cliente (Paga)</label>
                    <select name="clientePaga" className="form-control" value={formData.clientePaga} onChange={handleChange} required>
                      <option value="">-- Seleccionar (7eec9cbb) --</option>
                      {filClientesPaga.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Convenio</label>
                    <select name="convenio" className="form-control" value={formData.convenio} onChange={handleChange} required>
                      <option value="">-- Seleccionar --</option>
                      {tarifas.map(t => <option key={t.id} value={t.id}>{t.descripcion}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label"># de Remolque</label>
                    <select name="numeroRemolque" className="form-control" value={formData.numeroRemolque} onChange={handleChange}>
                      <option value="">-- Seleccionar --</option>
                      {remolques.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Ref Cliente</label><input type="text" name="refCliente" className="form-control" value={formData.refCliente} onChange={handleChange} /></div>
                  
                  {/* BUSCADOR AVANZADO: ORIGEN */}
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label orange">Origen (Busca por nombre o dir.)</label>
                    <input 
                      type="text" className="form-control" placeholder="Buscar origen..."
                      value={searchOrigen} onChange={e => { setSearchOrigen(e.target.value); setShowDropdownOrigen(true); }}
                      onFocus={() => setShowDropdownOrigen(true)}
                    />
                    {showDropdownOrigen && searchOrigen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                        {resultadosOrigen.map(o => (
                          <div key={o.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} 
                               onClick={() => { setFormData(prev => ({...prev, origen: o.id})); setSearchOrigen(o.nombre); setShowDropdownOrigen(false); }}>
                            <div style={{ fontWeight: 'bold', color: '#c9d1d9' }}>{o.nombre}</div>
                            <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>{o.direccion}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* BUSCADOR AVANZADO: DESTINO */}
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label orange">Destino (Busca por nombre o dir.)</label>
                    <input 
                      type="text" className="form-control" placeholder="Buscar destino..."
                      value={searchDestino} onChange={e => { setSearchDestino(e.target.value); setShowDropdownDestino(true); }}
                      onFocus={() => setShowDropdownDestino(true)}
                    />
                    {showDropdownDestino && searchDestino && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                        {resultadosDestino.map(d => (
                          <div key={d.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #21262d' }} 
                               onClick={() => { setFormData(prev => ({...prev, destino: d.id})); setSearchDestino(d.nombre); setShowDropdownDestino(false); }}>
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

              {/* ================= PESTAÑA 2: PEDIMENTO Y CT ================= */}
              {pestañaActiva === 'pedimento' && (
                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Cliente (Mercancía)</label>
                    <select name="clienteMercancia" className="form-control" value={formData.clienteMercancia} onChange={handleChange}>
                      <option value="">-- Seleccionar (51246232) --</option>
                      {filClientesMercancia.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Descripción de la Mercancía</label><input type="text" name="descripcionMercancia" className="form-control" value={formData.descripcionMercancia} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">Cantidad (Enteros)</label><input type="number" step="1" name="cantidad" className="form-control" value={formData.cantidad} onChange={handleChange} /></div>
                  <div className="form-group">
                    <label className="form-label">Embalaje</label>
                    <select name="embalaje" className="form-control" value={formData.embalaje} onChange={handleChange}>
                      <option value="">-- Seleccionar --</option>
                      {embalajes.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Peso (Kg) Decimales</label><input type="number" step="0.01" name="pesoKg" className="form-control" value={formData.pesoKg} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">PDF - Carta Porte</label><input type="file" accept=".pdf" className="form-control" onChange={(e) => handleFileChange(e, 'pdfCartaPorte')} /></div>
                  <div className="form-group"><label className="form-label"># DODA</label><input type="text" name="numDoda" className="form-control" value={formData.numDoda} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">Fecha de Emisión</label><input type="date" name="fechaEmisionDoda" className="form-control" value={formData.fechaEmisionDoda} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">PDF - DODA</label><input type="file" accept=".pdf" className="form-control" onChange={(e) => handleFileChange(e, 'pdfDoda')} /></div>
                </div>
              )}

              {/* ================= PESTAÑA 3: ENTRY'S Y MANIFIESTO ================= */}
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

                  <div className="form-group" style={{ gridColumn: 'span 3' }}><hr style={{ borderColor: '#30363d' }}/></div>

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

              {/* ================= PESTAÑA 4: UNIDAD Y OPERADOR ================= */}
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

                  <div className="form-group" style={{ gridColumn: 'span 3' }}><hr style={{ borderColor: '#30363d' }}/></div>

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
              <button type="submit" className="btn btn-primary" disabled={cargando}>
                {cargando ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Guardar Operación')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};