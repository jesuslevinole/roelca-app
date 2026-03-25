// src/features/direcciones/components/DireccionesDashboard.tsx
import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase'; 
import type { DireccionRecord } from '../../../types/direccion';
import { FormularioDireccion } from './FormularioDireccion';

export const DireccionesDashboard = () => {
  const [registros, setRegistros] = useState<DireccionRecord[]>([]);
  
  // Control del Modal
  const [modalEstado, setModalEstado] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
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
    setRegistroActual(reg);
    setModalEstado('abierto');
  };

  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      
      {/* CABECERA AL ESTILO "TIPO DE CAMBIO" */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#8b949e', margin: 0, fontWeight: '400' }}>
          Bases de Datos {'>'} <span style={{ color: '#f0f6fc', fontWeight: '600' }}>Direcciones ({registros.length})</span>
        </h2>
        <button className="btn-primary" onClick={handleNuevoRegistro}>
          + Agregar
        </button>
      </div>

      {/* ÁREA PRINCIPAL (TABLA COMPLETA) */}
      <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}>
            <tr>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>País</th>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>Dirección Completa</th>
              <th style={{ padding: '16px', width: '150px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>No hay direcciones registradas.</td></tr>
            ) : (
              registros.map(reg => (
                <tr key={reg.id} style={{ borderBottom: '1px solid #21262d', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#21262d'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '16px', color: '#f0f6fc', fontSize: '0.95rem', fontWeight: '600' }}>{reg.paisNombre}</td>
                  <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', lineHeight: '1.4' }}>{reg.direccionCompleta}</td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleEditarRegistro(reg)} 
                        style={{ background: 'transparent', border: '1px solid #30363d', borderRadius: '4px', color: '#c9d1d9', cursor: 'pointer', padding: '4px 12px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleEliminar(reg.id!)} 
                        style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '4px 12px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* RENDERIZADO DEL FORMULARIO MODAL */}
      {modalEstado !== 'cerrado' && (
        <FormularioDireccion 
          estado={modalEstado} 
          initialData={registroActual} 
          onClose={() => setModalEstado('cerrado')} 
          onMinimize={() => setModalEstado('minimizado')} 
          onRestore={() => setModalEstado('abierto')} 
        />
      )}
    </div>
  );
};