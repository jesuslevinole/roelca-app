// src/features/catalogos/components/CatalogosDashboard.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro, eliminarRegistro } from '../../../config/firebase';

// Lista de catálogos con íconos SVG profesionales
const listaCatalogos = [
  { id: 'aduanas', titulo: 'Aduanas', icono: <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /> },
  { id: 'bancos', titulo: 'Bancos', icono: <path d="M4 10h3v7H4zM10.5 10h3v7h-3zM2 19h20v3H2zM17 10h3v7h-3zM12 1L2 6v2h20V6L12 1z" /> },
  { id: 'deducciones', titulo: 'Deducciones', icono: <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z" /> },
  { id: 'departamentos', titulo: 'Departamentos', icono: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /> },
  { id: 'direcciones_pais', titulo: 'Direcciones / País', icono: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /> },
  { id: 'moneda', titulo: 'Moneda', icono: <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /> },
  { id: 'operaciones', titulo: 'Operaciones (Catálogo)', icono: <path d="M19 15v4H5v-4h14m1-2H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zM7 18.5c-.82 0-1.5-.68-1.5-1.5s.68-1.5 1.5-1.5 1.5.68 1.5 1.5-.68 1.5-1.5 1.5zM19 5v4H5V5h14m1-2H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zM7 8.5c-.82 0-1.5-.68-1.5-1.5S6.18 5.5 7 5.5s1.5.68 1.5 1.5S7.82 8.5 7 8.5z" /> },
];

const CatalogosDashboard = () => {
  const [catalogoSeleccionado, setCatalogoSeleccionado] = useState<any | null>(null);
  
  // Estados para el CRUD del catálogo específico
  const [registros, setRegistros] = useState<any[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [registroEditando, setRegistroEditando] = useState<any | null>(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '', status: 'Activo' });

  // Escuchar cambios cuando se selecciona un catálogo
  useEffect(() => {
    if (!catalogoSeleccionado) return;
    
    const nombreColeccion = `catalogo_${catalogoSeleccionado.id}`;
    const unsubscribe = onSnapshot(collection(db, nombreColeccion), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegistros(data);
    });

    return () => unsubscribe();
  }, [catalogoSeleccionado]);

  // Manejadores del Formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const abrirNuevo = () => {
    setRegistroEditando(null);
    setFormData({ nombre: '', descripcion: '', status: 'Activo' });
    setModalAbierto(true);
  };

  const abrirEditar = (reg: any) => {
    setRegistroEditando(reg);
    setFormData({ nombre: reg.nombre, descripcion: reg.descripcion || '', status: reg.status });
    setModalAbierto(true);
  };

  const guardarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombreColeccion = `catalogo_${catalogoSeleccionado.id}`;
    try {
      if (registroEditando) {
        await actualizarRegistro(nombreColeccion, registroEditando.id, formData);
      } else {
        await agregarRegistro(nombreColeccion, formData);
      }
      setModalAbierto(false);
    } catch (error) {
      alert('Error al guardar en Firebase.');
    }
  };

  const eliminarReg = async (id: string) => {
    if (window.confirm('¿Eliminar este registro del catálogo?')) {
      await eliminarRegistro(`catalogo_${catalogoSeleccionado.id}`, id);
    }
  };

  // --- VISTA 1: CUADRÍCULA DE CATÁLOGOS ---
  if (!catalogoSeleccionado) {
    return (
      <>
        <div className="module-header" style={{ paddingBottom: '16px' }}>
          <h1 className="module-title" style={{ fontSize: '1.4rem', color: '#f0f6fc' }}>Catálogos del Sistema</h1>
        </div>
        <div className="content-body" style={{ display: 'block' }}>
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
        </div>
      </>
    );
  }

  // --- VISTA 2: TABLA CRUD DEL CATÁLOGO SELECCIONADO ---
  return (
    <>
      <div className="module-header" style={{ justifyContent: 'space-between', paddingBottom: '16px' }}>
        <div className="breadcrumb-nav">
          <span onClick={() => setCatalogoSeleccionado(null)}>Catálogos</span>
          <span style={{ margin: '0 8px', color: '#30363d' }}>/</span>
          <span style={{ color: '#f0f6fc', fontWeight: 'bold' }}>{catalogoSeleccionado.titulo}</span>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>+ Agregar Registro</button>
      </div>

      <div className="content-body" style={{ display: 'block' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre / Valor</th>
                <th>Descripción</th>
                <th>Status</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#8b949e' }}>No hay registros en este catálogo.</td></tr>
              ) : (
                registros.map((reg) => (
                  <tr key={reg.id}>
                    <td style={{ fontWeight: '500', color: '#f0f6fc' }}>{reg.nombre}</td>
                    <td>{reg.descripcion || '-'}</td>
                    <td><span className={`dot ${reg.status === 'Activo' ? 'dot-green' : 'dot-gray'}`}></span>{reg.status}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="btn-small btn-edit" onClick={() => abrirEditar(reg)}>Editar</button>
                        <button className="btn-small btn-danger" onClick={() => eliminarReg(reg.id)}>Borrar</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GENÉRICO DEL CATÁLOGO */}
      {modalAbierto && (
        <div className="modal-overlay">
          <div className="form-card" style={{ maxWidth: '400px' }}>
            <div className="form-header">
              <h2>{registroEditando ? 'Editar Registro' : 'Nuevo Registro'}</h2>
              <button onClick={() => setModalAbierto(false)} className="btn-window close">✕</button>
            </div>
            <form onSubmit={guardarRegistro} style={{ padding: '20px' }}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input type="text" name="nombre" className="form-control" value={formData.nombre} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input type="text" name="descripcion" className="form-control" value={formData.descripcion} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button type="button" onClick={() => setModalAbierto(false)} className="btn btn-outline">Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CatalogosDashboard;