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

  // --- ESCÁNER UNIVERSAL DE PROVEEDORES (Buscando ID ca21ab07) ---
  useEffect(() => {
    const obtenerProveedores = async () => {
      try {
        let todasLasEmpresas: any[] = [];
        // Buscar en las colecciones más comunes de tu estructura
        const coleccionesPosibles = ['empresa', 'empresas', 'catalogo_empresas'];

        for (const nombreColeccion of coleccionesPosibles) {
          try {
            const snap = await getDocs(collection(db, nombreColeccion));
            if (!snap.empty) {
              const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              todasLasEmpresas = [...todasLasEmpresas, ...docs];
            }
          } catch (e) {
            // Ignorar silenciosamente si la colección no existe
          }
        }

        // Eliminar duplicados
        const empresasUnicas = Array.from(new Map(todasLasEmpresas.map(item => [item.id, item])).values());

        // Filtrar agresivamente por el ID solicitado
        const ID_PROVEEDOR = 'ca21ab07';
        const filtradas = empresasUnicas.filter((emp: any) => {
          const stringData = JSON.stringify(emp).toLowerCase();
          return stringData.includes(ID_PROVEEDOR.toLowerCase()) || 
                 stringData.includes('proveedor (transporte)') || 
                 stringData.includes('proveedor');
        });
        
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
    
    // Extracción inteligente del nombre visual (Respaldo contra migraciones sucias)
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
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre || emp.empresa || emp.razonSocial || emp.nombreCorto || `Prov ID: ${emp.id.substring(0,6)}`}
                    </option>
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

// =========================================
// COMPONENTE PRINCIPAL (DASHBOARD)
// =========================================
// src/features/proveedoresUnidad/components/ProveedoresUnidadDashboard.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, eliminarRegistro } from '../../../config/firebase'; 

export const ProveedoresUnidadDashboard: React.FC = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [registroEditando, setRegistroEditando] = useState<any | null>(null);
  const [registros, setRegistros] = useState<any[]>([]);

  // Suscripción en tiempo real a Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'proveedores_unidad'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenar alfabéticamente por Apellido como buena práctica
      data.sort((a: any, b: any) => (a.apellido || '').localeCompare(b.apellido || ''));
      
      setRegistros(data);
    });

    return () => unsubscribe();
  }, []);

  const handleNuevo = () => { 
    setRegistroEditando(null); 
    setEstadoFormulario('abierto'); 
  };
  
  const editarRegistro = (registro: any) => { 
    setRegistroEditando(registro); 
    setEstadoFormulario('abierto'); 
  };

  const handleEliminar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente este conductor/proveedor?')) {
      try {
        await eliminarRegistro('proveedores_unidad', id);
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert('Hubo un error al eliminar. Revisa tu conexión.');
      }
    }
  };

  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      
      {estadoFormulario !== 'cerrado' && (
        <FormularioProveedorUnidad 
          estado={estadoFormulario} 
          initialData={registroEditando}
          onClose={() => { setEstadoFormulario('cerrado'); setRegistroEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} 
          onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '24px' }}>
        <h1 className="module-title" style={{ fontSize: '1.25rem', color: '#8b949e', margin: 0, fontWeight: '400' }}>
          Bases de Datos &gt; <span style={{ color: '#f0f6fc', fontWeight: 'bold' }}>Proveedores de Unidad</span>
        </h1>
        <button className="btn btn-primary" onClick={handleNuevo}>+ Agregar Proveedor</button>
      </div>

      <div className="content-body" style={{ display: 'block' }}>
        <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          <table className="data-table" style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#161b22', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                {/* Columna de Acciones al principio */}
                <th style={{ padding: '16px', width: '160px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', position: 'sticky', left: 0, backgroundColor: '#161b22', zIndex: 12, borderRight: '1px solid #30363d', borderBottom: '1px solid #30363d' }}>
                  Acciones
                </th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Proveedor Empresa</th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Nombre Completo</th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Licencia Federal</th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Visa</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
                    Aún no hay registros. Haz clic en "+ Agregar Proveedor" para crear el primero.
                  </td>
                </tr>
              ) : (
                registros.map((reg) => (
                  <tr 
                    key={reg.id} 
                    style={{ borderBottom: '1px solid #21262d', transition: 'background-color 0.2s', cursor: 'pointer' }}
                    onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = '#21262d'} 
                    onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => editarRegistro(reg)}
                  >
                    {/* Celda de Acciones */}
                    <td style={{ padding: '16px', textAlign: 'center', position: 'sticky', left: 0, backgroundColor: 'inherit', zIndex: 5, borderRight: '1px solid #30363d' }} onClick={(e: any) => e.stopPropagation()}>
                      <div className="actions-cell" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          className="btn-small btn-edit" 
                          onClick={(e) => { e.stopPropagation(); editarRegistro(reg); }}
                          style={{ background: 'transparent', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          Editar
                        </button>
                        <button 
                          className="btn-small btn-danger" 
                          onClick={(e) => handleEliminar(e, reg.id!)}
                          style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>

                    <td style={{ padding: '16px', fontWeight: '500', color: '#f0f6fc', fontSize: '0.95rem' }}>{reg.proveedorNombre}</td>
                    <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{reg.nombre} {reg.apellido}</td>
                    <td className="font-mono" style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{reg.numeroLicencia || '-'}</td>
                    <td className="font-mono" style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{reg.numeroVisa || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProveedoresUnidadDashboard;