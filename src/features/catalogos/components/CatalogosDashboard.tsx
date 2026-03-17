// src/features/catalogos/components/CatalogosDashboard.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro, eliminarRegistro } from '../../../config/firebase';
import { listaCatalogos, type CatalogSchema } from '../config/catalogSchemas';

const CatalogosDashboard = () => {
  const [catalogoSeleccionado, setCatalogoSeleccionado] = useState<CatalogSchema | null>(null);
  const [registros, setRegistros] = useState<any[]>([]);
  const [modalEstado, setModalEstado] = useState<'cerrado' | 'formulario' | 'detalle'>('cerrado');
  const [registroActual, setRegistroActual] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (!catalogoSeleccionado) return;
    const unsubscribe = onSnapshot(collection(db, `catalogo_${catalogoSeleccionado.id}`), (snapshot) => {
      setRegistros(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
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

  if (!catalogoSeleccionado) return (
    <div className="catalog-grid">
      {listaCatalogos.map((cat) => (
        <div key={cat.id} className="catalog-card" onClick={() => setCatalogoSeleccionado(cat)}>
          <div className="catalog-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">{cat.icono}</svg></div>
          <div className="catalog-title">{cat.titulo}</div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <button className="btn-outline" onClick={() => setCatalogoSeleccionado(null)}>Volver</button>
          <h2 style={{ display: 'inline', marginLeft: '16px' }}>{catalogoSeleccionado.titulo}</h2>
        </div>
        <button className="btn-primary" onClick={() => { setRegistroActual(null); setFormData({}); setModalEstado('formulario'); }}>+ Agregar</button>
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead><tr>{catalogoSeleccionado.fields.map(f => <th key={f.name}>{f.label}</th>)}<th>Acciones</th></tr></thead>
          <tbody>
            {registros.map((reg) => (
              <tr key={reg.id}>
                {catalogoSeleccionado.fields.map(f => <td key={f.name}>{reg[f.name] || '-'}</td>)}
                <td style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-small" onClick={() => { setRegistroActual(reg); setModalEstado('detalle'); }}>Ver</button>
                  <button className="btn-small btn-edit" onClick={() => { setRegistroActual(reg); setFormData(reg); setModalEstado('formulario'); }}>Editar</button>
                  <button className="btn-small btn-danger" onClick={async () => { if (window.confirm('¿Eliminar?')) await eliminarRegistro(`catalogo_${catalogoSeleccionado!.id}`, reg.id); }}>Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalEstado !== 'cerrado' && (
        <div className="modal-overlay">
          <div className="form-card" style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h2>{modalEstado === 'detalle' ? 'Detalle' : (registroActual ? 'Editar' : 'Nuevo')}</h2>
              <button className="btn-window close" onClick={() => setModalEstado('cerrado')}>✕</button>
            </div>
            {modalEstado === 'formulario' ? (
              <form onSubmit={guardarRegistro} style={{ padding: '20px' }}>
                {catalogoSeleccionado.fields.map(field => (
                  <div key={field.name} className="form-group">
                    <label>{field.label} {field.required && '*'}</label>
                    {field.type === 'select' ? (
                      <select name={field.name} value={formData[field.name] || ''} onChange={(e) => setFormData({...formData, [field.name]: e.target.value})} className="form-control" required={field.required}>
                        <option value="">Seleccione...</option>{field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : <input type={field.type} name={field.name} value={formData[field.name] || ''} onChange={(e) => setFormData({...formData, [field.name]: e.target.value})} className="form-control" required={field.required} />}
                  </div>
                ))}
                <button type="submit" className="btn-primary" style={{ marginTop: '16px' }}>Guardar</button>
              </form>
            ) : <div style={{ padding: '20px' }}>{catalogoSeleccionado.fields.map(f => <p key={f.name}><strong>{f.label}:</strong> {registroActual[f.name] || '-'}</p>)}</div>}
          </div>
        </div>
      )}
    </>
  );
};

export default CatalogosDashboard;