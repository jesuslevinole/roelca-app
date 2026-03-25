// src/features/empresas/components/FormularioEmpresa.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro } from '../../../config/firebase';

// =========================================
// SUB-COMPONENTE: SELECTOR CON BUSCADOR
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
  
  const selectedLabel = options.find(o => o.id === value)?.label || value || '';

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
          setTimeout(() => setIsOpen(false), 200);
          setSearchTerm(selectedLabel); 
        }}
        required={required && !value} 
        style={{
          cursor: 'text',
          border: isOpen ? '1px solid #3b82f6' : '',
          backgroundColor: '#0d1117'
        }}
      />
      
      {isOpen && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '200px',
          overflowY: 'auto',
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '4px',
          marginTop: '4px',
          padding: '0',
          margin: '4px 0 0 0',
          listStyle: 'none',
          zIndex: 1000,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
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
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: '#c9d1d9',
                  borderBottom: '1px solid #21262d',
                  fontSize: '0.85rem'
                }}
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

interface FormProps {
  estado: 'abierto' | 'minimizado';
  initialData?: any;
  registros: any[]; // <-- Recibimos la lista de empresas para calcular el consecutivo
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
}

export const FormularioEmpresa = ({ estado, initialData, registros, onClose, onMinimize, onRestore }: FormProps) => {
  const [pestañaActiva, setPestañaActiva] = useState<'general' | 'contacto'>('general');

  const [formData, setFormData] = useState({
    numCliente: 'EMP-001', 
    nombre: '', 
    nombreCorto: '', 
    tiposServicio: 'Cliente (Mercancía)', 
    rfcTaxId: '', 
    status: 'Activa', 
    direccion: '', // Guardará el texto de la dirección seleccionada
    direccionId: '', // Guardará el ID de la dirección seleccionada (Opcional, pero buena práctica)
    telefono: '', 
    correo: ''
  });

  const [direccionesDB, setDireccionesDB] = useState<{id: string, label: string}[]>([]);

  // --- CARGAR DIRECCIONES DE FIREBASE ---
  useEffect(() => {
    const cargarDirecciones = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'direcciones'));
        const listaDirecciones = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            label: data.direccionCompleta || 'Dirección sin formato'
          };
        });
        setDireccionesDB(listaDirecciones);
      } catch (error) {
        console.error("Error cargando base de datos de direcciones:", error);
      }
    };
    cargarDirecciones();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- LÓGICA DE AUTO-GENERACIÓN DEL # DE CLIENTE ---
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    } else {
      if (registros && registros.length > 0) {
        const maxNum = registros.reduce((max, emp) => {
          if (emp.numCliente && emp.numCliente.startsWith('EMP-')) {
            const numeroStr = emp.numCliente.replace('EMP-', '');
            const numero = parseInt(numeroStr, 10);
            return !isNaN(numero) && numero > max ? numero : max;
          }
          return max;
        }, 0);

        const nextNum = maxNum + 1;
        const formattedNum = `EMP-${nextNum.toString().padStart(3, '0')}`;
        
        setFormData(prev => ({ ...prev, numCliente: formattedNum }));
      } else {
        setFormData(prev => ({ ...prev, numCliente: 'EMP-001' }));
      }
    }
  }, [initialData, registros]);

  // --- LÓGICA CRUD DE FIREBASE ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (initialData && initialData.id) {
        await actualizarRegistro('empresas', initialData.id, formData);
        alert('Empresa actualizada correctamente.');
      } else {
        await agregarRegistro('empresas', formData);
        alert('Empresa guardada exitosamente.');
      }
      onClose();
    } catch (error) {
      console.error("Error guardando en Firebase:", error);
      alert("Hubo un error al guardar. Verifica tu conexión.");
    }
  };

  return (
    <div className={`modal-overlay ${estado === 'minimizado' ? 'minimized' : ''}`}>
      <div className="form-card" style={{ maxWidth: '800px' }}>
        
        <div className="form-header">
          <h2>{estado === 'minimizado' ? 'Editando Empresa...' : (initialData ? `Editar Empresa ${initialData.numCliente}` : 'Nueva Empresa')}</h2>
          <div className="header-actions">
            {estado === 'abierto' ? <button type="button" onClick={onMinimize} className="btn-window">🗕</button> : <button type="button" onClick={onRestore} className="btn-window restore">🗖</button>}
            <button type="button" onClick={onClose} className="btn-window close">✕</button>
          </div>
        </div>

        <div style={{ display: estado === 'minimizado' ? 'none' : 'block' }}>
          <div className="tabs-container">
            <button type="button" className={`tab-button ${pestañaActiva === 'general' ? 'active' : ''}`} onClick={() => setPestañaActiva('general')}>Información General y Fiscal</button>
            <button type="button" className={`tab-button ${pestañaActiva === 'contacto' ? 'active' : ''}`} onClick={() => setPestañaActiva('contacto')}>Contacto y Dirección</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="tab-content" style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: '10px' }}>
              
              {pestañaActiva === 'general' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label orange"># de Cliente (Automático)</label>
                    <input type="text" name="numCliente" className="form-control" value={formData.numCliente} disabled style={{ backgroundColor: '#21262d', color: '#8b949e', cursor: 'not-allowed' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
                      <option value="Activa">Activa</option>
                      <option value="Inactiva">Inactiva</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Razón Social (Empresa) *</label>
                    <input type="text" name="nombre" className="form-control" value={formData.nombre} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre Corto</label>
                    <input type="text" name="nombreCorto" className="form-control" value={formData.nombreCorto} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Tipo de Servicios (Categoría Principal) *</label>
                    <select name="tiposServicio" className="form-control" value={formData.tiposServicio} onChange={handleChange} required>
                      <option value="Proveedor (Servicios)">Proveedor (Servicios)</option>
                      <option value="Cliente (Mercancía)">Cliente (Mercancía)</option>
                      <option value="Propietario (Remolques)">Propietario (Remolques)</option>
                      <option value="Bodega">Bódega</option>
                      <option value="Cliente (Paga)">Cliente (Paga)</option>
                      <option value="Proveedor (Transporte)">Proveedor (Transporte)</option>
                      <option value="Empresas Roelca">Empresas Roelca</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">RFC / Tax Id</label>
                    <input type="text" name="rfcTaxId" className="form-control" value={formData.rfcTaxId} onChange={handleChange} />
                  </div>
                </div>
              )}

              {pestañaActiva === 'contacto' && (
                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <label className="form-label">Dirección Completa (Seleccionar de Base de Datos)</label>
                    {/* SE REEMPLAZÓ EL INPUT DE TEXTO LIBRE POR EL BUSCADOR DE DIRECCIONES */}
                    <SearchableSelect 
                      options={direccionesDB}
                      value={formData.direccionId || ''}
                      onChange={(id, label) => setFormData(prev => ({ ...prev, direccionId: id, direccion: label }))}
                      placeholder="Buscar dirección registrada..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono Principal</label>
                    <input type="text" name="telefono" className="form-control" value={formData.telefono} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Correo Electrónico</label>
                    <input type="email" name="correo" className="form-control" value={formData.correo} onChange={handleChange} />
                  </div>
                </div>
              )}

            </div>

            <div className="form-actions" style={{ marginTop: '16px' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
              <button type="submit" className="btn btn-primary">{initialData ? 'Guardar Cambios' : 'Guardar Empresa'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};