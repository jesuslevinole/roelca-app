// src/features/conveniosClientes/components/ConveniosClientesDashboard.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, eliminarRegistro } from '../../../config/firebase'; 
import { FormularioConvenioCliente } from './FormularioConvenioCliente';
import type { ConvenioClienteRecord } from '../../../types/convenioCliente';

export const ConveniosClientesDashboard: React.FC = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [registroEditando, setRegistroEditando] = useState<ConvenioClienteRecord | null>(null);
  const [registros, setRegistros] = useState<ConvenioClienteRecord[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'convenios_clientes'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ConvenioClienteRecord[];
      
      // Ordenamiento descendente estricto por número de convenio (Mayor a menor)
      data.sort((a, b) => {
        const numA = parseInt(a.numeroConvenio.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.numeroConvenio.replace(/\D/g, ''), 10) || 0;
        return numB - numA;
      });
      
      setRegistros(data);
    });

    return () => unsubscribe();
  }, []);

  const handleNuevo = () => { 
    setRegistroEditando(null); 
    setEstadoFormulario('abierto'); 
  };
  
  const editarRegistro = (registro: ConvenioClienteRecord) => { 
    setRegistroEditando(registro); 
    setEstadoFormulario('abierto'); 
  };

  const handleEliminar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente este convenio?')) {
      try {
        await eliminarRegistro('convenios_clientes', id);
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert('Hubo un error al eliminar. Revisa tu conexión.');
      }
    }
  };

  const formatearFechaEsp = (fechaString: string) => {
    if (!fechaString) return '-';
    const fechaObj = new Date(fechaString + 'T00:00:00'); 
    return fechaObj.toLocaleDateString('es-ES', { 
      year: 'numeric', month: '2-digit', day: '2-digit' 
    });
  };

  return (
    <>
      {estadoFormulario !== 'cerrado' && (
        <FormularioConvenioCliente 
          estado={estadoFormulario} 
          initialData={registroEditando}
          registrosExistentes={registros}
          onClose={() => { setEstadoFormulario('cerrado'); setRegistroEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} 
          onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      <div className="module-header" style={{ justifyContent: 'space-between', paddingBottom: '16px' }}>
        <h1 className="module-title" style={{ fontSize: '1.2rem', color: '#8b949e' }}>
          Clientes &gt; <span style={{ color: '#f0f6fc', fontWeight: 'bold' }}>Convenio de Clientes</span>
        </h1>
        <button className="btn btn-primary" onClick={handleNuevo}>+ Agregar</button>
      </div>

      <div className="content-body" style={{ display: 'block' }}>
        <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          <table className="data-table" style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#161b22', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                {/* 1. Columna de Acciones al principio */}
                <th style={{ padding: '16px', width: '160px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', position: 'sticky', left: 0, backgroundColor: '#161b22', zIndex: 12, borderRight: '1px solid #30363d', borderBottom: '1px solid #30363d' }}>
                  Acciones
                </th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}># de Convenio ↓</th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Fecha del convenio</th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Fecha de vencimiento</th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Cliente</th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Moneda</th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>Credito</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
                    Aún no hay convenios. Haz clic en "+ Agregar" para crear el primero.
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

                    <td style={{ padding: '16px', fontWeight: 'bold', color: '#f0f6fc', fontSize: '0.95rem' }}>{reg.numeroConvenio}</td>
                    <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{formatearFechaEsp(reg.fechaConvenio)}</td>
                    <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{formatearFechaEsp(reg.fechaVencimiento)}</td>
                    <td style={{ padding: '16px', color: '#f0f6fc', fontSize: '0.95rem', fontWeight: '500' }}>{reg.clienteNombre}</td>
                    <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{reg.monedaNombre}</td>
                    <td className="font-mono" style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{reg.credito}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ConveniosClientesDashboard;