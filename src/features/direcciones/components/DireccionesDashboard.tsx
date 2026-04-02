// src/features/direcciones/components/DireccionesDashboard.tsx
import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase'; 
import type { DireccionRecord } from '../../../types/direccion';
import { FormularioDireccion } from './FormularioDireccion';

export const DireccionesDashboard = () => {
  const [registros, setRegistros] = useState<DireccionRecord[]>([]);
  
  // Control del Modal ampliado con la vista 'detalle'
  const [modalEstado, setModalEstado] = useState<'cerrado' | 'abierto' | 'minimizado' | 'detalle'>('cerrado');
  const [registroActual, setRegistroActual] = useState<DireccionRecord | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'direcciones'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DireccionRecord));
      setRegistros(data);
    });
    return () => unsubscribe();
  }, []);

  const handleEliminar = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta dirección de forma permanente?')) {
      await deleteDoc(doc(db, 'direcciones', id));
    }
  };

  const handleNuevoRegistro = () => {
    setRegistroActual(null);
    setModalEstado('abierto');
  };

  const handleEditarRegistro = (reg: DireccionRecord) => {
    setRegistroActual(reg); // Esto pre-carga la información en el formulario
    setModalEstado('abierto');
  };

  const handleAbrirDetalle = (reg: DireccionRecord) => {
    setRegistroActual(reg);
    setModalEstado('detalle');
  };

  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      
      {/* CABECERA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#8b949e', margin: 0, fontWeight: '400' }}>
          Bases de Datos {'>'} <span style={{ color: '#f0f6fc', fontWeight: '600' }}>Direcciones ({registros.length})</span>
        </h2>
        <button className="btn-primary" onClick={handleNuevoRegistro}>
          + Agregar
        </button>
      </div>

      {/* ÁREA PRINCIPAL (TABLA COMPLETA CON SCROLL) */}
      <div 
        className="table-container" 
        style={{ 
          border: '1px solid #30363d', 
          borderRadius: '8px', 
          overflowX: 'auto', 
          overflowY: 'auto', 
          maxHeight: 'calc(100vh - 200px)' 
        }}
      >
        <table className="data-table" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              {/* Acciones en la primera columna */}
              <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 2, backgroundColor: '#161b22', borderBottom: '1px solid #30363d', borderRight: '1px solid #30363d', padding: '16px', width: '180px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>
                Acciones
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#161b22', borderBottom: '1px solid #30363d', padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>
                País
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#161b22', borderBottom: '1px solid #30363d', padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>
                Dirección Completa
              </th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>No hay direcciones registradas.</td></tr>
            ) : (
              registros.map(reg => (
                <tr 
                  key={reg.id} 
                  onClick={() => handleAbrirDetalle(reg)} // Al hacer clic en la fila se abre el detalle
                  style={{ borderBottom: '1px solid #21262d', transition: 'background-color 0.2s', cursor: 'pointer' }} 
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#21262d'} 
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Celda de Acciones */}
                  <td 
                    style={{ padding: '16px', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', left: 0, backgroundColor: 'inherit', borderRight: '1px solid #30363d', zIndex: 1 }}
                    onClick={(e) => e.stopPropagation()} // Evita que al hacer clic en los botones se abra el detalle
                  >
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleEditarRegistro(reg)} 
                        style={{ background: 'transparent', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleEliminar(reg.id!)} 
                        style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: '#f0f6fc', fontSize: '0.95rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {reg.paisNombre}
                  </td>
                  <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', lineHeight: '1.4' }}>
                    {reg.direccionCompleta}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* RENDERIZADO DEL FORMULARIO DE EDICIÓN/CREACIÓN */}
      {(modalEstado === 'abierto' || modalEstado === 'minimizado') && (
        <FormularioDireccion 
          estado={modalEstado} 
          initialData={registroActual} 
          onClose={() => setModalEstado('cerrado')} 
          onMinimize={() => setModalEstado('minimizado')} 
          onRestore={() => setModalEstado('abierto')} 
        />
      )}

      {/* RENDERIZADO DEL MODAL DE DETALLE (Solo Lectura) */}
      {modalEstado === 'detalle' && registroActual && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="form-card" style={{ maxWidth: '600px', width: '100%', borderRadius: '12px', border: '1px solid #444', backgroundColor: '#0d1117' }}>
            <div className="form-header" style={{ padding: '24px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#f0f6fc', margin: 0, fontWeight: '500' }}>Detalle de la Dirección</h2>
              <button onClick={() => setModalEstado('cerrado')} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div><span style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>País</span><div style={{ color: '#f0f6fc', fontSize: '1rem' }}>{registroActual.paisNombre || '-'}</div></div>
                <div><span style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Estado</span><div style={{ color: '#f0f6fc', fontSize: '1rem' }}>{registroActual.estadoNombre || '-'}</div></div>
                <div><span style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Municipio</span><div style={{ color: '#f0f6fc', fontSize: '1rem' }}>{registroActual.municipioNombre || '-'}</div></div>
                <div><span style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Colonia</span><div style={{ color: '#f0f6fc', fontSize: '1rem' }}>{registroActual.coloniaNombre || '-'}</div></div>
                <div><span style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Código Postal</span><div style={{ color: '#f0f6fc', fontSize: '1rem' }}>{registroActual.cpNombre || '-'}</div></div>
                <div><span style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Calle</span><div style={{ color: '#f0f6fc', fontSize: '1rem' }}>{registroActual.calleNombre || '-'}</div></div>
                <div><span style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}># Exterior</span><div style={{ color: '#f0f6fc', fontSize: '1rem' }}>{registroActual.numExterior || '-'}</div></div>
                <div><span style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}># Interior</span><div style={{ color: '#f0f6fc', fontSize: '1rem' }}>{registroActual.numInterior || '-'}</div></div>
              </div>
              
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #30363d' }}>
                <span style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Dirección Completa Formateada</span>
                <div style={{ color: '#58a6ff', fontSize: '1.1rem', backgroundColor: '#161b22', padding: '16px', borderRadius: '8px', border: '1px dashed #30363d' }}>
                  {registroActual.direccionCompleta || '-'}
                </div>
              </div>

              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalEstado('cerrado')} style={{ backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', padding: '10px 32px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};