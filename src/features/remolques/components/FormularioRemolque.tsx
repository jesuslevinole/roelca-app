// src/features/remolques/components/FormularioRemolque.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro } from '../../../config/firebase';
import type { RemolqueRecord } from '../../../types/remolque'; // ✅ RUTA CORREGIDA

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
          setTimeout(() => setIsOpen(false), 200);
          setSearchTerm(selectedLabel); 
        }}
        required={required && !value} 
        style={{ cursor: 'text', border: isOpen ? '1px solid #3b82f6' : '', backgroundColor: '#010409', color: '#c9d1d9' }}
      />
      
      {isOpen && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto',
          backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '4px', marginTop: '4px',
          padding: '0', listStyle: 'none', zIndex: 1000, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
        }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <li
                key={opt.id}
                onClick={() => { onChange(opt.id, opt.label); setSearchTerm(opt.label); setIsOpen(false); }}
                style={{ padding: '8px 12px', cursor: 'pointer', color: '#c9d1d9', borderBottom: '1px solid #21262d', fontSize: '0.85rem' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#21262d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {opt.label}
              </li>
            ))
          ) : (
            <li style={{ padding: '8px 12px', color: '#8b949e', fontSize: '0.85rem', textAlign: 'center' }}>No hay coincidencias</li>
          )}
        </ul>
      )}
    </div>
  );
};

// =========================================
// COMPONENTE PRINCIPAL
// =========================================
interface FormProps {
  estado: 'abierto' | 'minimizado';
  initialData?: RemolqueRecord | null;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
}

export const FormularioRemolque = ({ estado, initialData, onClose, onMinimize, onRestore }: FormProps) => {
  const [formData, setFormData] = useState<RemolqueRecord>({
    nombre: '',
    tipoId: '',
    tipoNombre: '',
    placas: '',
    estadoId: '',
    estadoNombre: '',
    serie: '',
    marca: '',
    anio: new Date().getFullYear(),
    propietarioId: '',
    propietarioNombre: '',
    paisId: '',
    paisNombre: ''
  });

  const [cargando, setCargando] = useState(false);

  // Estados para los catálogos
  const [tiposRemolque, setTiposRemolque] = useState<{id: string, label: string}[]>([]);
  const [estadosCatalogo, setEstadosCatalogo] = useState<{id: string, label: string}[]>([]);
  const [paisesCatalogo, setPaisesCatalogo] = useState<{id: string, label: string}[]>([]);
  const [empresasPropietarias, setEmpresasPropietarias] = useState<{id: string, label: string}[]>([]);

  // Cargar todos los catálogos al montar el componente
  useEffect(() => {
    const cargarCatalogos = async () => {
      // 1. Catálogo de Tipos de Remolque
      try {
        const snapTipos = await getDocs(collection(db, 'catalogo_tipo_remolque'));
        setTiposRemolque(snapTipos.docs.map(doc => ({ id: doc.id, label: doc.data().nombre || doc.data().descripcion || `Tipo (${doc.id.substring(0,4)})` })));
      } catch (error) { console.error("Error al cargar tipos de remolque", error); }

      // 2. Catálogo de Estados
      try {
        const snapEstados = await getDocs(collection(db, 'catalogo_estados'));
        setEstadosCatalogo(snapEstados.docs.map(doc => ({ id: doc.id, label: doc.data().estado || doc.data().nombre || `Estado (${doc.id.substring(0,4)})` })));
      } catch (error) { console.error("Error al cargar estados", error); }

      // 3. Catálogo de Países
      try {
        const snapPaises = await getDocs(collection(db, 'catalogo_paises'));
        setPaisesCatalogo(snapPaises.docs.map(doc => ({ id: doc.id, label: doc.data().nombre || doc.data().pais || `País (${doc.id.substring(0,4)})` })));
      } catch (error) { console.error("Error al cargar países", error); }

      // 4. Catálogo de Empresas Propietarias (Escáner Universal filtrando por 5d92b3a2)
      try {
        let todasLasEmpresas: any[] = [];
        const coleccionesPosibles = ['empresa', 'empresas', 'catalogo_empresas'];
        
        for (const nombreCol of coleccionesPosibles) {
          try {
            const snap = await getDocs(collection(db, nombreCol));
            if (!snap.empty) {
              const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              todasLasEmpresas = [...todasLasEmpresas, ...docs];
            }
          } catch (e) { /* Ignorar si no existe */ }
        }

        const empresasUnicas = Array.from(new Map(todasLasEmpresas.map(item => [item.id, item])).values());
        const ID_PROPIETARIO = '5d92b3a2';
        
        const filtradas = empresasUnicas.filter((emp: any) => {
          if (Array.isArray(emp.tiposEmpresa)) return emp.tiposEmpresa.includes(ID_PROPIETARIO);
          const stringData = JSON.stringify(emp).toLowerCase();
          return stringData.includes(ID_PROPIETARIO.toLowerCase());
        });

        setEmpresasPropietarias(filtradas.map(emp => ({ 
          id: emp.id, 
          label: emp.nombre || emp.empresa || emp.razonSocial || `Empresa (${emp.id.substring(0,4)})` 
        })));
      } catch (error) { console.error("Error al cargar propietarios", error); }
    };

    cargarCatalogos();
  }, []);

  // Setear datos si es edición
  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  // Manejadores de Inputs
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: RemolqueRecord) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: RemolqueRecord) => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tipoId || !formData.propietarioId || !formData.estadoId || !formData.paisId) {
      alert("Por favor, asegúrate de llenar todos los campos de búsqueda obligatorios (Tipo, Propietario, Estado, País).");
      return;
    }

    setCargando(true);
    try {
      if (initialData && initialData.id) {
        await actualizarRegistro('remolques', initialData.id, formData);
      } else {
        await agregarRegistro('remolques', formData);
      }
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert('Error al guardar el remolque. Revisa tu conexión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={`modal-overlay ${estado === 'minimizado' ? 'minimized' : ''}`}>
      <div className="form-card" style={{ maxWidth: '850px', backgroundColor: '#0d1117', border: '1px solid #30363d' }}>
        <div className="form-header" style={{ borderBottom: '1px solid #30363d' }}>
          <h2>{estado === 'minimizado' ? 'Editando...' : (initialData ? `Editar Remolque: ${formData.nombre}` : 'Nuevo Remolque')}</h2>
          <div className="header-actions">
            {estado === 'abierto' ? (
              <button type="button" onClick={onMinimize} className="btn-window">🗕</button>
            ) : (
              <button type="button" onClick={onRestore} className="btn-window restore">🗖</button>
            )}
            <button type="button" onClick={onClose} className="btn-window close">✕</button>
          </div>
        </div>

        <div style={{ display: estado === 'minimizado' ? 'none' : 'block', padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
          <form onSubmit={handleSubmit}>
            
            {/* Grid Responsivo Avanzado (Auto-Fit) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Nombre del Remolque (Identificador) *</label>
                <input type="text" name="nombre" className="form-control" value={formData.nombre} onChange={handleTextChange} required style={{ backgroundColor: '#010409', color: '#f0f6fc', fontWeight: 'bold', fontSize: '1.1rem' }} placeholder="Ej. R-105" />
              </div>

              <div className="form-group">
                <label className="form-label">Propietario *</label>
                <SearchableSelect 
                  options={empresasPropietarias}
                  value={formData.propietarioId}
                  onChange={(id, label) => setFormData((prev: RemolqueRecord) => ({ ...prev, propietarioId: id, propietarioNombre: label }))}
                  placeholder="Buscar Propietario..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Remolque *</label>
                <SearchableSelect 
                  options={tiposRemolque}
                  value={formData.tipoId}
                  onChange={(id, label) => setFormData((prev: RemolqueRecord) => ({ ...prev, tipoId: id, tipoNombre: label }))}
                  placeholder="Buscar Tipo..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Placas *</label>
                <input type="text" name="placas" className="form-control" value={formData.placas} onChange={handleTextChange} required style={{ backgroundColor: '#010409', color: '#c9d1d9' }}/>
              </div>

              <div className="form-group">
                <label className="form-label">Número de Serie *</label>
                <input type="text" name="serie" className="form-control" value={formData.serie} onChange={handleTextChange} required style={{ backgroundColor: '#010409', color: '#c9d1d9' }}/>
              </div>

              <div className="form-group">
                <label className="form-label">Marca</label>
                <input type="text" name="marca" className="form-control" value={formData.marca} onChange={handleTextChange} style={{ backgroundColor: '#010409', color: '#c9d1d9' }}/>
              </div>

              <div className="form-group">
                <label className="form-label">Año *</label>
                <input type="number" name="anio" className="form-control" value={formData.anio} onChange={handleNumberChange} required min="1950" max="2100" style={{ backgroundColor: '#010409', color: '#c9d1d9' }}/>
              </div>

              <div className="form-group">
                <label className="form-label">País *</label>
                <SearchableSelect 
                  options={paisesCatalogo}
                  value={formData.paisId}
                  onChange={(id, label) => setFormData((prev: RemolqueRecord) => ({ ...prev, paisId: id, paisNombre: label }))}
                  placeholder="Buscar País..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Estado / Entidad *</label>
                <SearchableSelect 
                  options={estadosCatalogo}
                  value={formData.estadoId}
                  onChange={(id, label) => setFormData((prev: RemolqueRecord) => ({ ...prev, estadoId: id, estadoNombre: label }))}
                  placeholder="Buscar Estado..."
                  required
                />
              </div>

            </div>

            <div className="form-actions" style={{ marginTop: '32px', borderTop: '1px solid #30363d', paddingTop: '20px' }}>
              <button type="button" onClick={onClose} className="btn btn-outline" style={{ backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d' }}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={cargando} style={{ backgroundColor: '#D84315', border: 'none' }}>
                {cargando ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Registrar Remolque')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};