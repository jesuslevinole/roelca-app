// src/features/catalogos/components/CatalogosDashboard.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro, eliminarRegistro } from '../../../config/firebase';
import { listaCatalogos, type CatalogSchema } from '../config/catalogSchemas';

const CatalogosDashboard = () => {
  const [catalogoSeleccionado, setCatalogoSeleccionado] = useState<CatalogSchema | null>(null);
  const [registros, setRegistros] = useState<any[]>([]);
  const [modalEstado, setModalEstado] = useState<'cerrado' | 'formulario' | 'detalle'>('cerrado');
  const [registroActual, setRegistroActual] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  
  // Estado que almacena las listas traídas de Firebase para los dropdowns relacionales
  const [opcionesDinamicas, setOpcionesDinamicas] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!catalogoSeleccionado) return;
    
    // Suscripción al catálogo principal
    const unsubscribe = onSnapshot(collection(db, `catalogo_${catalogoSeleccionado.id}`), (snapshot) => {
      setRegistros(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Cerebro dinámico. Busca campos en el esquema que requieran datos de otra tabla y los consulta.
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
                    {/* Si el campo guarda un ID relacional, mostramos el texto descriptivo */}
                    {f.dynamicOptions && opcionesDinamicas[f.name]
                      ? (opcionesDinamicas[f.name].find(opt => opt[f.dynamicOptions!.valueField] === reg[f.name])?.[f.dynamicOptions!.labelField] || reg[f.name] || '-')
                      : (reg[f.name] || '-')}
                  </td>
                ))}
                <td style={{ padding: '18px 16px', borderBottom: '1px solid #222', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                    {/* Icono Lápiz (Editar) */}
                    <button 
                      onClick={() => { setRegistroActual(reg); setFormData(reg); setModalEstado('formulario'); }}
                      style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: '4px' }}
                      title="Editar"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                    </button>
                    {/* Icono Basura (Eliminar) */}
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

      {/* Ventana Modal (Formulario / Detalle) */}
      {modalEstado !== 'cerrado' && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="form-card" style={{ maxWidth: '480px', borderRadius: '16px', border: '1px solid #444' }}>
            <div className="form-header" style={{ padding: '24px 24px 0 24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '500' }}>
                {modalEstado === 'detalle' ? 'Información del Registro' : (registroActual ? 'Editar Registro' : 'Nuevo Registro')}
              </h2>
              <button className="close-x" onClick={() => setModalEstado('cerrado')}>✕</button>
            </div>
            
            <div style={{ padding: '24px' }}>
              {modalEstado === 'formulario' ? (
                <form onSubmit={guardarRegistro}>
                  {catalogoSeleccionado.fields.map(field => (
                    <div key={field.name} className="form-group" style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#999', marginBottom: '8px', display: 'block' }}>
                        {field.label} {field.required && <span style={{ color: '#ff4d4d' }}>*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select 
                          value={formData[field.name] || ''} 
                          onChange={(e) => setFormData({...formData, [field.name]: e.target.value})} 
                          className="form-control" 
                          required={field.required}
                        >
                          <option value="">Seleccione una opción</option>
                          {/* Renderiza opciones desde base de datos relacional u opciones estáticas */}
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
                          required={field.required} 
                        />
                      )}
                    </div>
                  ))}
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
                        {/* Muestra el nombre legible también en la vista de detalle */}
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