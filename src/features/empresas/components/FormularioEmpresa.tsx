// src/features/empresas/components/FormularioEmpresa.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro } from '../../../config/firebase';

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

// =========================================
// COMPONENTE PRINCIPAL
// =========================================
interface FormProps {
  estado: 'abierto' | 'minimizado';
  initialData?: any | null;
  registros: any[];
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
}

export const FormularioEmpresa: React.FC<FormProps> = ({ estado, initialData, registros, onClose, onMinimize, onRestore }) => {
  const [cargando, setCargando] = useState(false);
  
  // Catálogos para los nuevos campos fiscales
  const [regimenesFiscales, setRegimenesFiscales] = useState<any[]>([]);
  const [monedas, setMonedas] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    numCliente: '',
    nombre: '',
    nombreCorto: '',
    status: 'Activa',
    tiposServicio: 'Cliente (Paga)',
    rfcTaxId: '',
    fechaUltimoServicio: '',
    direccion: '',
    telefono: '',
    correo: '',
    // --- NUEVOS CAMPOS ---
    regimenFiscal: '',
    moneda: '',
    tipoFactura: '',
    condicionPago: 'Crédito',
    diasCredito: 30,
    limiteCredito: 0.00
  });

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  
  const configuracionCampos = [
    { name: 'nombre', label: 'Razón Social' },
    { name: 'tiposServicio', label: 'Tipo de Servicio' },
    { name: 'rfcTaxId', label: 'RFC / Tax ID' },
    { name: 'regimenFiscal', label: 'Régimen Fiscal' },
    { name: 'moneda', label: 'Moneda' }
  ];

  // --- Cargar Configuración y Catálogos ---
  useEffect(() => {
    // Configuración de campos obligatorios
    const savedConfig = localStorage.getItem('formConfig_empresa');
    if (savedConfig) {
      setRequiredFields(JSON.parse(savedConfig));
    } else {
      setRequiredFields(['nombre', 'tiposServicio', 'rfcTaxId']);
    }

    // Cargar Catálogos de Firebase
    const fetchCatalogos = async () => {
      try {
        const regimenSnap = await getDocs(collection(db, 'catalogo_regimen_fiscal'));
        setRegimenesFiscales(regimenSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const monedaSnap = await getDocs(collection(db, 'catalogo_moneda'));
        setMonedas(monedaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error al cargar catálogos:", error);
      }
    };

    fetchCatalogos();
  }, []);

  const toggleRequired = (fieldName: string) => {
    const newRequired = requiredFields.includes(fieldName)
      ? requiredFields.filter(f => f !== fieldName)
      : [...requiredFields, fieldName];
    setRequiredFields(newRequired);
    localStorage.setItem('formConfig_empresa', JSON.stringify(newRequired));
  };

  const isRequired = (fieldName: string) => requiredFields.includes(fieldName);

  const generarSiguienteNumCliente = () => {
    if (registros.length === 0) return 'EMP-001';
    const numeros = registros.map(reg => {
      const numStr = (reg.numCliente || '').replace('EMP-', '');
      const num = parseInt(numStr, 10);
      return isNaN(num) ? 0 : num;
    });
    const maxNum = Math.max(...numeros);
    return `EMP-${String(maxNum + 1).padStart(3, '0')}`;
  };

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(prev => ({ ...prev, numCliente: generarSiguienteNumCliente() }));
    }
  }, [initialData, registros]);

  // Manejo de cambios estándar
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Manejo dinámico para Crédito/Contado
  const handleCondicionPagoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      condicionPago: value,
      // Si es de Contado, bloqueamos a 0 los días y límite de crédito
      diasCredito: value === 'Contado' ? 0 : prev.diasCredito,
      limiteCredito: value === 'Contado' ? 0 : prev.limiteCredito
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (initialData && initialData.id) {
        await actualizarRegistro('empresas', initialData.id, formData);
      } else {
        const correlativoFinal = generarSiguienteNumCliente();
        await agregarRegistro('empresas', { ...formData, numCliente: correlativoFinal });
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
        <div className="form-card" style={{ maxWidth: '850px', backgroundColor: '#0d1117', border: '1px solid #444', borderRadius: '12px' }}>
          
          <div className="form-header" style={{ padding: '24px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '500', margin: 0, color: '#f0f6fc' }}>
              {estado === 'minimizado' ? 'Editando...' : (initialData ? `Editar Empresa` : 'Nueva Empresa')}
            </h2>
            <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {estado === 'abierto' && (
                <button type="button" onClick={() => setIsConfigOpen(true)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer' }} title="Configurar campos obligatorios">
                  ⚙️
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

          <div style={{ display: estado === 'minimizado' ? 'none' : 'block', padding: '10px 0', maxHeight: '75vh', overflowY: 'auto' }}>
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              
              {/* --- SECCIÓN: INFORMACIÓN GENERAL --- */}
              <h3 style={{ color: '#8b949e', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #30363d', paddingBottom: '8px', marginBottom: '20px' }}>
                Información General
              </h3>
              
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label orange"># de Empresa (Automático)</label>
                  <input type="text" className="form-control" value={formData.numCliente} disabled style={{ backgroundColor: '#21262d', color: '#8b949e', cursor: 'not-allowed', width: '150px', textAlign: 'center', fontWeight: 'bold' }} />
                </div>

                <div className="form-group">
                  <label className="form-label">Razón Social {isRequired('nombre') && <span style={{ color: '#ff4d4d' }}>*</span>}</label>
                  <input type="text" name="nombre" className="form-control" value={formData.nombre} onChange={handleChange} required={isRequired('nombre')} />
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre Corto / Alias</label>
                  <input type="text" name="nombreCorto" className="form-control" value={formData.nombreCorto} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
                    <option value="Activa">Activa</option>
                    <option value="Inactiva">Inactiva</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Servicios {isRequired('tiposServicio') && <span style={{ color: '#ff4d4d' }}>*</span>}</label>
                  <select name="tiposServicio" className="form-control" value={formData.tiposServicio} onChange={handleChange} required={isRequired('tiposServicio')}>
                    <option value="Cliente (Paga)">Cliente (Paga)</option>
                    <option value="Proveedor (Transporte)">Proveedor (Transporte)</option>
                    <option value="Proveedor (Servicios)">Proveedor (Servicios)</option>
                    <option value="Cliente (Mercancía)">Cliente (Mercancía)</option>
                    <option value="Propietario (Remolques)">Propietario (Remolques)</option>
                    <option value="Bodega">Bodega</option>
                    <option value="Empresas Roelca">Empresas Roelca</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">RFC / Tax ID {isRequired('rfcTaxId') && <span style={{ color: '#ff4d4d' }}>*</span>}</label>
                  <input type="text" name="rfcTaxId" className="form-control font-mono" value={formData.rfcTaxId} onChange={handleChange} required={isRequired('rfcTaxId')} />
                </div>

                <div className="form-group">
                  <label className="form-label">Dirección Completa</label>
                  <input type="text" name="direccion" className="form-control" value={formData.direccion} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input type="tel" name="telefono" className="form-control" value={formData.telefono} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input type="email" name="correo" className="form-control" value={formData.correo} onChange={handleChange} />
                </div>
              </div>

              {/* --- SECCIÓN: INFORMACIÓN FISCAL Y COMERCIAL --- */}
              <h3 style={{ color: '#8b949e', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #30363d', paddingBottom: '8px', marginBottom: '20px' }}>
                Información Fiscal y Comercial
              </h3>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Régimen Fiscal {isRequired('regimenFiscal') && <span style={{ color: '#ff4d4d' }}>*</span>}</label>
                  <select name="regimenFiscal" className="form-control" value={formData.regimenFiscal} onChange={handleChange} required={isRequired('regimenFiscal')}>
                    <option value="">Seleccione Régimen Fiscal...</option>
                    {regimenesFiscales.map(reg => (
                      <option key={reg.id} value={`${reg.clave} - ${reg.descripcion}`}>
                        {reg.clave} - {reg.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Moneda {isRequired('moneda') && <span style={{ color: '#ff4d4d' }}>*</span>}</label>
                  <select name="moneda" className="form-control" value={formData.moneda} onChange={handleChange} required={isRequired('moneda')}>
                    <option value="">Seleccione Moneda...</option>
                    {monedas.map(mon => (
                      <option key={mon.id} value={mon.moneda}>{mon.moneda}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Factura</label>
                  <input 
                    type="text" 
                    name="tipoFactura" 
                    className="form-control" 
                    value={formData.tipoFactura} 
                    onChange={handleChange} 
                    placeholder="Ej. Factura Fiscal | Pesos" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#58a6ff' }}>Crédito / Contado</label>
                  <select name="condicionPago" className="form-control" value={formData.condicionPago} onChange={handleCondicionPagoChange}>
                    <option value="Crédito">Crédito</option>
                    <option value="Contado">Contado</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: formData.condicionPago === 'Contado' ? '#484f58' : '#c9d1d9' }}>
                    Días de Crédito
                  </label>
                  <input 
                    type="number" 
                    name="diasCredito" 
                    className="form-control" 
                    value={formData.diasCredito} 
                    onChange={(e) => setFormData(prev => ({ ...prev, diasCredito: parseInt(e.target.value) || 0 }))} 
                    disabled={formData.condicionPago === 'Contado'}
                    style={{ opacity: formData.condicionPago === 'Contado' ? 0.5 : 1 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: formData.condicionPago === 'Contado' ? '#484f58' : '#c9d1d9' }}>
                    Límite de Crédito ($)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    name="limiteCredito" 
                    className="form-control" 
                    value={formData.limiteCredito} 
                    onChange={(e) => setFormData(prev => ({ ...prev, limiteCredito: parseFloat(e.target.value) || 0 }))} 
                    disabled={formData.condicionPago === 'Contado'}
                    style={{ opacity: formData.condicionPago === 'Contado' ? 0.5 : 1 }}
                  />
                </div>

              </div>

              {/* --- ACCIONES --- */}
              <div className="form-actions" style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid #30363d', paddingTop: '24px' }}>
                <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={cargando}>
                  {cargando ? 'Guardando...' : 'Guardar Empresa'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </>
  );
};