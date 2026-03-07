// src/features/operaciones/components/FormularioOperacion.tsx
import { useState, useEffect } from 'react';
import { guardarOperacionSegura } from '../services/operacionesService';
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

  // Estado consolidado con todos los campos
  const [formData, setFormData] = useState({
    // 1. General
    tipoOperacion: 'Transfer', fechaServicio: new Date().toISOString().split('T')[0], clientePaga: '', convenio: '', numeroRemolque: '', refCliente: '', origen: '', destino: '', observacionesEjecutivo: '',
    // 2. Pedimento
    clienteMercancia: '', descripcionMercancia: '', cantidad: 0, embalaje: '', pesoKg: '0.0000', numDoda: '',
    // 3. Manifiesto
    numEntry: '', cantEntrys: 0, numManifiesto: '', provServicios: '',
    // 4. Unidad y Operador
    proveedorUnidad: '', facturadoEnUnidad: 'Dolares', convenioProveedor: '', tipoCambioUnidad: '17.6770', dolaresUnidad: '100.0000', conversionUnidad: '1,767.7000', unidad: '', operador: '', sueldoOperador: '400', sueldosExtras: '0.00', combustibleGalones: '6', galonesExtras: '0', galonesGastados: '6', puente: '', puenteMonto: '0.00', observacionesGastos: '',
    // 5. Por Cobrar
    facturadoEnCobrar: 'Dolares', convenioCobrar: '0', cargosAdicionales: '0.0000', tipoCambioCobrar: '17.6770', dolaresCobrar: '0.0000', conversionCobrar: '0.0000', observacionesCostos: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const setTipoOperacion = (tipo: string) => setFormData(prev => ({ ...prev, tipoOperacion: tipo }));

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData, tipoOperacion: initialData.tipo || 'Transfer' }));
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const operacionData: Omit<Operacion, 'ref'> = { ...formData, status: initialData ? initialData.status : '1. Nuevo' };
      if (initialData) {
        alert(`Operación actualizada correctamente.`);
      } else {
        await guardarOperacionSegura(operacionData);
        alert('Operación guardada exitosamente');
      }
      onClose();
    } catch (error) {
      alert('Error al guardar la operación.');
    }
  };

  return (
    <div className={`modal-overlay ${estado === 'minimizado' ? 'minimized' : ''}`}>
      <div className="form-card" style={{ maxWidth: '1000px' }}> {/* Suficientemente ancho para 3 columnas cómodas */}
        
        <div className="form-header">
          <h2>
            {estado === 'minimizado' ? 'Operación en curso...' : (initialData ? `Editar Operación ${initialData.ref}` : 'Nueva Operación')}
          </h2>
          <div className="header-actions">
            {estado === 'abierto' ? (
              <button type="button" onClick={onMinimize} className="btn-window" title="Minimizar">🗕</button>
            ) : (
              <button type="button" onClick={onRestore} className="btn-window restore" title="Restaurar">🗖</button>
            )}
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
              
              {/* ================= PESTAÑA 1: GENERAL ================= */}
              {pestañaActiva === 'general' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label orange">Tipo de Operación *</label>
                    <div className="type-selector">
                      {['Transfer', 'Logistica', 'Fletes'].map((tipo) => (
                        <button key={tipo} type="button" onClick={() => setTipoOperacion(tipo)} className={`type-btn ${formData.tipoOperacion === tipo ? 'active' : ''}`}>{tipo}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha del Servicio *</label>
                    <input type="date" name="fechaServicio" className="form-control" value={formData.fechaServicio} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cliente (Paga) *</label>
                    <select name="clientePaga" className="form-control" value={formData.clientePaga} onChange={handleChange} required>
                      <option value="">A. Castañeda & CO. Inc.</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Convenio *</label>
                    <select name="convenio" className="form-control" value={formData.convenio} onChange={handleChange} required>
                      <option value="">Importación Caja Cargada Normal...</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label"># de Remolque</label>
                    <select name="numeroRemolque" className="form-control" value={formData.numeroRemolque} onChange={handleChange}>
                      <option value="">423 | 5458410</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ref Cliente</label>
                    <input type="text" name="refCliente" className="form-control" value={formData.refCliente} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Origen</label>
                    <select name="origen" className="form-control" value={formData.origen} onChange={handleChange}><option value=""></option></select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Destino</label>
                    <select name="destino" className="form-control" value={formData.destino} onChange={handleChange}><option value="">Buscar</option></select>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <label className="form-label">Observaciones Ejecutivo</label>
                    <input type="text" name="observacionesEjecutivo" className="form-control" value={formData.observacionesEjecutivo} onChange={handleChange} />
                  </div>
                </div>
              )}

              {/* ================= PESTAÑA 2: PEDIMENTO Y CT ================= */}
              {pestañaActiva === 'pedimento' && (
                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Cliente (Mercancía)</label>
                    <select name="clienteMercancia" className="form-control" value={formData.clienteMercancia} onChange={handleChange}>
                      <option value="">ACS INTERNACIONAL S DE RL DE CV</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cantidad</label>
                    <input type="number" name="cantidad" className="form-control" value={formData.cantidad} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Descripción de la Mercancía</label>
                    <input type="text" name="descripcionMercancia" className="form-control" value={formData.descripcionMercancia} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Embalaje</label>
                    <select name="embalaje" className="form-control" value={formData.embalaje} onChange={handleChange}>
                      <option value="">Atados</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Peso (Kg)</label>
                    <input type="text" name="pesoKg" className="form-control" value={formData.pesoKg} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label"># DODA</label>
                    <input type="text" name="numDoda" className="form-control" value={formData.numDoda} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    {/* Espacio vacío para alinear */}
                  </div>
                  <div className="form-group">
                    <label className="form-label">PDF - Carta Porte</label>
                    <input type="file" className="form-control" style={{ padding: '6px' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PDF - DODA</label>
                    <input type="file" className="form-control" style={{ padding: '6px' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Otros Documentos</label>
                    <div className="form-control" style={{ textAlign: 'center', cursor: 'pointer', color: '#D84315', fontWeight: 'bold', backgroundColor: '#21262d' }}>+ Nuevo Documento</div>
                  </div>
                </div>
              )}

              {/* ================= PESTAÑA 3: ENTRY'S Y MANIFIESTO ================= */}
              {pestañaActiva === 'manifiesto' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label"># Entry</label>
                    <input type="text" name="numEntry" className="form-control" style={{ border: '1px solid #D84315' }} value={formData.numEntry} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cantidad de Entry's</label>
                    <input type="number" name="cantEntrys" className="form-control" value={formData.cantEntrys} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label"># Manifiesto</label>
                    <input type="text" name="numManifiesto" className="form-control" value={formData.numManifiesto} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Proveedor de Servicios</label>
                    <select name="provServicios" className="form-control" value={formData.provServicios} onChange={handleChange}><option value=""></option></select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">PDF - Manifiesto</label>
                    <input type="file" className="form-control" style={{ padding: '6px' }} />
                  </div>
                </div>
              )}

              {/* ================= PESTAÑA 4: UNIDAD Y OPERADOR ================= */}
              {pestañaActiva === 'unidad' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Proveedor</label>
                    <select name="proveedorUnidad" className="form-control" value={formData.proveedorUnidad} onChange={handleChange}><option value="">Roelca Dlls</option></select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Facturado En</label>
                    <select name="facturadoEnUnidad" className="form-control" value={formData.facturadoEnUnidad} onChange={handleChange}><option value="Dolares">Dolares</option></select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Moneda Convenio</label>
                    <input type="text" className="form-control" value="Dolares" readOnly style={{ backgroundColor: '#010409', color: '#8b949e' }} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <label className="form-label">Convenio Proveedor <span className="orange">*</span></label>
                    <select name="convenioProveedor" className="form-control" value={formData.convenioProveedor} onChange={handleChange}><option value="">Exportación Caja Cargada Normal 24...</option></select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Cambio</label>
                    <input type="text" name="tipoCambioUnidad" className="form-control" value={formData.tipoCambioUnidad} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dólares</label>
                    <input type="text" name="dolaresUnidad" className="form-control" value={formData.dolaresUnidad} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Conversión</label>
                    <input type="text" name="conversionUnidad" className="form-control" value={formData.conversionUnidad} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unidad</label>
                    <select name="unidad" className="form-control" value={formData.unidad} onChange={handleChange}><option value=""></option></select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Operador</label>
                    <select name="operador" className="form-control" value={formData.operador} onChange={handleChange}><option value=""></option></select>
                  </div>
                  <div className="form-group"></div>

                  <div className="form-group">
                    <label className="form-label">Sueldo Operador</label>
                    <input type="text" name="sueldoOperador" className="form-control" value={`$ ${formData.sueldoOperador}`} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sueldos Extras</label>
                    <input type="text" name="sueldosExtras" className="form-control" value={`$ ${formData.sueldosExtras}`} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sueldo Total</label>
                    <input type="text" className="form-control" value="$ 400.00" readOnly style={{ backgroundColor: '#010409', color: '#8b949e' }} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Combustible (Galones)</label>
                    <input type="text" name="combustibleGalones" className="form-control" value={formData.combustibleGalones} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Galones Extras</label>
                    <input type="text" name="galonesExtras" className="form-control" value={formData.galonesExtras} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Galones Gastados</label>
                    <input type="text" name="galonesGastados" className="form-control" value={formData.galonesGastados} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Puente</label>
                    <select name="puente" className="form-control" value={formData.puente} onChange={handleChange}><option value=""></option></select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Puente Monto</label>
                    <input type="text" name="puenteMonto" className="form-control" value={`$ ${formData.puenteMonto}`} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#D84315' }}>Total Gastos</label>
                    <input type="text" className="form-control" value="$ 400.00" readOnly style={{ backgroundColor: '#161b22', fontWeight: 'bold' }} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <label className="form-label">Observaciones (Gastos)</label>
                    <input type="text" name="observacionesGastos" className="form-control" value={formData.observacionesGastos} onChange={handleChange} />
                  </div>
                </div>
              )}

              {/* ================= PESTAÑA 5: POR COBRAR ================= */}
              {pestañaActiva === 'cobrar' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Facturado en:</label>
                    <select name="facturadoEnCobrar" className="form-control" value={formData.facturadoEnCobrar} onChange={handleChange}><option value="Dolares">Dolares</option></select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Moneda Convenio</label>
                    <input type="text" className="form-control" value="Dolares" readOnly style={{ backgroundColor: '#D84315', color: 'white', fontWeight: 'bold' }} />
                  </div>
                  <div className="form-group"></div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Convenio</label>
                    <input type="text" name="convenioCobrar" className="form-control" value={formData.convenioCobrar} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Costo Adicionales</label>
                    <div className="form-control" style={{ textAlign: 'center', cursor: 'pointer', color: '#D84315', fontWeight: 'bold', backgroundColor: '#21262d' }}>+ Nuevo</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cargos Adicionales</label>
                    <input type="text" name="cargosAdicionales" className="form-control" value={formData.cargosAdicionales} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subtotal</label>
                    <input type="text" className="form-control" value="0.0000" readOnly style={{ backgroundColor: '#010409', color: '#8b949e' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Cambio Base</label>
                    <input type="text" className="form-control" value="17.6770" readOnly style={{ backgroundColor: '#010409', color: '#8b949e' }} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tipo de Cambio Aplicado</label>
                    <input type="text" name="tipoCambioCobrar" className="form-control" value={formData.tipoCambioCobrar} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dólares</label>
                    <input type="text" name="dolaresCobrar" className="form-control" value={formData.dolaresCobrar} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Conversión</label>
                    <input type="text" name="conversionCobrar" className="form-control" value={formData.conversionCobrar} onChange={handleChange} />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <label className="form-label" style={{ color: '#f0f6fc', fontWeight: 'bold' }}>UTILIDAD</label>
                    <input type="text" className="form-control" value="-1,767.7000" readOnly style={{ backgroundColor: '#010409', color: '#8b949e' }} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <label className="form-label">Observaciones (Costos)</label>
                    <input type="text" name="observacionesCostos" className="form-control" value={formData.observacionesCostos} onChange={handleChange} />
                  </div>
                </div>
              )}

            </div>

            <div className="form-actions" style={{ marginTop: '16px' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
              <button type="submit" className="btn btn-primary">{initialData ? 'Guardar Cambios' : 'Guardar Operación'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};