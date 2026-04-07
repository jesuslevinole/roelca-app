// src/features/empresas/components/FormularioEmpresa.tsx
import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, onSnapshot, addDoc } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro } from '../../../config/firebase';
import { FormularioDireccion } from '../../direcciones/components/FormularioDireccion'; 
import { registrarLog } from '../../../utils/logger'; 

// =========================================
// SUB-COMPONENTE: SELECTOR MULTIPLE CON CHECKBOXES
// =========================================
const MultiSelectCheckbox: React.FC<{
  options: string[];
  selectedValues: string[];
  onChange: (newValues: string[]) => void;
  placeholder?: string;
}> = ({ options, selectedValues, onChange, placeholder = "Seleccionar..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const displayText = selectedValues.length > 0 
    ? `${selectedValues.length} seleccionado(s)` 
    : placeholder;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="form-control"
        style={{
          cursor: 'pointer', border: isOpen ? '1px solid #3b82f6' : '1px solid #30363d',
          backgroundColor: '#010409', color: selectedValues.length > 0 ? '#c9d1d9' : '#8b949e',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none'
        }}
      >
        <span>{displayText}</span>
        <span style={{ fontSize: '0.8rem' }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '250px', overflowY: 'auto',
          backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '4px', marginTop: '4px',
          padding: '8px 0', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column'
        }}>
          {options.map(opt => (
            <label 
              key={opt} 
              style={{ 
                padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px', 
                cursor: 'pointer', color: '#c9d1d9', fontSize: '0.9rem' 
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#21262d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <input 
                type="checkbox" 
                checked={selectedValues.includes(opt)}
                onChange={() => handleToggle(opt)}
                style={{ accentColor: '#D84315', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};


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
          setTimeout(() => {
            setIsOpen(false);
            const match = options.find(o => o.label.toLowerCase() === searchTerm.toLowerCase());
            if (!match && searchTerm !== selectedLabel) {
               setSearchTerm(selectedLabel);
            }
          }, 200);
        }}
        required={required && !value} 
        style={{
          cursor: 'text', border: isOpen ? '1px solid #3b82f6' : '1px solid #30363d',
          backgroundColor: '#010409', color: '#c9d1d9'
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
      await registrarLog('Catálogos', 'Creación', `Se agregó el régimen fiscal: ${clave} - ${descripcion}`);
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
  const [activeTab, setActiveTab] = useState<'general' | 'fiscal' | 'contacto'>('general');
  
  // CATÁLOGOS BASE DE DATOS
  const [regimenesFiscales, setRegimenesFiscales] = useState<{id: string, label: string}[]>([]);
  const [direccionesDB, setDireccionesDB] = useState<{id: string, label: string}[]>([]);
  const [monedas, setMonedas] = useState<any[]>([]);
  const [tiposFacturas, setTiposFacturas] = useState<any[]>([]);
  
  // NUEVOS CATÁLOGOS PARA LISTAS
  const [catalogoTiposEmpresa, setCatalogoTiposEmpresa] = useState<string[]>([]);
  const [catalogoTiposServicio, setCatalogoTiposServicio] = useState<string[]>([]);

  const [modalDireccionAbierto, setModalDireccionAbierto] = useState(false);
  const [modalRegimenAbierto, setModalRegimenAbierto] = useState(false);

  const [formData, setFormData] = useState({
    numCliente: '',
    nombre: '',
    nombreCorto: '',
    status: 'Activa',
    fechaBaja: '', 
    observacionesBaja: '', 
    tiposEmpresa: [] as string[], // AHORA ES UN ARRAY DE STRINGS
    tiposServicio: [] as string[], // AHORA ES UN ARRAY DE STRINGS
    clienteRelacionadoId: '', 
    clienteRelacionadoNombre: '', 
    rfcTaxId: '',
    fechaUltimoServicio: '',
    
    regimenFiscalId: '',
    regimenFiscalLabel: '',
    moneda: '',
    tipoFactura: '',
    condicionPago: 'Crédito',
    diasCredito: 30,
    limiteCredito: 0.00,

    direccionId: '',
    direccionLabel: '',
    maps: '', 
    telefono: '',
    correo: ''
  });

  useEffect(() => {
    // Suscripciones a Firebase
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

    const unsubFacturas = onSnapshot(collection(db, 'catalogo_tipo_factura'), (snap) => {
      setTiposFacturas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Cargar los catálogos nuevos
    const fetchTiposLists = async () => {
      try {
        const tEmpresas = await getDocs(collection(db, 'catalogo_tipo_empresa'));
        setCatalogoTiposEmpresa(tEmpresas.docs.map(doc => doc.data().tipo).filter(Boolean));

        const tServicios = await getDocs(collection(db, 'catalogo_tipo_servicio'));
        setCatalogoTiposServicio(tServicios.docs.map(doc => doc.data().nombre).filter(Boolean));

        const monedaSnap = await getDocs(collection(db, 'catalogo_moneda'));
        setMonedas(monedaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error cargando catálogos secundarios", error);
      }
    };

    fetchTiposLists();

    return () => {
      unsubRegimenes();
      unsubDirecciones();
      unsubFacturas();
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
      // Normalizar datos legacy (por si antes eran strings y ahora son arrays)
      const data = { ...initialData };
      if (data.tiposEmpresa && !Array.isArray(data.tiposEmpresa)) {
        data.tiposEmpresa = [data.tiposEmpresa];
      } else if (!data.tiposEmpresa) {
        data.tiposEmpresa = [];
      }
      
      // Adaptación especial para el cambio de nombre de tiposServicio a array
      if (data.tiposServicio && !Array.isArray(data.tiposServicio)) {
         // Si era un string antiguo y es un cliente mercancía, lo pasamos al array de Empresas por coherencia
         if(data.tiposServicio === 'Cliente (Mercancía)' || data.tiposServicio === 'Cliente (Paga)') {
           if(!data.tiposEmpresa.includes(data.tiposServicio)){
              data.tiposEmpresa = [...data.tiposEmpresa, data.tiposServicio];
           }
         }
         data.tiposServicio = []; // Lo vaciamos porque ahora servicios es otra cosa
      } else if (!data.tiposServicio) {
        data.tiposServicio = [];
      }

      setFormData(data as any);
    } else {
      setFormData(prev => ({ ...prev, numCliente: generarSiguienteNumCliente() }));
    }
  }, [initialData, registros]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      if (name === 'moneda') newData.tipoFactura = '';

      if (name === 'status' && value !== 'Baja') {
        newData.fechaBaja = '';
        newData.observacionesBaja = '';
      }
      
      return newData;
    });
  };

  // Manejadores específicos para los Multi Selects
  const handleTiposEmpresaChange = (nuevosValores: string[]) => {
    setFormData(prev => {
      const newData = { ...prev, tiposEmpresa: nuevosValores };
      
      // Lógica 1: Si deja de ser Cliente Mercancía, borrar cliente relacionado
      if (!nuevosValores.includes('Cliente (Mercancía)')) {
        newData.clienteRelacionadoId = '';
        newData.clienteRelacionadoNombre = '';
      }

      // Lógica 2: Si deja de ser Proveedor (Servicios), borrar los servicios seleccionados
      if (!nuevosValores.includes('Proveedor (Servicios)')) {
        newData.tiposServicio = [];
      }

      return newData;
    });
  };

  const handleTiposServicioChange = (nuevosValores: string[]) => {
    setFormData(prev => ({ ...prev, tiposServicio: nuevosValores }));
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

    if (!formData.nombre || !formData.rfcTaxId) {
      alert("Faltan campos obligatorios en Información General.");
      setActiveTab('general');
      return;
    }

    if (formData.tiposEmpresa.length === 0) {
      alert("Debes seleccionar al menos un Tipo de Empresa.");
      setActiveTab('general');
      return;
    }

    if (formData.status === 'Baja' && (!formData.fechaBaja || !formData.observacionesBaja)) {
      alert("Si la empresa está dada de Baja, debes especificar la fecha y las observaciones.");
      setActiveTab('general');
      return;
    }

    setCargando(true);
    try {
      if (initialData && initialData.id) {
        await actualizarRegistro('empresas', initialData.id, formData);
        await registrarLog('Empresas', 'Edición', `Actualizó los datos de la empresa: ${formData.nombre}`);
      } else {
        const correlativoFinal = generarSiguienteNumCliente();
        await agregarRegistro('empresas', { ...formData, numCliente: correlativoFinal });
        await registrarLog('Empresas', 'Creación', `Agregó la nueva empresa: ${formData.nombre} (${correlativoFinal})`);
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

  const tiposFacturasFiltrados = tiposFacturas.filter(tf => tf.moneda === formData.moneda);
  
  // Buscar a los clientes que SI tengan 'Cliente (Paga)' dentro de su array de tiposEmpresa
  const clientesPaga = registros.filter(r => Array.isArray(r.tiposEmpresa) && r.tiposEmpresa.includes('Cliente (Paga)'));
  const opcionesClientesPaga = clientesPaga.map(c => ({ id: c.id, label: c.nombre }));

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
            
            <div style={{ display: 'flex', borderBottom: '1px solid #30363d', backgroundColor: '#161b22', padding: '0 24px' }}>
              <button type="button" onClick={() => setActiveTab('general')} style={tabStyle(activeTab === 'general')}>Información General</button>
              <button type="button" onClick={() => setActiveTab('fiscal')} style={tabStyle(activeTab === 'fiscal')}>Comercial / Fiscal</button>
              <button type="button" onClick={() => setActiveTab('contacto')} style={tabStyle(activeTab === 'contacto')}>Contacto</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px', maxHeight: '65vh', overflowY: 'auto' }}>
              
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

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Tipo(s) de Empresa <span style={{ color: '#ff4d4d' }}>*</span></label>
                    <MultiSelectCheckbox 
                      options={catalogoTiposEmpresa} 
                      selectedValues={formData.tiposEmpresa} 
                      onChange={handleTiposEmpresaChange} 
                      placeholder="Seleccionar tipos..."
                    />
                  </div>

                  {formData.tiposEmpresa.includes('Proveedor (Servicios)') && (
                    <div className="form-group" style={{ gridColumn: 'span 2', backgroundColor: 'rgba(216, 67, 21, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(216, 67, 21, 0.2)' }}>
                      <label className="form-label" style={{ color: '#D84315' }}>Servicios que Ofrece (Solo para Proveedores de Servicios)</label>
                      <MultiSelectCheckbox 
                        options={catalogoTiposServicio} 
                        selectedValues={formData.tiposServicio} 
                        onChange={handleTiposServicioChange} 
                        placeholder="Seleccionar servicios..."
                      />
                    </div>
                  )}

                  {formData.tiposEmpresa.includes('Cliente (Mercancía)') && (
                    <div className="form-group" style={{ gridColumn: 'span 2', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                      <label className="form-label" style={{ color: '#58a6ff' }}>Cliente que Paga (Relacionado) *</label>
                      <SearchableSelect 
                        options={opcionesClientesPaga}
                        value={formData.clienteRelacionadoId}
                        onChange={(id, label) => setFormData(prev => ({ ...prev, clienteRelacionadoId: id, clienteRelacionadoNombre: label }))}
                        placeholder="Buscar cliente principal (Cliente Paga)..."
                        required={true}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">RFC / Tax ID <span style={{ color: '#ff4d4d' }}>*</span></label>
                    <input type="text" name="rfcTaxId" className="form-control font-mono" value={formData.rfcTaxId} onChange={handleChange} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
                      <option value="Activa">Activa</option>
                      <option value="Inactiva">Inactiva</option>
                      <option value="Baja">Baja</option>
                    </select>
                  </div>

                  {formData.status === 'Baja' && (
                    <div style={{ gridColumn: 'span 2', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '8px', border: '1px dashed #ef4444', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ color: '#ef4444' }}>Fecha de Baja *</label>
                        <input type="date" name="fechaBaja" className="form-control" value={formData.fechaBaja} onChange={handleChange} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ color: '#ef4444' }}>Observaciones de Baja *</label>
                        <input type="text" name="observacionesBaja" className="form-control" value={formData.observacionesBaja} onChange={handleChange} placeholder="Motivo de la baja..." required />
                      </div>
                    </div>
                  )}
                </div>
              </div>

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
                    <select 
                      name="tipoFactura" 
                      className="form-control" 
                      value={formData.tipoFactura} 
                      onChange={handleChange}
                      disabled={!formData.moneda}
                      style={{ 
                        opacity: formData.moneda ? 1 : 0.5,
                        backgroundColor: '#010409',
                        color: formData.moneda ? '#c9d1d9' : '#8b949e'
                      }}
                    >
                      <option value="">{formData.moneda ? 'Seleccione Tipo de Factura...' : 'Primero seleccione Moneda'}</option>
                      {tiposFacturasFiltrados.map(tf => (
                        <option key={tf.id} value={tf.nombre}>{tf.nombre}</option>
                      ))}
                    </select>
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

              <div style={{ display: activeTab === 'contacto' ? 'block' : 'none', animation: 'fadeIn 0.3s ease' }}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  
                  <div className="form-group" style={{ gridColumn: 'span 2', backgroundColor: '#161b22', padding: '16px', borderRadius: '8px', border: '1px solid #30363d' }}>
                    <label className="form-label" style={{ color: '#58a6ff' }}>Dirección de la Empresa (Buscar en Base de Datos)</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <SearchableSelect 
                          options={direccionesDB}
                          value={formData.direccionId}
                          onChange={(id, label) => setFormData(prev => ({ ...prev, direccionId: id, direccionLabel: label, direccion: label }))}
                          placeholder="Buscar dirección guardada..."
                        />
                      </div>
                      <button type="button" className="btn btn-outline" onClick={() => setModalDireccionAbierto(true)} style={{ height: '38px', whiteSpace: 'nowrap' }}>
                        + Añadir Nueva
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Google Maps (URL)</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input type="url" name="maps" className="form-control" value={formData.maps} onChange={handleChange} placeholder="https://maps.app.goo.gl/..." style={{ flex: 1 }} />
                      {formData.maps && (
                        <a href={formData.maps} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                          Abrir Mapa
                        </a>
                      )}
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

      {modalDireccionAbierto && (
        <div style={{ zIndex: 2000, position: 'relative' }}>
          <FormularioDireccion estado="abierto" onClose={() => setModalDireccionAbierto(false)} />
        </div>
      )}
      
      <ModalNuevoRegimen isOpen={modalRegimenAbierto} onClose={() => setModalRegimenAbierto(false)} />
    </>
  );
};