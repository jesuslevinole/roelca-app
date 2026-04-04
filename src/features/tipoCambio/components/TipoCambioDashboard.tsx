// src/features/tipoCambio/components/TipoCambioDashboard.tsx
import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore'; 
import { db } from '../../../config/firebase';
import { registrarLog } from '../../../utils/logger';
import { FormularioTipoCambio } from './FormularioTipoCambio';

export const TipoCambioDashboard = () => {
  const [registros, setRegistros] = useState<any[]>([]);
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [registroEditando, setRegistroEditando] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tipo_cambio'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenar por fecha (más reciente primero)
      data.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
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

  const handleEliminar = async (id: string, fecha: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el registro del día ${fecha}?`)) {
      try {
        await deleteDoc(doc(db, 'tipo_cambio', id));
        
        // ¡USO DEL LOGGER!
        await registrarLog('Tipo de Cambio', 'Eliminación', `Eliminó el T.C. del día ${fecha}`);
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert("Hubo un error al intentar eliminar el registro.");
      }
    }
  };

  const renderTendencia = (tipo: string, texto: string) => {
    if (tipo === 'subio') return <span><span style={{color: '#ef4444', marginRight: '6px'}}>↗</span>{texto}</span>;
    if (tipo === 'bajo') return <span><span style={{color: '#3b82f6', marginRight: '6px'}}>↘</span>{texto}</span>;
    return <span><span style={{color: '#8b949e', marginRight: '6px'}}>—</span>{texto}</span>;
  };

  // Formato de fecha en español
  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return '';
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#8b949e', margin: 0, fontWeight: '400' }}>
          Bases de Datos {'>'} <span style={{ color: '#f0f6fc', fontWeight: '600' }}>Tipo de Cambio ({registros.length})</span>
        </h2>
        <button className="btn-primary" onClick={handleNuevo}>+ Nuevo Registro</button>
      </div>

      <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}>
            <tr>
              <th style={{ padding: '16px', width: '160px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600' }}>ACCIONES</th>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600' }}>FECHA</th>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600' }}>DÍA</th>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600' }}>T.C. DOF</th>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600' }}>TENDENCIA</th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>No hay registros de tipo de cambio.</td></tr>
            ) : (
              registros.map(registro => (
                <tr key={registro.id} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => editarRegistro(registro)} style={{ background: 'transparent', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', cursor: 'pointer', padding: '6px 12px' }}>Editar</button>
                      <button onClick={() => handleEliminar(registro.id, registro.fecha)} style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '6px 12px' }}>Eliminar</button>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: '#f0f6fc', fontWeight: '600' }}>
                    {formatearFecha(registro.fecha)}
                  </td>
                  <td style={{ padding: '16px', color: '#c9d1d9' }}>{registro.dia}</td>
                  <td style={{ padding: '16px', color: '#10b981', fontWeight: 'bold' }}>${registro.tcDof}</td>
                  <td style={{ padding: '16px', color: '#c9d1d9' }}>
                    {renderTendencia(registro.tipoTendencia, registro.tendencia)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {estadoFormulario !== 'cerrado' && (
        <FormularioTipoCambio
          estado={estadoFormulario as 'abierto' | 'minimizado'}
          initialData={registroEditando}
          registros={registros}
          onClose={() => setEstadoFormulario('cerrado')}
          onMinimize={() => setEstadoFormulario('minimizado')}
          onRestore={() => setEstadoFormulario('abierto')}
        />
      )}
    </div>
  );
};