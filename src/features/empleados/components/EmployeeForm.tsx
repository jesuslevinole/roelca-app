// src/features/empleados/components/EmployeeForm.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { guardarEmpleadoConTransaccion } from '../../../services/employeeService';
import { FormularioDireccion } from '../../direcciones/components/FormularioDireccion';
import type { Employee } from '../../../types/empleado';

// =========================================
// SUB-COMPONENTE: SELECTOR CON BUSCADOR
// =========================================
const SearchableSelect: React.FC<{
  options: { id: string, label: string }[];
  value: string;
  onChange: (id: string, label: string) => void;
  placeholder?: string;
}> = ({ options, value, onChange, placeholder = "Buscar..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectedLabel = options.find(o => o.id === value)?.label || '';

  useEffect(() => { setSearchTerm(selectedLabel); }, [value, selectedLabel]);

  const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className="form-control"
        placeholder={placeholder}
        value={isOpen ? searchTerm : selectedLabel}
        onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
        onFocus={() => { setSearchTerm(''); setIsOpen(true); }}
        onBlur={() => { setTimeout(() => setIsOpen(false), 200); setSearchTerm(selectedLabel); }}
        style={{ backgroundColor: '#010409', border: isOpen ? '1px solid #3b82f6' : '1px solid #30363d', color: '#c9d1d9' }}
      />
      {isOpen && (
        <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '4px', marginTop: '4px', padding: 0, listStyle: 'none', zIndex: 1000 }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <li key={opt.id} onClick={() => { onChange(opt.id, opt.label); setSearchTerm(opt.label); setIsOpen(false); }} style={{ padding: '8px 12px', cursor: 'pointer', color: '#c9d1d9', borderBottom: '1px solid #21262d', fontSize: '0.85rem' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#21262d'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                {opt.label}
              </li>
            ))
          ) : (
            <li style={{ padding: '8px 12px', color: '#8b949e', fontSize: '0.85rem', textAlign: 'center' }}>No se encontraron direcciones</li>
          )}
        </ul>
      )}
    </div>
  );
};

interface Props {
  estado: 'abierto' | 'minimizado';
  initialData?: Employee | null;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
}

export const EmployeeForm: React.FC<Props> = ({ estado, initialData, onClose, onMinimize, onRestore }) => {
  const estadoInicial: Employee = {
    employeeId: 'Autogenerado',
    firstName: '', lastNamePaternal: '', lastNameMaternal: '', alias: '',
    rfc: '', birthDate: '', addressId: '', addressLabel: '',
    personalPhone: '', personalEmail: '', emergencyContactName: '', emergencyContactPhone: ''
  };

  const [formData, setFormData] = useState<Employee>(estadoInicial);
  const [direccionesDB, setDireccionesDB] = useState<{id: string, label: string}[]>([]);
  const [modalDireccionAbierto, setModalDireccionAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Extraer las direcciones de Firestore para el Autocomplete
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'direcciones'), (snapshot) => {
      const lista = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, label: data.direccionCompleta || 'Dirección sin formato' };
      });
      setDireccionesDB(lista);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  // Manejo de inputs. Se fuerza el RFC a mayúsculas.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'rfc' ? value.toUpperCase() : value 
    }));
  };

  // Función para obtener la fecha legible estrictamente en Español
  const fechaFormateadaEsp = () => {
    if (!formData.birthDate) return 'No definida';
    const dateObj = new Date(formData.birthDate + 'T00:00:00');
    return dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Redirección hacia Google Maps con la URL requerida
  const abrirGoogleMaps = () => {
    if (!formData.addressLabel) {
      alert("Seleccione una dirección primero.");
      return;
    }
    const query = encodeURIComponent(formData.addressLabel);
    const url = `https://www.google.com/maps/search/?api=1&query=[DIRECCION_URL_ENCODED]?q=${query}`;
    window.open(url, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.addressId) {
      alert("La dirección es obligatoria.");
      return;
    }
    
    setCargando(true);
    try {
      await guardarEmpleadoConTransaccion(formData);
      alert('Operación exitosa.');
      onClose();
    } catch (error) {
      alert('Error en la transacción de guardado. Intenta nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <div className={`modal-overlay ${estado === 'minimizado' ? 'minimized' : ''}`} style={{ backdropFilter: 'blur(4px)', zIndex: 1000 }}>
        <div className="form-card" style={{ maxWidth: '850px', width: '100%', borderRadius: '12px', border: '1px solid #444', backgroundColor: '#0d1117' }}>
          
          <div className="form-header" style={{ padding: '24px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '500', margin: 0, color: '#f0f6fc' }}>
              {estado === 'minimizado' ? 'Editando Empleado...' : (initialData ? `Editar Empleado (${formData.employeeId})` : 'Datos Personales del Empleado')}
            </h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              {estado === 'abierto' ? <button type="button" onClick={onMinimize} className="btn-window">🗕</button> : <button type="button" onClick={onRestore} className="btn-window restore">🗖</button>}
              <button type="button" onClick={onClose} className="btn-window close" style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
          </div>

          <div style={{ display: estado === 'minimizado' ? 'none' : 'block', maxHeight: '75vh', overflowY: 'auto' }}>
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label orange"># de Empleado</label>
                  <input type="text" className="form-control" value={initialData ? formData.employeeId : 'Se asignará automáticamente al guardar'} disabled style={{ backgroundColor: '#21262d', color: '#8b949e', width: '100%', fontWeight: 'bold' }} />
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre(s) *</label>
                  <input type="text" name="firstName" className="form-control" value={formData.firstName} onChange={handleChange} required style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre Corto / Alias</label>
                  <input type="text" name="alias" className="form-control" value={formData.alias} onChange={handleChange} style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }} />
                </div>

                <div className="form-group">
                  <label className="form-label">Apellido Paterno *</label>
                  <input type="text" name="lastNamePaternal" className="form-control" value={formData.lastNamePaternal} onChange={handleChange} required style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido Materno *</label>
                  <input type="text" name="lastNameMaternal" className="form-control" value={formData.lastNameMaternal} onChange={handleChange} required style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }} />
                </div>

                <div className="form-group">
                  <label className="form-label">RFC (Física o Moral) *</label>
                  <input 
                    type="text" 
                    name="rfc" 
                    className="form-control" 
                    value={formData.rfc} 
                    onChange={handleChange} 
                    required 
                    placeholder="ABCD123456XYZ"
                    pattern="^([A-ZÑ&]{3,4})\d{6}([A-Z0-9]{3})$"
                    title="Formato de RFC mexicano inválido (Ej: ABCD123456XYZ)"
                    style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Fecha de Nacimiento * <span style={{ fontSize: '0.7rem', color: '#8b949e', fontWeight: 'normal' }}>({fechaFormateadaEsp()})</span>
                  </label>
                  <input type="date" name="birthDate" className="form-control" value={formData.birthDate} onChange={handleChange} required style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }} />
                </div>

                {/* DIRECCIÓN RELACIONAL CON MAPS */}
                <div className="form-group" style={{ gridColumn: 'span 2', backgroundColor: '#161b22', padding: '16px', borderRadius: '8px', border: '1px solid #30363d' }}>
                  <label className="form-label" style={{ color: '#58a6ff' }}>Dirección Exacta *</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <SearchableSelect 
                        options={direccionesDB}
                        value={formData.addressId}
                        onChange={(id, label) => setFormData(prev => ({ ...prev, addressId: id, addressLabel: label }))}
                        placeholder="Buscar dirección en la colección de Addresses..."
                      />
                    </div>
                    <button type="button" className="btn btn-outline" onClick={() => setModalDireccionAbierto(true)} style={{ height: '38px', whiteSpace: 'nowrap' }}>
                      + Añadir Nueva
                    </button>
                    <button type="button" className="btn btn-primary" onClick={abrirGoogleMaps} style={{ height: '38px', backgroundColor: '#2ea043', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      Maps
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono Personal *</label>
                  <input type="tel" name="personalPhone" className="form-control" value={formData.personalPhone} onChange={handleChange} required pattern="[0-9]{10}" title="Debe contener 10 dígitos numéricos" placeholder="10 dígitos" style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo Personal *</label>
                  <input type="email" name="personalEmail" className="form-control" value={formData.personalEmail} onChange={handleChange} required style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }} />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#ff7b72' }}>Contacto de Emergencia (Nombre) *</label>
                  <input type="text" name="emergencyContactName" className="form-control" value={formData.emergencyContactName} onChange={handleChange} required style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#ff7b72' }}>Teléfono de Emergencia *</label>
                  <input type="tel" name="emergencyContactPhone" className="form-control" value={formData.emergencyContactPhone} onChange={handleChange} required pattern="[0-9]{10}" title="Debe contener 10 dígitos numéricos" placeholder="10 dígitos" style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }} />
                </div>

              </div>

              <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'flex-end', borderTop: '1px solid #30363d', paddingTop: '24px' }}>
                <button type="button" onClick={onClose} style={{ backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
                <button type="submit" disabled={cargando} style={{ backgroundColor: '#D84315', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                  {cargando ? 'Procesando Transacción...' : 'Guardar Empleado'}
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
    </>
  );
};