// src/features/catalogos/components/CatalogosDashboard.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro, eliminarRegistro } from '../../../config/firebase';
import { listaCatalogos, type CatalogSchema } from '../config/catalogSchemas';

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
const CatalogosDashboard = () => {
  const [catalogoSeleccionado, setCatalogoSeleccionado] = useState<CatalogSchema | null>(null);
  const [registros, setRegistros] = useState<any[]>([]);
  const [modalEstado, setModalEstado] = useState<'cerrado' | 'formulario' | 'detalle'>('cerrado');
  const [registroActual, setRegistroActual] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  
  const [opcionesDinamicas, setOpcionesDinamicas] = useState<Record<string, any[]>>({});
  
  // ESTADOS NUEVOS PARA CONFIGURACIÓN DE CAMPOS
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);

  // Efecto para cargar los datos del catálogo y su configuración de campos obligatorios
  useEffect(() => {
    if (!catalogoSeleccionado) return;
    
    // 1. Cargar configuración de campos requeridos desde LocalStorage o usar defaults del Schema
    const savedConfig = localStorage.getItem(`formConfig_${catalogoSeleccionado.id}`);
    if (savedConfig) {
      setRequiredFields(JSON.parse(savedConfig));
    } else {
      const defaults = catalogoSeleccionado.fields.filter(f => f.required).map(f => f.name);
      setRequiredFields(defaults);
    }

    // 2. Suscripción al catálogo principal
    const unsubscribe = onSnapshot(collection(db, `catalogo_${catalogoSeleccionado.id}`), (snapshot) => {
      setRegistros(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Cerebro dinámico. Busca campos que requieran datos de otra tabla.
    const cargarOpcionesDinamicas = async () => {
      const nuevasOpciones: Record<string, any[]> = {};
      for (const field of catalogoSeleccionado.fields) {
        if (field.dynamicOptions) {
          const { collection: col } = field.dynamicOptions;
          try {
            const querySnapshot = await getDocs(collection(db, col));
            nuevasOpciones[field.name] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          } catch (error) {
            console.error(`Error cargando colección dinámica ${col}:`, error);
          }
        }
      }
      setOpcionesDinamicas(nuevasOpciones);
    };

    cargarOpcionesDinamicas();

    return () => unsubscribe();
  }, [catalogoSeleccionado]);

  // Manejador para alternar si un campo es obligatorio o no
  const toggleRequired = (fieldName: string) => {
    if (!catalogoSeleccionado) return;
    const newRequired = requiredFields.includes(fieldName)
      ? requiredFields.filter(f => f !== fieldName)
      : [...requiredFields, fieldName];
    
    setRequiredFields(newRequired);
    localStorage.setItem(`formConfig_${catalogoSeleccionado.id}`, JSON.stringify(newRequired));
  };

  const isRequired = (fieldName: string) => requiredFields.includes(fieldName);

  const guardarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const col = `catalogo_${catalogoSeleccionado!.id}`;
      registroActual ? await actualizarRegistro(col, registroActual.id, formData) : await agregarRegistro(col, formData);
      setModalEstado('cerrado');
    } catch (error) { alert('Error en Firebase.'); }
  };

  // Renderizado de la cuadrícula de catálogos cuando no hay ninguno seleccionado
  if (!catalogoSeleccionado) return (
    <div className="catalog-grid">
      {listaCatalogos.map((cat) => (
        <div key={cat.id} className="catalog-card" onClick={() => setCatalogoSeleccionado(cat)}>
          <div className="catalog-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">{cat.icono}</svg>
          </div>
          <div className="catalog-title">{cat.titulo}</div>
        </div>
      ))}
    </div>
  );

  // Renderizado de la tabla y formulario del catálogo seleccionado
  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', maxWidth: '1100px' }}>
        <div>
          <button className="btn-outline" onClick={() => setCatalogoSeleccionado(null)} style={{ fontSize: '0.85rem' }}>← Volver</button>
          <h2 style={{ display: 'inline', marginLeft: '20px', fontWeight: '500', letterSpacing: '-0.02em' }}>{catalogoSeleccionado.titulo}</h2>
        </div>
        <button className="btn-primary" onClick={() => { setRegistroActual(null); setFormData({}); setModalEstado('formulario'); }}>+ Agregar</button>
      </div>

      <div className="table-wrapper" style={{ maxWidth: '1100px' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
          <thead>
            <tr>
              {catalogoSeleccionado.fields.map(f => (
                <th key={f.name} style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #333' }}>
                  {f.label}
                </th>
              ))}
              <th style={{ textAlign: 'right', padding: '12px 16px', color: '#666', borderBottom: '1px solid #333' }}></th>
            </tr>
          </thead>
          <tbody>
            {registros.map((reg) => (
              <tr 
                key={reg.id} 
                className="row-hover" 
                onClick={() => { setRegistroActual(reg); setModalEstado('detalle'); }}
                style={{ cursor: 'pointer' }}
              >
                {catalogoSeleccionado.fields.map(f => (
                  <td key={f.name} style={{ padding: '18px 16px', fontSize: '0.9rem', borderBottom: '1px solid #222', color: '#eee' }}>
                    {f.dynamicOptions && opcionesDinamicas[f.name]
                      ? (opcionesDinamicas[f.name].find(opt => opt[f.dynamicOptions!.valueField] === reg[f.name])?.[f.dynamicOptions!.labelField] || reg[f.name] || '-')
                      : (reg[f.name] || '-')}
                  </td>
                ))}
                <td style={{ padding: '18px 16px', borderBottom: '1px solid #222', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => { setRegistroActual(reg); setFormData(reg); setModalEstado('formulario'); }}
                      style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: '4px' }}
                      title="Editar"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                    </button>
                    <button 
                      onClick={async () => { if (window.confirm('¿Desea eliminar permanentemente este registro?')) await eliminarRegistro(`catalogo_${catalogoSeleccionado!.id}`, reg.id); }}
                      style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '4px' }}
                      title="Eliminar"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* COMPONENTE DE CONFIGURACIÓN DE CAMPOS */}
      <FieldConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        fields={catalogoSeleccionado.fields} 
        requiredFields={requiredFields} 
        toggleRequired={toggleRequired} 
      />

      {/* Ventana Modal (Formulario / Detalle) */}
      {modalEstado !== 'cerrado' && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="form-card" style={{ maxWidth: '480px', borderRadius: '16px', border: '1px solid #444' }}>
            <div className="form-header" style={{ padding: '24px 24px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '500', margin: 0 }}>
                {modalEstado === 'detalle' ? 'Información del Registro' : (registroActual ? 'Editar Registro' : 'Nuevo Registro')}
              </h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {/* BOTÓN DE CONFIGURACIÓN */}
                {modalEstado === 'formulario' && (
                  <button 
                    type="button" 
                    onClick={() => setIsConfigOpen(true)} 
                    style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Configurar campos obligatorios"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                  </button>
                )}
                <button className="close-x" onClick={() => setModalEstado('cerrado')} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              </div>
            </div>
            
            <div style={{ padding: '24px' }}>
              {modalEstado === 'formulario' ? (
                <form onSubmit={guardarRegistro}>
                  {catalogoSeleccionado.fields.map(field => {
                    const esRequerido = isRequired(field.name); // VERIFICACIÓN DINÁMICA
                    return (
                      <div key={field.name} className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#999', marginBottom: '8px', display: 'block' }}>
                          {field.label} {esRequerido && <span style={{ color: '#ff4d4d' }}>*</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select 
                            value={formData[field.name] || ''} 
                            onChange={(e) => setFormData({...formData, [field.name]: e.target.value})} 
                            className="form-control" 
                            required={esRequerido}
                          >
                            <option value="">Seleccione una opción</option>
                            {field.dynamicOptions 
                              ? opcionesDinamicas[field.name]?.map(opt => (
                                  <option key={opt[field.dynamicOptions!.valueField]} value={opt[field.dynamicOptions!.valueField]}>
                                    {opt[field.dynamicOptions!.labelField]}
                                  </option>
                                ))
                              : field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)
                            }
                          </select>
                        ) : (
                          <input 
                            type={field.type} 
                            value={formData[field.name] || ''} 
                            onChange={(e) => setFormData({...formData, [field.name]: e.target.value})} 
                            className="form-control" 
                            required={esRequerido} 
                          />
                        )}
                      </div>
                    );
                  })}
                  <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn-outline" onClick={() => setModalEstado('cerrado')}>Cancelar</button>
                    <button type="submit" className="btn-primary" style={{ minWidth: '120px' }}>Guardar</button>
                  </div>
                </form>
              ) : (
                <div className="detalle-view">
                  {catalogoSeleccionado.fields.map(f => (
                    <div key={f.name} style={{ marginBottom: '16px', borderBottom: '1px solid #222', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{f.label}</span>
                      <span style={{ fontSize: '1rem', color: '#fff' }}>
                        {f.dynamicOptions && opcionesDinamicas[f.name]
                          ? (opcionesDinamicas[f.name].find(opt => opt[f.dynamicOptions!.valueField] === registroActual[f.name])?.[f.dynamicOptions!.labelField] || registroActual[f.name] || '-')
                          : (registroActual[f.name] || '-')}
                      </span>
                    </div>
                  ))}
                  <button className="btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => setModalEstado('cerrado')}>Cerrar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogosDashboard;