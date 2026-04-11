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

export const FormularioOperacion = ({ estado, initialData, onClose, onMinimize, onRestore }: FormProps) => {
  const [pestañaActiva, setPestañaActiva] = useState<TabType>('general');
  const [cargando, setCargando] = useState(false); 
  const [resolviendoConvenio, setResolviendoConvenio] = useState(false);

  const [listaConvenios, setListaConvenios] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    tipoServicio: '', 
    trafico: '', 
    carga: '', 
    
    fechaServicio: new Date().toISOString().split('T')[0], 
    clientePaga: '', 
    convenio: '', 
    numeroRemolque: '', refCliente: '', origen: '', destino: '', observacionesEjecutivo: '',
    clienteMercancia: '', descripcionMercancia: '', cantidad: 0, embalaje: '', pesoKg: '0.0000', numDoda: '',
    numEntry: '', cantEntrys: 0, numManifiesto: '', provServicios: '',
    proveedorUnidad: '', facturadoEnUnidad: 'Dolares', convenioProveedor: '', tipoCambioUnidad: '17.6770', dolaresUnidad: '100.0000', conversionUnidad: '1,767.7000', unidad: '', operador: '', sueldoOperador: '400', sueldosExtras: '0.00', combustibleGalones: '6', galonesExtras: '0', galonesGastados: '6', puente: '', puenteMonto: '0.00', observacionesGastos: '',
    facturadoEnCobrar: 'Dolares', convenioCobrar: '0', cargosAdicionales: '0.0000', tipoCambioCobrar: '17.6770', dolaresCobrar: '0.0000', conversionCobrar: '0.0000', observacionesCostos: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const cargarConvenios = async () => {
      try {
        const snap = await getDocs(collection(db, 'tarifas_referencia'));
        const convenios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setListaConvenios(convenios);
      } catch (error) {
        console.error("Error al cargar tarifas de referencia:", error);
      }
    };
    cargarConvenios();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ 
        ...prev, 
        ...initialData,
        tipoServicio: initialData.tipoServicio || '',
        trafico: initialData.trafico || '',
        carga: initialData.carga || ''
      }));
    }
  }, [initialData]);

  useEffect(() => {
    const resolverConvenio = async () => {
      if (!formData.convenio) return;
      
      setResolviendoConvenio(true);
      try {
        const tarifaRef = doc(db, 'tarifas_referencia', formData.convenio);
        const tarifaSnap = await getDoc(tarifaRef);

        if (tarifaSnap.exists()) {
          const tarifaData = tarifaSnap.data();
          const cargaDetectada = tarifaData.estado_carga || 'N/A'; 
          const tipoTarifarioId = tarifaData.tipo_operacion; 

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
        console.error("Error resolviendo la lógica del convenio:", error);
      } finally {
        setResolviendoConvenio(false);
      }
    };

    resolverConvenio();
  }, [formData.convenio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipoServicio || formData.tipoServicio === 'N/A') {
      alert("Advertencia: El convenio seleccionado no tiene una configuración válida en los catálogos. No se podrá calcular el flujo de estatus.");
    }

    setCargando(true);
    try {
      const configId = `${formData.tipoServicio}_${formData.trafico}_${formData.carga}`;
      const statusCalculado = await calcularStatusDinamico(configId, formData, initialData?.status);
      
      const convenioDoc = listaConvenios.find(c => c.id === formData.convenio);
      
      const operacionData: Omit<Operacion, 'ref'> = { 
        ...formData, 
        convenioNombre: convenioDoc?.descripcion || 'Sin descripción',
        status: statusCalculado 
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

  return (
    <div className={`modal-overlay ${estado === 'minimizado' ? 'minimized' : ''}`}>
      <div className="form-card" style={{ maxWidth: '1000px' }}> 
        <div className="form-header">
          <h2>{estado === 'minimizado' ? 'Operación en curso...' : (initialData ? `Editar Operación ${initialData.ref}` : 'Nueva Operación')}</h2>
          <div className="header-actions">
            {estado === 'abierto' ? <button type="button" onClick={onMinimize} className="btn-window" title="Minimizar">🗕</button> : <button type="button" onClick={onRestore} className="btn-window restore" title="Restaurar">🗖</button>}
            <button type="button" onClick={onClose} className="btn-window close" title="Cerrar">✕</button>
          </div>
        </div>

        <div style={{ display: estado === 'minimizado' ? 'none' : 'block' }}>
          
          <div className="tabs-container" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <button type="button" className={`tab-button ${pestañaActiva === 'general' ? 'active' : ''}`} onClick={() => setPestañaActiva('general')}>Información General</button>
            <button type="button" className={`tab-button ${pestañaActiva === 'pedimento' ? 'active' : ''}`} onClick={() => setPestañaActiva('pedimento')}>Pedimento y CT</button>
            <button type="button" className={`tab-button ${pestañaActiva === 'manifiesto' ? 'active' : ''}`} onClick={() => setPestañaActiva('manifiesto')}>Entry's y Manifiesto</button>
            <button type="button" className={`tab-button ${pestañaActiva === 'unidad' ? 'active' : ''}`} onClick={() => setPestañaActiva('unidad')}>Unidad y Operador</button>
            <button type="button" className={`tab-button ${pestañaActiva === 'cobrar' ? 'active' : ''}`} onClick={() => setPestañaActiva('cobrar')}>Por Cobrar</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="tab-content" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '12px' }}>
              
              {pestañaActiva === 'general' && (
                <div className="form-grid">
                  
                  <div className="form-group"><label className="form-label">Fecha del Servicio *</label><input type="date" name="fechaServicio" className="form-control" value={formData.fechaServicio} onChange={handleChange} required /></div>
                  <div className="form-group"><label className="form-label">Cliente (Paga) *</label><select name="clientePaga" className="form-control" value={formData.clientePaga} onChange={handleChange} required><option value="">A. Castañeda & CO. Inc.</option></select></div>
                  
                  <div className="form-group">
                    <label className="form-label orange">Convenio (Tarifa) *</label>
                    <select name="convenio" className="form-control" value={formData.convenio} onChange={handleChange} required>
                      <option value="">-- Seleccione un Convenio --</option>
                      {listaConvenios.map(c => (
                        <option key={c.id} value={c.id}>{c.descripcion}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', padding: '12px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>Flujo Detectado:</span>
                      {resolviendoConvenio ? (
                        <span style={{ color: '#D84315', fontSize: '0.9rem' }}>Evaluando catálogos...</span>
                      ) : formData.tipoServicio ? (
                        <span style={{ color: '#58a6ff', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          {formData.tipoServicio} | {formData.trafico} | {formData.carga}
                        </span>
                      ) : (
                        <span style={{ color: '#8b949e', fontStyle: 'italic', fontSize: '0.9rem' }}>Seleccione un convenio para autodetectar</span>
                      )}
                    </div>
                  </div>

                  <div className="form-group"><label className="form-label"># de Remolque</label><select name="numeroRemolque" className="form-control" value={formData.numeroRemolque} onChange={handleChange}><option value="">423 | 5458410</option></select></div>
                  <div className="form-group"><label className="form-label">Ref Cliente</label><input type="text" name="refCliente" className="form-control" value={formData.refCliente} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">Origen</label><input type="text" name="origen" className="form-control" value={formData.origen} onChange={handleChange} placeholder="ROAL..." /></div>
                  <div className="form-group"><label className="form-label">Destino</label><input type="text" name="destino" className="form-control" value={formData.destino} onChange={handleChange} placeholder="AFN..." /></div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Observaciones Ejecutivo</label><input type="text" name="observacionesEjecutivo" className="form-control" value={formData.observacionesEjecutivo} onChange={handleChange} /></div>
                </div>
              )}

              {pestañaActiva === 'pedimento' && (
                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Cliente (Mercancía)</label><select name="clienteMercancia" className="form-control" value={formData.clienteMercancia} onChange={handleChange}><option value="">ACS INTERNACIONAL</option></select></div>
                  <div className="form-group"><label className="form-label">Cantidad</label><input type="number" name="cantidad" className="form-control" value={formData.cantidad} onChange={handleChange} /></div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Descripción</label><input type="text" name="descripcionMercancia" className="form-control" value={formData.descripcionMercancia} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">Embalaje</label><select name="embalaje" className="form-control" value={formData.embalaje} onChange={handleChange}><option value="">Atados</option></select></div>
                  <div className="form-group"><label className="form-label">Peso (Kg)</label><input type="text" name="pesoKg" className="form-control" value={formData.pesoKg} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label"># DODA</label><input type="text" name="numDoda" className="form-control" value={formData.numDoda} onChange={handleChange} /></div>
                </div>
              )}

              {pestañaActiva === 'manifiesto' && (
                <div className="form-grid">
                  <div className="form-group"><label className="form-label"># Entry</label><input type="text" name="numEntry" className="form-control" style={{ border: '1px solid #D84315' }} value={formData.numEntry} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label">Cantidad</label><input type="number" name="cantEntrys" className="form-control" value={formData.cantEntrys} onChange={handleChange} /></div>
                  <div className="form-group"><label className="form-label"># Manifiesto</label><input type="text" name="numManifiesto" className="form-control" value={formData.numManifiesto} onChange={handleChange} /></div>
                </div>
              )}

              {pestañaActiva === 'unidad' && (
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Proveedor</label><select name="proveedorUnidad" className="form-control" value={formData.proveedorUnidad} onChange={handleChange}><option value="">Roelca Dlls</option></select></div>
                  <div className="form-group"><label className="form-label">Unidad</label><input type="text" name="unidad" className="form-control" value={formData.unidad} onChange={handleChange} placeholder="ID Unidad" /></div>
                  <div className="form-group"><label className="form-label">Operador</label><input type="text" name="operador" className="form-control" value={formData.operador} onChange={handleChange} placeholder="Nombre Chofer" /></div>
                  <div className="form-group"><label className="form-label">Sueldo Operador</label><input type="text" name="sueldoOperador" className="form-control" value={`$ ${formData.sueldoOperador}`} onChange={handleChange} /></div>
                </div>
              )}

              {pestañaActiva === 'cobrar' && (
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Facturado en:</label><select name="facturadoEnCobrar" className="form-control" value={formData.facturadoEnCobrar} onChange={handleChange}><option value="Dolares">Dolares</option></select></div>
                </div>
              )}
            </div>

            <div className="form-actions" style={{ marginTop: '16px' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={cargando || resolviendoConvenio}>
                {cargando ? 'Evaluando Reglas...' : resolviendoConvenio ? 'Calculando Flujo...' : (initialData ? 'Guardar Cambios' : 'Guardar Operación')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};