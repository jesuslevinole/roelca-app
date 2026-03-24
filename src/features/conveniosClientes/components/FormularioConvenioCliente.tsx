// src/features/conveniosClientes/components/FormularioConvenioCliente.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro } from '../../../config/firebase';
import type { ConvenioClienteRecord, ConvenioDetalle } from '../../../types/convenioCliente';

// =========================================
// SUB-COMPONENTE: MODAL DE CONFIGURACIÓN
// =========================================
const FieldConfigModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  fields: { name: string; label: string }[];
  requiredFields: string[];
  toggleRequired: (f: string) => void;
}> = ({ isOpen, onClose, fields, requiredFields, toggleRequired }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', zIndex: 2000 }}>
      <div className="form-card" style={{ maxWidth: '400px', borderRadius: '16px', border: '1px solid #444', backgroundColor: '#0d1117' }}>
        <div className="form-header" style={{ padding: '20px 24px', borderBottom: '1px solid #30363d', marginBottom: '0' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', margin: 0, color: '#f0f6fc' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Campos Obligatorios
          </h3>
          <button className="close-x" onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: '0.85rem', color: '#8b949e', marginBottom: '20px', lineHeight: '1.5' }}>
            Selecciona qué campos deben ser obligatorios al llenar este formulario.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {fields.map(f => (
              <label key={f.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.95rem', color: '#c9d1d9' }}>
                <input 
                  type="checkbox" 
                  checked={requiredFields.includes(f.name)} 
                  onChange={() => toggleRequired(f.name)} 
                  style={{ width: '18px', height: '18px', accentColor: '#D84315', cursor: 'pointer' }}
                />
                {f.label}
              </label>
            ))}
          </div>
          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-primary" onClick={onClose} style={{ width: '100%', padding: '10px' }}>Listo</button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FormProps {
  estado: 'abierto' | 'minimizado';
  initialData?: ConvenioClienteRecord | null;
  registrosExistentes: ConvenioClienteRecord[]; 
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
}

export const FormularioConvenioCliente = ({ estado, initialData, registrosExistentes, onClose, onMinimize, onRestore }: FormProps) => {
  const todayISO = new Date().toISOString().split('T')[0];

  // --- ESTADO DEL MAESTRO (CONVENIO) ---
  const [formData, setFormData] = useState<ConvenioClienteRecord>({
    numeroConvenio: '',
    clienteId: '',
    clienteNombre: '',
    monedaId: '',
    monedaNombre: '',
    credito: 0,
    fechaConvenio: todayISO,
    fechaVencimiento: todayISO,
    detalles: []
  });

  const [mostrandoDetalleForm, setMostrandoDetalleForm] = useState(false);
  const [detalleDraft, setDetalleDraft] = useState({
    tipoConvenioId: '',
    tipoConvenioNombre: '',
    tarifaSugeridaSeleccionada: '',
    tarifa: 0
  });

  const [clientes, setClientes] = useState<any[]>([]);
  const [monedas, setMonedas] = useState<any[]>([]);
  const [tarifarios, setTarifarios] = useState<any[]>([]);
  const [tarifasSugeridasActuales, setTarifasSugeridasActuales] = useState<any[]>([]); 
  const [cargando, setCargando] = useState(false);

  // --- CONFIGURACIÓN DE CAMPOS OBLIGATORIOS (LOCALSTORAGE) ---
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  
  const configuracionCampos = [
    { name: 'clienteId', label: 'Cliente' },
    { name: 'fechaConvenio', label: 'Fecha del Convenio' },
    { name: 'fechaVencimiento', label: 'Fecha de Vencimiento' },
    { name: 'monedaId', label: 'Moneda' },
    { name: 'credito', label: 'Crédito (Días)' }
  ];

  useEffect(() => {
    const savedConfig = localStorage.getItem('formConfig_convenioCliente');
    if (savedConfig) {
      setRequiredFields(JSON.parse(savedConfig));
    } else {
      setRequiredFields(['clienteId', 'fechaConvenio', 'fechaVencimiento', 'monedaId', 'credito']);
    }
  }, []);

  const toggleRequired = (fieldName: string) => {
    const newRequired = requiredFields.includes(fieldName)
      ? requiredFields.filter(f => f !== fieldName)
      : [...requiredFields, fieldName];
    setRequiredFields(newRequired);
    localStorage.setItem('formConfig_convenioCliente', JSON.stringify(newRequired));
  };

  const isRequired = (fieldName: string) => requiredFields.includes(fieldName);

  // --- LÓGICA DE DATOS ---
  const generarSiguienteConvenio = () => {
    if (registrosExistentes.length === 0) return 'CONV-001';
    const numeros = registrosExistentes.map(reg => {
      const numStr = reg.numeroConvenio.replace('CONV-', '');
      const num = parseInt(numStr, 10);
      return isNaN(num) ? 0 : num;
    });
    const maxNum = Math.max(...numeros);
    const nextNum = maxNum + 1;
    return `CONV-${String(nextNum).padStart(3, '0')}`;
  };

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const empSnapshot = await getDocs(collection(db, 'catalogo_empresas'));
        const todasEmpresas = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // CORRECCIÓN: Filtro ampliado para buscar en múltiples llaves posibles de Firebase
        const clientesFiltrados = todasEmpresas.filter((emp: any) => 
          emp.tipo_empresa === 'Cliente (Paga)' || 
          emp.tipo_servicios === 'Cliente (Paga)' || 
          emp.tipo_servicio === 'Cliente (Paga)' || 
          emp.categoria_principal === 'Cliente (Paga)'
        );
        setClientes(clientesFiltrados);

        const monSnapshot = await getDocs(collection(db, 'catalogo_moneda'));
        setMonedas(monSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const tarifarioSnapshot = await getDocs(collection(db, 'catalogo_tarifario'));
        setTarifarios(tarifarioSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error al obtener catálogos:", error);
      }
    };
    cargarCatalogos();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(prev => ({ ...prev, numeroConvenio: generarSiguienteConvenio() }));
    }
  }, [initialData, registrosExistentes]);

  // --- MANEJADORES ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClienteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const cliente = clientes.find(c => c.id === id);
    setFormData(prev => ({ ...prev, clienteId: id, clienteNombre: cliente ? cliente.empresa : '' }));
  };

  const handleMonedaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const moneda = monedas.find(m => m.id === id);
    setFormData(prev => ({ ...prev, monedaId: id, monedaNombre: moneda ? moneda.moneda : '' }));
  };

  const handleTipoConvenioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const tarifario = tarifarios.find(t => t.id === id);
    const nombreTarifario = tarifario ? (tarifario.concepto || tarifario.nombre || 'Desconocido') : '';
    
    let sugerencias: any[] = [];
    if (tarifario) {
      if (Array.isArray(tarifario.tarifas_sugeridas)) {
        sugerencias = tarifario.tarifas_sugeridas;
      } else if (tarifario.tarifa_sugerida) {
        sugerencias = [tarifario.tarifa_sugerida];
      }
    }
    setTarifasSugeridasActuales(sugerencias);

    setDetalleDraft({
      tipoConvenioId: id,
      tipoConvenioNombre: nombreTarifario,
      tarifaSugeridaSeleccionada: sugerencias.length > 0 ? sugerencias[0] : '', 
      tarifa: sugerencias.length > 0 ? parseFloat(sugerencias[0]) : 0
    });
  };

  const handleSugerenciaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const valorSeleccionado = e.target.value;
    setDetalleDraft(prev => ({
      ...prev,
      tarifaSugeridaSeleccionada: valorSeleccionado,
      tarifa: parseFloat(valorSeleccionado) || 0
    }));
  };

  const handleAgregarDetalle = () => {
    if (!detalleDraft.tipoConvenioId || detalleDraft.tarifa <= 0) {
      alert("Seleccione un tipo de convenio y asegúrese de que la tarifa sea mayor a 0.");
      return;
    }

    const nuevoDetalle: ConvenioDetalle = {
      idLocal: Date.now().toString(), 
      tipoConvenioId: detalleDraft.tipoConvenioId,
      tipoConvenioNombre: detalleDraft.tipoConvenioNombre,
      tarifa: detalleDraft.tarifa
    };

    setFormData(prev => ({ ...prev, detalles: [...(prev.detalles || []), nuevoDetalle] }));
    setDetalleDraft({ tipoConvenioId: '', tipoConvenioNombre: '', tarifaSugeridaSeleccionada: '', tarifa: 0 });
    setTarifasSugeridasActuales([]);
    setMostrandoDetalleForm(false);
  };

  const handleEliminarDetalle = (idLocal: string) => {
    setFormData(prev => ({ ...prev, detalles: prev.detalles.filter(d => d.idLocal !== idLocal) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (initialData && initialData.id) {
        await actualizarRegistro('convenios_clientes', initialData.id, formData);
      } else {
        const correlativoFinal = generarSiguienteConvenio();
        await agregarRegistro('convenios_clientes', { ...formData, numeroConvenio: correlativoFinal });
      }
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert('Error al guardar. Revisa tu conexión a internet.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <FieldConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        fields={configuracionCampos} 
        requiredFields={requiredFields} 
        toggleRequired={toggleRequired} 
      />

      <div className={`modal-overlay ${estado === 'minimizado' ? 'minimized' : ''}`}>
        <div className="form-card" style={{ maxWidth: '850px' }}>
          <div className="form-header">
            <h2>{estado === 'minimizado' ? 'Editando...' : (initialData ? `Editar Convenio` : 'Nuevo Convenio de Cliente')}</h2>
            <div className="header-actions">
              {estado === 'abierto' && (
                <button 
                  type="button" 
                  onClick={() => setIsConfigOpen(true)} 
                  style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Configurar campos obligatorios"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </button>
              )}
              {estado === 'abierto' ? (
                <button type="button" onClick={onMinimize} className="btn-window">🗕</button>
              ) : (
                <button type="button" onClick={onRestore} className="btn-window restore">🗖</button>
              )}
              <button type="button" onClick={onClose} className="btn-window close">✕</button>
            </div>
          </div>

          <div style={{ display: estado === 'minimizado' ? 'none' : 'block', padding: '10px 0', maxHeight: '75vh', overflowY: 'auto', overflowX: 'hidden' }}>
            <form onSubmit={handleSubmit}>
              
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label orange"># de Convenio (Automático)</label>
                  <input type="text" className="form-control" value={formData.numeroConvenio} disabled style={{ backgroundColor: '#21262d', color: '#8b949e', cursor: 'not-allowed' }} />
                </div>

                <div className="form-group">
                  <label className="form-label">Cliente {isRequired('clienteId') && <span style={{ color: '#ff4d4d' }}>*</span>}</label>
                  <select className="form-control" value={formData.clienteId} onChange={handleClienteChange} required={isRequired('clienteId')}>
                    <option value="">Seleccione un cliente...</option>
                    {clientes.map(cli => <option key={cli.id} value={cli.id}>{cli.empresa}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha del Convenio {isRequired('fechaConvenio') && <span style={{ color: '#ff4d4d' }}>*</span>}</label>
                  <input type="date" name="fechaConvenio" className="form-control" value={formData.fechaConvenio} onChange={handleChange} required={isRequired('fechaConvenio')} />
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha de Vencimiento {isRequired('fechaVencimiento') && <span style={{ color: '#ff4d4d' }}>*</span>}</label>
                  <input type="date" name="fechaVencimiento" className="form-control" value={formData.fechaVencimiento} onChange={handleChange} required={isRequired('fechaVencimiento')} />
                </div>

                <div className="form-group">
                  <label className="form-label">Moneda {isRequired('monedaId') && <span style={{ color: '#ff4d4d' }}>*</span>}</label>
                  <select className="form-control" value={formData.monedaId} onChange={handleMonedaChange} required={isRequired('monedaId')}>
                    <option value="">Seleccione moneda...</option>
                    {monedas.map(mon => <option key={mon.id} value={mon.id}>{mon.moneda}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Crédito (Días) {isRequired('credito') && <span style={{ color: '#ff4d4d' }}>*</span>}</label>
                  <input type="number" name="credito" className="form-control" value={formData.credito} onChange={(e) => setFormData(prev => ({ ...prev, credito: parseFloat(e.target.value) || 0 }))} required={isRequired('credito')} />
                </div>
              </div>

              {/* LISTA DE DETALLES */}
              <div style={{ marginTop: '32px', border: '1px solid #30363d', borderRadius: '8px', padding: '24px', backgroundColor: '#0d1117' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1rem', color: '#f0f6fc', margin: 0, fontWeight: '600' }}>Lista de Detalles</h3>
                  <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setMostrandoDetalleForm(!mostrandoDetalleForm)}>
                    <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>{mostrandoDetalleForm ? '−' : '+'}</span> 
                    {mostrandoDetalleForm ? 'Cancelar' : 'Agregar Detalle'}
                  </button>
                </div>

                {mostrandoDetalleForm && (
                  <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '8px', border: '1px solid #30363d', marginBottom: '24px' }}>
                    <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', gap: '16px', alignItems: 'end', marginBottom: 0 }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Tipo de Convenio (Catálogo)</label>
                        <select className="form-control" value={detalleDraft.tipoConvenioId} onChange={handleTipoConvenioChange}>
                          <option value="">Seleccione concepto...</option>
                          {tarifarios.map(t => <option key={t.id} value={t.id}>{t.concepto || t.nombre || `Catálogo #${t.id}`}</option>)}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem', color: '#8b949e' }}>Tarifa Sugerida</label>
                        <select className="form-control" value={detalleDraft.tarifaSugeridaSeleccionada} onChange={handleSugerenciaChange} disabled={tarifasSugeridasActuales.length === 0}>
                          <option value="">{tarifasSugeridasActuales.length === 0 ? 'Sin sugerencias' : 'Ver opciones...'}</option>
                          {tarifasSugeridasActuales.map((tar, i) => <option key={i} value={tar}>${tar}</option>)}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Tarifa Final *</label>
                        <input type="number" step="0.01" className="form-control" value={detalleDraft.tarifa} onChange={(e) => setDetalleDraft(prev => ({ ...prev, tarifa: parseFloat(e.target.value) || 0 }))} />
                      </div>

                      <div className="form-group">
                        <button type="button" className="btn btn-primary" style={{ height: '38px', padding: '0 16px' }} onClick={handleAgregarDetalle}>Guardar Fila</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '6px', overflow: 'hidden' }}>
                  <table className="data-table" style={{ fontSize: '0.85rem' }}>
                    <thead style={{ backgroundColor: '#161b22' }}>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                        <th>TIPO DE CONVENIO</th>
                        <th>TARIFA ACORDADA</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>ACCIÓN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!formData.detalles || formData.detalles.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#8b949e' }}>No hay detalles agregados a este convenio.</td></tr>
                      ) : (
                        formData.detalles.map((det, index) => (
                          <tr key={det.idLocal}>
                            <td style={{ textAlign: 'center', color: '#8b949e' }}>{index + 1}</td>
                            <td style={{ color: '#c9d1d9' }}>{det.tipoConvenioNombre}</td>
                            <td style={{ color: '#f0f6fc', fontWeight: 'bold' }}>${det.tarifa.toFixed(2)}</td>
                            <td style={{ textAlign: 'center' }}><button type="button" onClick={() => handleEliminarDetalle(det.idLocal)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }} title="Quitar">✕</button></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar Convenio'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};