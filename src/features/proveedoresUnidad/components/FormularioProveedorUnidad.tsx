// src/features/proveedoresUnidad/components/FormularioProveedorUnidad.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro } from '../../../config/firebase';

interface FormProps {
  estado: 'abierto' | 'minimizado';
  initialData?: any;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
}

export const FormularioProveedorUnidad = ({ estado, initialData, onClose, onMinimize, onRestore }: FormProps) => {
  // Estado inicial del formulario con todos los campos solicitados
  const [formData, setFormData] = useState({
    proveedorId: '',
    proveedorNombre: '',
    nombre: '',
    apellido: '',
    fechaNacimiento: '',
    paisNacimiento: '',
    sexo: 'Masculino',
    numeroVisa: '',
    numeroLicencia: '',
    paisExpedicion: '',
    estadoExpedicion: ''
  });

  const [empresasProveedoras, setEmpresasProveedoras] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  // --- OBTENER Y FILTRAR EMPRESAS PROVEEDORAS ---
  useEffect(() => {
    const obtenerProveedores = async () => {
      try {
        // NOTA: Ajusta 'catalogo_empresas' si tu colección principal se llama distinto (ej. 'empresas')
        const querySnapshot = await getDocs(collection(db, 'catalogo_empresas'));
        const todasLasEmpresas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Filtrar estrictamente las que sean de categoría Proveedor (Transporte)
        // NOTA: Verifica si en tu BD el campo se llama 'tipo_empresa' o 'categoria_principal'
        const filtradas = todasLasEmpresas.filter((emp: any) => 
          emp.tipo_empresa === 'Proveedor (Transporte)' || emp.categoria_principal === 'Proveedor (Transporte)'
        );
        
        setEmpresasProveedoras(filtradas);
      } catch (error) {
        console.error("Error al obtener proveedores:", error);
      }
    };
    obtenerProveedores();
  }, []);

  // Cargar datos iniciales si se está editando
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Manejador general de inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Manejador especial para el select de proveedor (Guarda ID y Nombre simultáneamente)
  const handleProveedorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idSeleccionado = e.target.value;
    const empresaEncontrada = empresasProveedoras.find(emp => emp.id === idSeleccionado);
    
    setFormData(prev => ({
      ...prev,
      proveedorId: idSeleccionado,
      proveedorNombre: empresaEncontrada ? empresaEncontrada.empresa : '' // Asegúrate de que tu BD use la propiedad 'empresa' o 'nombre'
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (initialData && initialData.id) {
        await actualizarRegistro('proveedores_unidad', initialData.id, formData);
      } else {
        await agregarRegistro('proveedores_unidad', formData);
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
      <div className="form-card" style={{ maxWidth: '750px' }}>
        <div className="form-header">
          <h2>{estado === 'minimizado' ? 'Editando...' : (initialData ? `Editar Proveedor de Unidad` : 'Nuevo Proveedor de Unidad')}</h2>
          <div className="header-actions">
            {estado === 'abierto' ? (
              <button type="button" onClick={onMinimize} className="btn-window">🗕</button>
            ) : (
              <button type="button" onClick={onRestore} className="btn-window restore">🗖</button>
            )}
            <button type="button" onClick={onClose} className="btn-window close">✕</button>
          </div>
        </div>

        <div style={{ display: estado === 'minimizado' ? 'none' : 'block', padding: '10px 0' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* --- COLUMNA / FILA 1 --- */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Proveedor (Transporte) *</label>
                <select 
                  className="form-control" 
                  value={formData.proveedorId} 
                  onChange={handleProveedorChange} 
                  required
                >
                  <option value="">Seleccione un proveedor...</option>
                  {empresasProveedoras.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.empresa}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input type="text" name="nombre" className="form-control" value={formData.nombre} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Apellido *</label>
                <input type="text" name="apellido" className="form-control" value={formData.apellido} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Fecha de Nacimiento *</label>
                <input type="date" name="fechaNacimiento" className="form-control" value={formData.fechaNacimiento} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Sexo *</label>
                <select name="sexo" className="form-control" value={formData.sexo} onChange={handleChange} required>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">País de Nacimiento</label>
                <input type="text" name="paisNacimiento" className="form-control" value={formData.paisNacimiento} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Número de Visa</label>
                <input type="text" name="numeroVisa" className="form-control" value={formData.numeroVisa} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label className="form-label">No. Licencia Federal *</label>
                <input type="text" name="numeroLicencia" className="form-control" value={formData.numeroLicencia} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">País de Expedición</label>
                <input type="text" name="paisExpedicion" className="form-control" value={formData.paisExpedicion} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Estado de Expedición</label>
                <input type="text" name="estadoExpedicion" className="form-control" value={formData.estadoExpedicion} onChange={handleChange} />
              </div>

            </div>

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={cargando}>
                {cargando ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Guardar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};