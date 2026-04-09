// src/features/remolques/components/RemolquesDashboard.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, eliminarRegistro } from '../../../config/firebase'; 
import { FormularioRemolque } from './FormularioRemolque';
import type { RemolqueRecord } from '../../../types/remolque'; // ✅ RUTA CORREGIDA

export const RemolquesDashboard: React.FC = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [registroEditando, setRegistroEditando] = useState<RemolqueRecord | null>(null);
  const [registros, setRegistros] = useState<RemolqueRecord[]>([]);
  const [busqueda, setBusqueda] = useState('');

  // Suscripción en tiempo real a Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'remolques'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RemolqueRecord[];
      // Ordenar alfabéticamente por nombre
      data.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setRegistros(data);
    });
    return () => unsubscribe();
  }, []);

  const handleNuevo = () => { 
    setRegistroEditando(null); 
    setEstadoFormulario('abierto'); 
  };
  
  const editarRegistro = (registro: RemolqueRecord) => { 
    setRegistroEditando(registro); 
    setEstadoFormulario('abierto'); 
  };

  const handleEliminar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente este remolque?')) {
      try {
        await eliminarRegistro('remolques', id);
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert('Hubo un error al eliminar. Revisa tu conexión.');
      }
    }
  };

  // Filtrado de búsqueda en tabla
  const registrosFiltrados = registros.filter(reg => 
    reg.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    reg.placas.toLowerCase().includes(busqueda.toLowerCase()) ||
    (reg.propietarioNombre && reg.propietarioNombre.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      
      {estadoFormulario !== 'cerrado' && (
        <FormularioRemolque 
          estado={estadoFormulario} 
          initialData={registroEditando}
          onClose={() => { setEstadoFormulario('cerrado'); setRegistroEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} 
          onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      {/* HEADER Y BÚSQUEDA */}
      <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '24px' }}>
        <h1 className="module-title" style={{ fontSize: '1.25rem', color: '#8b949e', margin: 0, fontWeight: '400' }}>
          Bases de Datos &gt; <span style={{ color: '#f0f6fc', fontWeight: 'bold' }}>Remolques ({registros.length})</span>
        </h1>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Buscar remolque o placa..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#010409', color: '#c9d1d9', minWidth: '250px' }}
          />
          <button className="btn btn-primary" onClick={handleNuevo} style={{ backgroundColor: '#D84315', border: 'none', padding: '8px 16px', borderRadius: '6px', color: 'white', fontWeight: '600' }}>
            + Agregar Remolque
          </button>
        </div>
      </div>

      {/* TABLA RESPONSIVA */}
      <div className="content-body" style={{ display: 'block' }}>
        <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          <table className="data-table" style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#161b22', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '12px 16px', width: '140px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', position: 'sticky', left: 0, backgroundColor: '#161b22', zIndex: 12, borderRight: '1px solid #30363d', borderBottom: '1px solid #30363d' }}>
                  ACCIONES
                </th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>NOMBRE</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>TIPO</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>PROPIETARIO</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>PLACAS</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>SERIE</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>MARCA</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>AÑO</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>UBICACIÓN (País/Est)</th>
              </tr>
            </thead>
            
            <tbody>
              {registrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
                    {busqueda ? 'No se encontraron remolques para tu búsqueda.' : 'Aún no hay remolques registrados.'}
                  </td>
                </tr>
              ) : (
                registrosFiltrados.map(reg => (
                  <tr 
                    key={reg.id} 
                    style={{ borderBottom: '1px solid #21262d', transition: 'background-color 0.2s', cursor: 'pointer' }}
                    onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = '#161b22'} 
                    onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => editarRegistro(reg)}
                  >
                    {/* ACCIONES */}
                    <td style={{ padding: '12px 16px', textAlign: 'center', position: 'sticky', left: 0, backgroundColor: 'inherit', zIndex: 5, borderRight: '1px solid #30363d' }} onClick={(e: any) => e.stopPropagation()}>
                      <div className="actions-cell" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          className="btn-small btn-edit" 
                          onClick={(e) => { e.stopPropagation(); editarRegistro(reg); }}
                          style={{ background: 'transparent', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', cursor: 'pointer', padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          Editar
                        </button>
                        <button 
                          className="btn-small btn-danger" 
                          onClick={(e) => handleEliminar(e, reg.id!)}
                          style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>

                    {/* DATOS */}
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#f0f6fc' }}>{reg.nombre}</td>
                    <td style={{ padding: '12px 16px', color: '#c9d1d9' }}>{reg.tipoNombre || '-'}</td>
                    <td style={{ padding: '12px 16px', color: '#c9d1d9', fontWeight: '500' }}>{reg.propietarioNombre || '-'}</td>
                    <td className="font-mono" style={{ padding: '12px 16px', color: '#c9d1d9' }}>{reg.placas || '-'}</td>
                    <td className="font-mono" style={{ padding: '12px 16px', color: '#c9d1d9' }}>{reg.serie || '-'}</td>
                    <td style={{ padding: '12px 16px', color: '#c9d1d9' }}>{reg.marca || '-'}</td>
                    <td className="font-mono" style={{ padding: '12px 16px', color: '#c9d1d9' }}>{reg.anio || '-'}</td>
                    <td style={{ padding: '12px 16px', color: '#c9d1d9', fontSize: '0.85rem' }}>
                      {reg.paisNombre}, {reg.estadoNombre}
                    </td>
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

export default RemolquesDashboard;