// src/features/unidades/components/UnidadesDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, eliminarRegistro } from '../../../config/firebase'; 
import { FormularioUnidad } from './FormularioUnidad';
import type { UnidadRecord } from '../../../types/unidad'; // ✅ RUTA CORREGIDA

export const UnidadesDashboard: React.FC = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [registroEditando, setRegistroEditando] = useState<UnidadRecord | null>(null);
  const [registros, setRegistros] = useState<UnidadRecord[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'unidades'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UnidadRecord[];
      setRegistros(data);
    });
    return () => unsubscribe();
  }, []);

  const handleNuevo = () => { 
    setRegistroEditando(null); 
    setEstadoFormulario('abierto'); 
  };
  
  const editarRegistro = (registro: UnidadRecord) => { 
    setRegistroEditando(registro); 
    setEstadoFormulario('abierto'); 
  };

  const handleEliminar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente esta unidad?')) {
      try {
        await eliminarRegistro('unidades', id);
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert('Hubo un error al eliminar. Revisa tu conexión.');
      }
    }
  };

  const registrosAgrupados = useMemo(() => {
    const grupos: Record<string, UnidadRecord[]> = {};
    
    registros.forEach(reg => {
      const nombreGrupo = reg.tipoUnidadNombre || 'Sin Asignar';
      if (!grupos[nombreGrupo]) {
        grupos[nombreGrupo] = [];
      }
      grupos[nombreGrupo].push(reg);
    });

    return Object.keys(grupos).sort().reduce((acc, key) => {
      acc[key] = grupos[key].sort((a, b) => a.unidad.localeCompare(b.unidad));
      return acc;
    }, {} as Record<string, UnidadRecord[]>);
  }, [registros]);

  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      
      {estadoFormulario !== 'cerrado' && (
        <FormularioUnidad 
          estado={estadoFormulario} 
          initialData={registroEditando}
          onClose={() => { setEstadoFormulario('cerrado'); setRegistroEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} 
          onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '24px' }}>
        <h1 className="module-title" style={{ fontSize: '1.25rem', color: '#8b949e', margin: 0, fontWeight: '400' }}>
          Bases de Datos &gt; <span style={{ color: '#f0f6fc', fontWeight: 'bold' }}>Unidades Propias ({registros.length})</span>
        </h1>
        <button className="btn btn-primary" onClick={handleNuevo} style={{ backgroundColor: '#D84315', border: 'none', padding: '8px 16px', borderRadius: '6px', color: 'white', fontWeight: '600' }}>
          + Agregar
        </button>
      </div>

      <div className="content-body" style={{ display: 'block' }}>
        <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          <table className="data-table" style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#161b22', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '12px 16px', width: '140px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', position: 'sticky', left: 0, backgroundColor: '#161b22', zIndex: 12, borderRight: '1px solid #30363d', borderBottom: '1px solid #30363d' }}>
                  ACCIONES
                </th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>UNIDAD</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>STATUS</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>PLACAS</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>SERIE</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>MARCA</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>MODELO</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>TANQUE 1</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>TANQUE 2</th>
                <th style={{ padding: '12px 16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>PORCENTAJE</th>
              </tr>
            </thead>
            
            {Object.keys(registrosAgrupados).length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
                    Aún no hay unidades registradas.
                  </td>
                </tr>
              </tbody>
            ) : (
              Object.entries(registrosAgrupados).map(([nombreGrupo, items]) => (
                <tbody key={nombreGrupo}>
                  <tr style={{ backgroundColor: '#21262d' }}>
                    <td colSpan={10} style={{ padding: '12px 16px', fontWeight: 'bold', color: '#f0f6fc', borderBottom: '1px solid #30363d', borderTop: '1px solid #30363d' }}>
                      {nombreGrupo} <span style={{ backgroundColor: '#30363d', color: '#8b949e', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginLeft: '8px' }}>{items.length}</span>
                    </td>
                  </tr>
                  
                  {items.map(reg => (
                    <tr 
                      key={reg.id} 
                      style={{ borderBottom: '1px solid #21262d', transition: 'background-color 0.2s', cursor: 'pointer' }}
                      onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = '#161b22'} 
                      onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => editarRegistro(reg)}
                    >
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

                      <td style={{ padding: '12px 16px', fontWeight: '500', color: '#f0f6fc' }}>{reg.unidad}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {reg.activo ? (
                          <span style={{ backgroundColor: 'rgba(63, 185, 80, 0.2)', color: '#3fb950', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>Activo</span>
                        ) : (
                          <span style={{ backgroundColor: 'rgba(139, 148, 158, 0.2)', color: '#8b949e', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>Inactivo</span>
                        )}
                      </td>
                      <td className="font-mono" style={{ padding: '12px 16px', color: '#c9d1d9' }}>{reg.placas || '-'}</td>
                      <td className="font-mono" style={{ padding: '12px 16px', color: '#c9d1d9' }}>{reg.serie || '-'}</td>
                      <td style={{ padding: '12px 16px', color: '#c9d1d9' }}>{reg.marca || '-'}</td>
                      <td style={{ padding: '12px 16px', color: '#c9d1d9' }}>{reg.modelo || '-'}</td>
                      <td className="font-mono" style={{ padding: '12px 16px', color: '#c9d1d9' }}>{reg.tanqueUno || 0}</td>
                      <td className="font-mono" style={{ padding: '12px 16px', color: '#c9d1d9' }}>{reg.tanqueDos || 0}</td>
                      <td className="font-mono" style={{ padding: '12px 16px', color: '#c9d1d9' }}>{Number(reg.porcentajeRecarga || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              ))
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default UnidadesDashboard; // ✅ EXPORTACIÓN POR DEFECTO PARA QUE APP.TSX NO FALLE