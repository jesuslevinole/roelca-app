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

  // --- ESCÁNER TOTAL SIN FILTRO ESTRICTO (Para garantizar que salgan datos) ---
  useEffect(() => {
    const obtenerProveedores = async () => {
      try {
        let todasLasEmpresas: any[] = [];
        const coleccionesPosibles = ['empresa', 'empresas', 'catalogo_empresas'];

        // Extraer todo lo que parezca una empresa
        for (const nombreColeccion of coleccionesPosibles) {
          try {
            const snap = await getDocs(collection(db, nombreColeccion));
            if (!snap.empty) {
              const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              todasLasEmpresas = [...todasLasEmpresas, ...docs];
            }
          } catch (e) {
            // Ignorar silenciosamente
          }
        }

        // Limpiar duplicados basados en el ID
        const empresasUnicas = Array.from(new Map(todasLasEmpresas.map(item => [item.id, item])).values());
        
        // NOTA: Quité el filtro que eliminaba las empresas para que puedas ver TODO y diagnosticar.
        // Solo las ordenamos alfabéticamente para que sea fácil buscar.
        empresasUnicas.sort((a: any, b: any) => {
          const nombreA = a.nombre || a.empresa || a.razonSocial || '';
          const nombreB = b.nombre || b.empresa || b.razonSocial || '';
          return nombreA.localeCompare(nombreB);
        });

        setEmpresasProveedoras(empresasUnicas);
      } catch (error) {
        console.error("Error al obtener proveedores:", error);
      }
    };
    obtenerProveedores();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProveedorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idSeleccionado = e.target.value;
    const empresaEncontrada = empresasProveedoras.find(emp => emp.id === idSeleccionado);
    
    // Extracción segura del nombre
    const nombreVisual = empresaEncontrada 
      ? (empresaEncontrada.nombre || empresaEncontrada.empresa || empresaEncontrada.razonSocial || empresaEncontrada.nombreCorto || `Prov ID: ${idSeleccionado.substring(0,6)}`) 
      : '';

    setFormData(prev => ({
      ...prev,
      proveedorId: idSeleccionado,
      proveedorNombre: nombreVisual 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.proveedorId) {
      alert("Por favor selecciona una empresa de la lista.");
      return;
    }

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
              
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Proveedor (Empresa de Transporte) *</label>
                <select 
                  className="form-control" 
                  value={formData.proveedorId} 
                  onChange={handleProveedorChange} 
                  required
                >
                  <option value="">Seleccione la empresa transportista...</option>
                  {empresasProveedoras.map(emp => {
                    const isTransportista = JSON.stringify(emp).toLowerCase().includes('ca21ab07') || JSON.stringify(emp).toLowerCase().includes('transporte');
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre || emp.empresa || emp.razonSocial || `ID: ${emp.id.substring(0,5)}`} {isTransportista ? '🚚 (Transportista)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Chofer *</label>
                <input type="text" name="nombre" className="form-control" value={formData.nombre} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Apellido del Chofer *</label>
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