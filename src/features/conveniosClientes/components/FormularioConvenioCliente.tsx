// src/features/conveniosClientes/components/FormularioConvenioCliente.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro } from '../../../config/firebase';
import type { ConvenioClienteRecord, ConvenioDetalle } from '../../../types/convenioCliente';

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

  // Estado del MAESTRO (Convenio)
  const [formData, setFormData] = useState<ConvenioClienteRecord>({
    numeroConvenio: '',
    clienteId: '',
    clienteNombre: '',
    monedaId: '',
    monedaNombre: '',
    credito: 0,
    fechaConvenio: todayISO,
    fechaVencimiento: todayISO,
    detalles: [] // Inicializamos el array de detalles vacío
  });

  // Estado del DETALLE (Borrador del subformulario)
  const [detalleDraft, setDetalleDraft] = useState({
    tipoConvenioId: '',
    tipoConvenioNombre: '',
    tarifaSugeridaSeleccionada: '', // Solo visual, no se guarda en BD
    tarifa: 0
  });

  // Estados para catálogos relacionales
  const [clientes, setClientes] = useState<any[]>([]);
  const [monedas, setMonedas] = useState<any[]>([]);
  const [tarifarios, setTarifarios] = useState<any[]>([]);
  const [tarifasSugeridasActuales, setTarifasSugeridasActuales] = useState<any[]>([]); // Opciones a mostrar según el tarifario elegido
  
  const [cargando, setCargando] = useState(false);

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
        const clientesFiltrados = todasEmpresas.filter((emp: any) => 
          emp.tipo_empresa === 'Cliente (Paga)' || emp.categoria_principal === 'Cliente (Paga)'
        );
        setClientes(clientesFiltrados);

        const monSnapshot = await getDocs(collection(db, 'catalogo_moneda'));
        setMonedas(monSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // CORRECCIÓN: Cargar catálogo de Tarifarios
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

  // Manejadores del Maestro
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

  // --- LÓGICA DEL SUBFORMULARIO (DETALLES) ---

  const handleTipoConvenioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const tarifario = tarifarios.find(t => t.id === id);
    
    // Obtenemos el nombre (asumimos que en BD el campo se llama 'concepto' o 'nombre')
    const nombreTarifario = tarifario ? (tarifario.concepto || tarifario.nombre || 'Desconocido') : '';
    
    // Extraemos las tarifas sugeridas (Asumimos que puede ser un array llamado 'tarifas_sugeridas' o un string)
    let sugerencias: any[] = [];
    if (tarifario) {
      if (Array.isArray(tarifario.tarifas_sugeridas)) {
        sugerencias = tarifario.tarifas_sugeridas;
      } else if (tarifario.tarifa_sugerida) {
        sugerencias = [tarifario.tarifa_sugerida];
      }
    }
    setTarifasSugeridasActuales(sugerencias);

    setDetalleDraft(prev => ({
      ...prev,
      tipoConvenioId: id,
      tipoConvenioNombre: nombreTarifario,
      tarifaSugeridaSeleccionada: '',
      tarifa: 0
    }));
  };

  // Cuando el usuario elige una tarifa de la lista de sugerencias, rellenamos el input editable
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
      idLocal: Date.now().toString(), // Generar un ID único local rápido
      tipoConvenioId: detalleDraft.tipoConvenioId,
      tipoConvenioNombre: detalleDraft.tipoConvenioNombre,
      tarifa: detalleDraft.tarifa
    };

    setFormData(prev => ({
      ...prev,
      detalles: [...(prev.detalles || []), nuevoDetalle]
    }));

    // Limpiar el borrador
    setDetalleDraft({
      tipoConvenioId: '',
      tipoConvenioNombre: '',
      tarifaSugeridaSeleccionada: '',
      tarifa: 0
    });
    setTarifasSugeridasActuales([]);
  };

  const handleEliminarDetalle = (idLocal: string) => {
    setFormData(prev => ({
      ...prev,
      detalles: prev.detalles.filter(d => d.idLocal !== idLocal)
    }));
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
      console.error("Error al guardar en Firebase:", error);
      alert('Error al guardar. Revisa tu conexión a internet.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={`modal-overlay ${estado === 'minimizado' ? 'minimized' : ''}`}>
      <div className="form-card" style={{ maxWidth: '850px' }}> {/* Ligeramente más ancho para la tabla de detalles */}
        <div className="form-header">
          <h2>{estado === 'minimizado' ? 'Editando...' : (initialData ? `Editar Convenio` : 'Nuevo Convenio de Cliente')}</h2>
          <div className="header-actions">
            {estado === 'abierto' ? (
              <button type="button" onClick={onMinimize} className="btn-window">🗕</button>
            ) : (
              <button type="button" onClick={onRestore} className="btn-window restore">🗖</button>
            )}
            <button type="button" onClick={onClose} className="btn-window close">✕</button>
          </div>
        </div>

        <div style={{ display: estado === 'minimizado' ? 'none' : 'block', padding: '10px 0', maxHeight: '75vh', overflowY: 'auto' }}>
          <form onSubmit={handleSubmit}>
            
            {/* --- DATOS CABECERA (MAESTRO) --- */}
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              <div className="form-group">
                <label className="form-label orange"># de Convenio (Automático)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.numeroConvenio} 
                  disabled 
                  style={{ backgroundColor: '#21262d', color: '#8b949e', cursor: 'not-allowed' }} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <select className="form-control" value={formData.clienteId} onChange={handleClienteChange} required>
                  <option value="">Seleccione un cliente...</option>
                  {clientes.map(cli => (
                    <option key={cli.id} value={cli.id}>{cli.empresa}</option>
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
                <input 
                  type="number" 
                  name="credito" 
                  className="form-control" 
                  value={formData.credito} 
                  onChange={(e) => setFormData(prev => ({ ...prev, credito: parseFloat(e.target.value) || 0 }))} 
                  required 
                />
              </div>
            </div>

            {/* --- DATOS DETALLE (SUBFORMULARIO) --- */}
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #30363d' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#f0f6fc', marginBottom: '16px' }}>Detalles del Convenio</h3>
              
              <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Tipo de Convenio (Catálogo Tarifario)</label>
                  <select className="form-control" value={detalleDraft.tipoConvenioId} onChange={handleTipoConvenioChange}>
                    <option value="">Seleccione...</option>
                    {tarifarios.map(t => (
                      <option key={t.id} value={t.id}>{t.concepto || t.nombre || `Catálogo #${t.id}`}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Tarifa Sugerida (Opcional)</label>
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
                  <button type="button" className="btn btn-outline" style={{ height: '38px', borderColor: '#3b82f6', color: '#3b82f6' }} onClick={handleAgregarDetalle}>
                    + Agregar
                  </button>
                </div>
              </div>

              {/* TABLA DE DETALLES AGREGADOS */}
              {formData.detalles && formData.detalles.length > 0 && (
                <div className="table-container" style={{ marginTop: '20px', borderRadius: '4px', border: '1px solid #30363d' }}>
                  <table className="data-table" style={{ fontSize: '0.8rem' }}>
                    <thead style={{ backgroundColor: '#161b22' }}>
                      <tr>
                        <th style={{ padding: '8px 12px' }}>Tipo de Convenio</th>
                        <th style={{ padding: '8px 12px' }}>Tarifa Acordada</th>
                        <th style={{ padding: '8px 12px', width: '50px', textAlign: 'center' }}>X</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.detalles.map((det) => (
                        <tr key={det.idLocal}>
                          <td style={{ padding: '8px 12px', color: '#c9d1d9' }}>{det.tipoConvenioNombre}</td>
                          <td style={{ padding: '8px 12px', color: '#f0f6fc', fontWeight: 'bold' }}>${det.tarifa.toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button 
                              type="button" 
                              onClick={() => handleEliminarDetalle(det.idLocal)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
                              title="Eliminar detalle"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={cargando}>
                {cargando ? 'Guardando...' : 'Guardar Convenio Completo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};