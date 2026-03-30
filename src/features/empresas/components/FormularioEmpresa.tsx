// src/features/empresas/components/FormularioEmpresa.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, onSnapshot, addDoc } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro } from '../../../config/firebase';
import { FormularioDireccion } from '../../direcciones/components/FormularioDireccion'; 

// =========================================
// SUB-COMPONENTE: SELECTOR CON BUSCADOR ESTRICTO
// =========================================
const SearchableSelect: React.FC<{
  options: { id: string, label: string }[];
  value: string;
  onChange: (id: string, label: string) => void;
  placeholder?: string;
  required?: boolean;
}> = ({ options, value, onChange, placeholder = "Buscar...", required = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedLabel = options.find(o => o.id === value)?.label || '';

  useEffect(() => {
    setSearchTerm(selectedLabel);
  }, [value, selectedLabel]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className="form-control"
        placeholder={placeholder}
        value={isOpen ? searchTerm : selectedLabel}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setSearchTerm(''); 
          setIsOpen(true);
        }}
        onBlur={() => {
          // Timeout para permitir el clic en la lista
          setTimeout(() => {
            setIsOpen(false);
            // LÓGICA ESTRICTA: Si no seleccionó nada válido, revertimos al label guardado o limpiamos
            const match = options.find(o => o.label.toLowerCase() === searchTerm.toLowerCase());
            if (!match && searchTerm !== selectedLabel) {
               setSearchTerm(selectedLabel);
            }
          }, 200);
        }}
        required={required && !value} 
        style={{
          cursor: 'text',
          border: isOpen ? '1px solid #3b82f6' : '1px solid #30363d',
          backgroundColor: '#010409',
          color: '#c9d1d9'
        }}
      />
      
      {isOpen && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto',
          backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '4px', marginTop: '4px',
          padding: '0', margin: '4px 0 0 0', listStyle: 'none', zIndex: 1000, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)'
        }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <li
                key={opt.id}
                onClick={() => {
                  onChange(opt.id, opt.label);
                  setSearchTerm(opt.label);
                  setIsOpen(false);
                }}
                style={{ padding: '8px 12px', cursor: 'pointer', color: '#c9d1d9', borderBottom: '1px solid #21262d', fontSize: '0.85rem' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#21262d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {opt.label}
              </li>
            ))
          ) : (
            <li style={{ padding: '8px 12px', color: '#8b949e', fontSize: '0.85rem', textAlign: 'center' }}>
              No se encontraron coincidencias
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

// =========================================
// SUB-COMPONENTE: MODAL NUEVO RÉGIMEN FISCAL
// =========================================
const ModalNuevoRegimen: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [clave, setClave] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await addDoc(collection(db, 'catalogo_regimen_fiscal'), { clave, descripcion });
      onClose();
    } catch (error) {
      alert("Error al guardar el régimen fiscal.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', zIndex: 2000 }}>
      <div className="form-card" style={{ maxWidth: '400px', backgroundColor: '#0d1117', border: '1px solid #444', borderRadius: '12px' }}>
        <div className="form-header" style={{ padding: '20px', borderBottom: '1px solid #30363d' }}>
          <h3 style={{ margin: 0, color: '#f0f6fc', fontSize: '1.1rem' }}>Nuevo Régimen Fiscal</h3>
          <button onClick={onClose} className="close-x" style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div className="form-group">
            <label className="form-label">Clave (Ej. 601) *</label>
            <input type="text" className="form-control" value={clave} onChange={e => setClave(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción *</label>
            <input type="text" className="form-control" value={descripcion} onChange={e => setDescripcion(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
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
  
  // ESTADO PARA LAS PESTAÑAS (Ahora son 3)
  const [activeTab, setActiveTab] = useState<'general' | 'fiscal' | 'contacto'>('general');
  
  // ESTADOS DE LOS CATÁLOGOS Y MODALES
  const [regimenesFiscales, setRegimenesFiscales] = useState<{id: string, label: string}[]>([]);
  const [direccionesDB, setDireccionesDB] = useState<{id: string, label: string}[]>([]);
  const [monedas, setMonedas] = useState<any[]>([]);
  
  const [modalDireccionAbierto, setModalDireccionAbierto] = useState(false);
  const [modalRegimenAbierto, setModalRegimenAbierto] = useState(false);

  const [formData, setFormData] = useState({
    numCliente: '',
    nombre: '',
    nombreCorto: '',
    status: 'Activa',
    tiposServicio: 'Cliente (Paga)',
    rfcTaxId: '',
    fechaUltimoServicio: '',
    
    // --- FISCAL ---
    regimenFiscalId: '',
    regimenFiscalLabel: '',
    moneda: '',
    tipoFactura: '',
    condicionPago: 'Crédito',
    diasCredito: 30,
    limiteCredito: 0.00,

    // --- CONTACTO ---
    direccionId: '',
    direccionLabel: '',
    telefono: '',
    correo: ''
  });

  // --- Cargar Catálogos de Firebase en Tiempo Real ---
  useEffect(() => {
    const unsubRegimenes = onSnapshot(collection(db, 'catalogo_regimen_fiscal'), (snap) => {
      setRegimenesFiscales(snap.docs.map(doc => {
        const d = doc.data();
        return { id: doc.id, label: `${d.clave} - ${d.descripcion}` };
      }));
    });

    const unsubDirecciones = onSnapshot(collection(db, 'direcciones'), (snap) => {
      setDireccionesDB(snap.docs.map(doc => {
        const d = doc.data();
        return { id: doc.id, label: d.direccionCompleta || 'Dirección sin formato' };
      }));
    });

    const fetchMonedas = async () => {
      const monedaSnap = await getDocs(collection(db, 'catalogo_moneda'));
      setMonedas(monedaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchMonedas();

    return () => {
      unsubRegimenes();
      unsubDirecciones();
    };
  }, []);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCondicionPagoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      condicionPago: value,
      diasCredito: value === 'Contado' ? 0 : prev.diasCredito,
      limiteCredito: value === 'Contado' ? 0 : prev.limiteCredito
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar requeridos visualmente saltando a la pestaña
    if (!formData.nombre || !formData.rfcTaxId) {
      alert("Faltan campos obligatorios en Información General.");
      setActiveTab('general');
      return;
    }

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

  const tabStyle = (isActive: boolean) => ({
    padding: '12px 20px', background: 'none', border: 'none',
    borderBottom: isActive ? '2px solid #D84315' : '2px solid transparent',
    color: isActive ? '#f0f6fc' : '#8b949e', cursor: 'pointer',
    fontWeight: isActive ? '600' : 'normal', fontSize: '0.9rem',
    transition: 'all 0.2s ease', outline: 'none'
  });

  return (
    <>
      <div className={`modal-overlay ${estado === 'minimizado' ? 'minimized' : ''}`}>
        <div className="form-card" style={{ maxWidth: '850px', backgroundColor: '#0d1117', border: '1px solid #444', borderRadius: '12px' }}>
          
          <div className="form-header" style={{ padding: '24px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '500', margin: 0, color: '#f0f6fc' }}>
              {estado === 'minimizado' ? 'Editando...' : (initialData ? `Editar Empresa` : 'Nueva Empresa')}
            </h2>
            <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {estado === 'abierto' ? (
                <button type="button" onClick={onMinimize} className="btn-window">🗕</button>
              ) : (
                <button type="button" onClick={onRestore} className="btn-window restore">🗖</button>
              )}
              <button type="button" onClick={onClose} className="btn-window close">✕</button>
            </div>
          </div>

          <div style={{ display: estado === 'minimizado' ? 'none' : 'block' }}>
            
            {/* NAVEGACIÓN DE PESTAÑAS (3 Tabs) */}
            <div style={{ display: 'flex', borderBottom: '1px solid #30363d', backgroundColor: '#161b22', padding: '0 24px' }}>
              <button type="button" onClick={() => setActiveTab('general')} style={tabStyle(activeTab === 'general')}>
                Información General
              </button>
              <button type="button" onClick={() => setActiveTab('fiscal')} style={tabStyle(activeTab === 'fiscal')}>
                Comercial / Fiscal
              </button>
              <button type="button" onClick={() => setActiveTab('contacto')} style={tabStyle(activeTab === 'contacto')}>
                Contacto
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px', maxHeight: '65vh', overflowY: 'auto' }}>
              
              {/* --- PESTAÑA 1: INFORMACIÓN GENERAL --- */}
              <div style={{ display: activeTab === 'general' ? 'block' : 'none', animation: 'fadeIn 0.3s ease' }}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label orange"># de Empresa (Automático)</label>
                    <input type="text" className="form-control" value={formData.numCliente} disabled style={{ backgroundColor: '#21262d', color: '#8b949e', cursor: 'not-allowed', width: '150px', textAlign: 'center', fontWeight: 'bold' }} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Razón Social <span style={{ color: '#ff4d4d' }}>*</span></label>
                    <input type="text" name="nombre" className="form-control" value={formData.nombre} onChange={handleChange} required />
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
                    <label className="form-label">Tipo de Servicios <span style={{ color: '#ff4d4d' }}>*</span></label>
                    <select name="tiposServicio" className="form-control" value={formData.tiposServicio} onChange={handleChange} required>
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
                    <label className="form-label">RFC / Tax ID <span style={{ color: '#ff4d4d' }}>*</span></label>
                    <input type="text" name="rfcTaxId" className="form-control font-mono" value={formData.rfcTaxId} onChange={handleChange} required />
                  </div>
                </div>
              </div>

              {/* --- PESTAÑA 2: INFORMACIÓN FISCAL Y COMERCIAL --- */}
              <div style={{ display: activeTab === 'fiscal' ? 'block' : 'none', animation: 'fadeIn 0.3s ease' }}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  
                  <div className="form-group" style={{ gridColumn: 'span 2', backgroundColor: '#161b22', padding: '16px', borderRadius: '8px', border: '1px solid #30363d' }}>
                    <label className="form-label" style={{ color: '#58a6ff' }}>Régimen Fiscal (Buscar en Catálogo)</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <SearchableSelect 
                          options={regimenesFiscales}
                          value={formData.regimenFiscalId}
                          onChange={(id, label) => setFormData(prev => ({ ...prev, regimenFiscalId: id, regimenFiscalLabel: label }))}
                          placeholder="Buscar Régimen Fiscal..."
                        />
                      </div>
                      <button type="button" className="btn btn-outline" onClick={() => setModalRegimenAbierto(true)} style={{ height: '38px', whiteSpace: 'nowrap' }}>
                        + Nuevo
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Moneda</label>
                    <select name="moneda" className="form-control" value={formData.moneda} onChange={handleChange}>
                      <option value="">Seleccione Moneda...</option>
                      {monedas.map(mon => (
                        <option key={mon.id} value={mon.moneda}>{mon.moneda}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tipo de Factura</label>
                    <input type="text" name="tipoFactura" className="form-control" value={formData.tipoFactura} onChange={handleChange} placeholder="Ej. Factura Fiscal | Pesos" />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ color: '#58a6ff' }}>Crédito / Contado</label>
                    <select name="condicionPago" className="form-control" value={formData.condicionPago} onChange={handleCondicionPagoChange}>
                      <option value="Crédito">Crédito</option>
                      <option value="Contado">Contado</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ color: formData.condicionPago === 'Contado' ? '#484f58' : '#c9d1d9' }}>Días de Crédito</label>
                    <input type="number" name="diasCredito" className="form-control" value={formData.diasCredito} onChange={(e) => setFormData(prev => ({ ...prev, diasCredito: parseInt(e.target.value) || 0 }))} disabled={formData.condicionPago === 'Contado'} style={{ opacity: formData.condicionPago === 'Contado' ? 0.5 : 1 }} />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ color: formData.condicionPago === 'Contado' ? '#484f58' : '#c9d1d9' }}>Límite de Crédito ($)</label>
                    <input type="number" step="0.01" name="limiteCredito" className="form-control" value={formData.limiteCredito} onChange={(e) => setFormData(prev => ({ ...prev, limiteCredito: parseFloat(e.target.value) || 0 }))} disabled={formData.condicionPago === 'Contado'} style={{ opacity: formData.condicionPago === 'Contado' ? 0.5 : 1 }} />
                  </div>
                </div>
              </div>

              {/* --- PESTAÑA 3: CONTACTO Y DIRECCIÓN --- */}
              <div style={{ display: activeTab === 'contacto' ? 'block' : 'none', animation: 'fadeIn 0.3s ease' }}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  
                  <div className="form-group" style={{ gridColumn: 'span 2', backgroundColor: '#161b22', padding: '16px', borderRadius: '8px', border: '1px solid #30363d' }}>
                    <label className="form-label" style={{ color: '#58a6ff' }}>Dirección de la Empresa (Buscar en Base de Datos)</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <SearchableSelect 
                          options={direccionesDB}
                          value={formData.direccionId}
                          onChange={(id, label) => setFormData(prev => ({ ...prev, direccionId: id, direccionLabel: label, direccion: label }))} // Guardamos tambien en 'direccion' por retrocompatibilidad
                          placeholder="Buscar dirección guardada..."
                        />
                      </div>
                      <button type="button" className="btn btn-outline" onClick={() => setModalDireccionAbierto(true)} style={{ height: '38px', whiteSpace: 'nowrap' }}>
                        + Añadir Nueva
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Teléfono de Contacto</label>
                    <input type="tel" name="telefono" className="form-control" value={formData.telefono} onChange={handleChange} placeholder="Ej. 555-123-4567" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input type="email" name="correo" className="form-control" value={formData.correo} onChange={handleChange} placeholder="contacto@empresa.com" />
                  </div>

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

      {/* RENDERIZADO DE MODALES DE APOYO */}
      {modalDireccionAbierto && (
        <div style={{ zIndex: 2000, position: 'relative' }}>
          <FormularioDireccion estado="abierto" onClose={() => setModalDireccionAbierto(false)} />
        </div>
      )}
      
      <ModalNuevoRegimen isOpen={modalRegimenAbierto} onClose={() => setModalRegimenAbierto(false)} />
    </>
  );
};