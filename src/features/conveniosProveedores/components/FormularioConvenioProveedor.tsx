// src/features/conveniosProveedores/components/FormularioConvenioProveedor.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro } from '../../../config/firebase';
import type { ConvenioProveedorRecord, ConvenioProveedorDetalle } from '../../../types/convenioProveedor';

interface FormProps {
  estado: 'abierto' | 'minimizado';
  initialData?: ConvenioProveedorRecord | null;
  registrosExistentes: ConvenioProveedorRecord[]; 
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
}

export const FormularioConvenioProveedor = ({ estado, initialData, registrosExistentes, onClose, onMinimize, onRestore }: FormProps) => {
  const todayISO = new Date().toISOString().split('T')[0];

  // --- ESTADO DEL MAESTRO (CONVENIO) ---
  const [formData, setFormData] = useState<ConvenioProveedorRecord>({
    numeroConvenio: '',
    proveedorId: '',
    proveedorNombre: '',
    monedaId: '',
    monedaNombre: '',
    credito: 0,
    fechaConvenio: todayISO,
    fechaVencimiento: todayISO,
    detalles: []
  });

  // --- ESTADO DEL DETALLE (BORRADOR) ---
  const [mostrandoDetalleForm, setMostrandoDetalleForm] = useState(false);
  const [detalleDraft, setDetalleDraft] = useState({
    tipoConvenioId: '',
    tipoConvenioNombre: '',
    tarifaSugeridaSeleccionada: '',
    tarifa: 0
  });

  // --- ESTADOS PARA CATÁLOGOS ---
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [monedas, setMonedas] = useState<any[]>([]);
  const [tarifarios, setTarifarios] = useState<any[]>([]);
  const [tarifasSugeridasActuales, setTarifasSugeridasActuales] = useState<any[]>([]); 
  
  const [cargando, setCargando] = useState(false);

  // Lógica para Autogenerar el # de Convenio (CPRV-001)
  const generarSiguienteConvenio = () => {
    if (registrosExistentes.length === 0) return 'CPRV-001';
    const numeros = registrosExistentes.map(reg => {
      const numStr = reg.numeroConvenio.replace('CPRV-', '');
      const num = parseInt(numStr, 10);
      return isNaN(num) ? 0 : num;
    });
    const maxNum = Math.max(...numeros);
    const nextNum = maxNum + 1;
    return `CPRV-${String(nextNum).padStart(3, '0')}`;
  };

  // Cargar Catálogos al Iniciar
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const empSnapshot = await getDocs(collection(db, 'catalogo_empresas'));
        const todasEmpresas = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Filtrar exclusivamente proveedores de transporte
        const proveedoresFiltrados = todasEmpresas.filter((emp: any) => 
          emp.tipo_empresa === 'Proveedor (Transporte)' || emp.categoria_principal === 'Proveedor (Transporte)'
        );
        setProveedores(proveedoresFiltrados);

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

  // Inicializar Formulario
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(prev => ({ ...prev, numeroConvenio: generarSiguienteConvenio() }));
    }
  }, [initialData, registrosExistentes]);

  // --- MANEJADORES DEL MAESTRO ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProveedorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const prov = proveedores.find(p => p.id === id);
    setFormData(prev => ({ ...prev, proveedorId: id, proveedorNombre: prov ? prov.empresa : '' }));
  };

  const handleMonedaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const moneda = monedas.find(m => m.id === id);
    setFormData(prev => ({ ...prev, monedaId: id, monedaNombre: moneda ? moneda.moneda : '' }));
  };

  // --- MANEJADORES DEL DETALLE (SUBFORMULARIO) ---
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

    const nuevoDetalle: ConvenioProveedorDetalle = {
      idLocal: Date.now().toString(), 
      tipoConvenioId: detalleDraft.tipoConvenioId,
      tipoConvenioNombre: detalleDraft.tipoConvenioNombre,
      tarifa: detalleDraft.tarifa
    };

    setFormData(prev => ({
      ...prev,
      detalles: [...(prev.detalles || []), nuevoDetalle]
    }));

    setDetalleDraft({ tipoConvenioId: '', tipoConvenioNombre: '', tarifaSugeridaSeleccionada: '', tarifa: 0 });
    setTarifasSugeridasActuales([]);
    setMostrandoDetalleForm(false);
  };

  const handleEliminarDetalle = (idLocal: string) => {
    setFormData(prev => ({
      ...prev,
      detalles: prev.detalles.filter(d => d.idLocal !== idLocal)
    }));
  };

  // --- GUARDADO FINAL ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (initialData && initialData.id) {
        await actualizarRegistro('convenios_proveedores', initialData.id, formData);
      } else {
        const correlativoFinal = generarSiguienteConvenio();
        await agregarRegistro('convenios_proveedores', { ...formData, numeroConvenio: correlativoFinal });
      }
      onClose();
    } catch (error) {
      console.error("Error al guardar en Firebase:", error);
      alert('Error al guardar. Revisa tu conexión a internet.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={`modal-overlay ${estado === 'minimizado' ? 'minimized' : ''}`}>
      <div className="form-card" style={{ maxWidth: '850px' }}>
        <div className="form-header">
          <h2>{estado === 'minimizado' ? 'Editando...' : (initialData ? `Editar Convenio` : 'Nuevo Convenio de Proveedor')}</h2>
          <div className="header-actions">
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
            
            {/* --- CABECERA DEL CONVENIO --- */}
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label orange"># de Convenio (Automático)</label>
                <input type="text" className="form-control" value={formData.numeroConvenio} disabled style={{ backgroundColor: '#21262d', color: '#8b949e', cursor: 'not-allowed' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Proveedor *</label>
                <select className="form-control" value={formData.proveedorId} onChange={handleProveedorChange} required>
                  <option value="">Seleccione un proveedor...</option>
                  {proveedores.map(prov => (
                    <option key={prov.id} value={prov.id}>{prov.empresa}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fecha del Convenio *</label>
                <input type="date" name="fechaConvenio" className="form-control" value={formData.fechaConvenio} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Fecha de Vencimiento *</label>
                <input type="date" name="fechaVencimiento" className="form-control" value={formData.fechaVencimiento} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Moneda *</label>
                <select className="form-control" value={formData.monedaId} onChange={handleMonedaChange} required>
                  <option value="">Seleccione moneda...</option>
                  {monedas.map(mon => (
                    <option key={mon.id} value={mon.id}>{mon.moneda}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Crédito (Días) *</label>
                <input type="number" name="credito" className="form-control" value={formData.credito} onChange={(e) => setFormData(prev => ({ ...prev, credito: parseFloat(e.target.value) || 0 }))} required />
              </div>
            </div>

            {/* --- SECCIÓN ENCAPSULADA: LISTA DE DETALLES --- */}
            <div style={{ marginTop: '32px', border: '1px solid #30363d', borderRadius: '8px', padding: '24px', backgroundColor: '#0d1117' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1rem', color: '#f0f6fc', margin: 0, fontWeight: '600' }}>Lista de Detalles</h3>
                
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setMostrandoDetalleForm(!mostrandoDetalleForm)}
                >
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
                        {tarifarios.map(t => (
                          <option key={t.id} value={t.id}>{t.concepto || t.nombre || `Catálogo #${t.id}`}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem', color: '#8b949e' }}>Tarifa Sugerida</label>
                      <select className="form-control" value={detalleDraft.tarifaSugeridaSeleccionada} onChange={handleSugerenciaChange} disabled={tarifasSugeridasActuales.length === 0}>
                        <option value="">{tarifasSugeridasActuales.length === 0 ? 'Sin sugerencias' : 'Ver opciones...'}</option>
                        {tarifasSugeridasActuales.map((tar, i) => (
                          <option key={i} value={tar}>${tar}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Tarifa Final *</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="form-control" 
                        value={detalleDraft.tarifa} 
                        onChange={(e) => setDetalleDraft(prev => ({ ...prev, tarifa: parseFloat(e.target.value) || 0 }))} 
                      />
                    </div>

                    <div className="form-group">
                      <button type="button" className="btn btn-primary" style={{ height: '38px', padding: '0 16px' }} onClick={handleAgregarDetalle}>
                        Guardar Fila
                      </button>
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
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#8b949e' }}>
                          No hay detalles agregados a este convenio.
                        </td>
                      </tr>
                    ) : (
                      formData.detalles.map((det, index) => (
                        <tr key={det.idLocal}>
                          <td style={{ textAlign: 'center', color: '#8b949e' }}>{index + 1}</td>
                          <td style={{ color: '#c9d1d9' }}>{det.tipoConvenioNombre}</td>
                          <td style={{ color: '#f0f6fc', fontWeight: 'bold' }}>${det.tarifa.toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              type="button" 
                              onClick={() => handleEliminarDetalle(det.idLocal)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                              title="Quitar"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={cargando}>
                {cargando ? 'Guardando...' : 'Guardar Convenio'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};