// src/features/direcciones/components/DireccionesDashboard.tsx
import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase'; 
import type { DireccionRecord } from '../../../types/direccion';
import { FormularioDireccion } from './FormularioDireccion';

export const DireccionesDashboard = () => {
  const [registros, setRegistros] = useState<DireccionRecord[]>([]);
  const [filtroPais, setFiltroPais] = useState<string>('Todo');
  
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

  // Conteo para la barra lateral
  const conteoPorPais = registros.reduce((acc, reg) => {
    const p = reg.paisNombre || 'Sin País';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const registrosFiltrados = filtroPais === 'Todo' 
    ? registros 
    : registros.filter(r => r.paisNombre === filtroPais);

  return (
    <div className="module-container" style={{ padding: '24px', display: 'flex', gap: '24px', height: '100%', animation: 'fadeIn 0.3s ease' }}>
      
      {/* BARRA LATERAL (SIDEBAR) */}
      <div style={{ width: '250px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#c9d1d9', marginBottom: '16px', fontWeight: '600' }}>Direcciones ({registros.length})</h3>
        
        <button 
          onClick={() => setFiltroPais('Todo')}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', backgroundColor: filtroPais === 'Todo' ? '#D84315' : 'transparent', color: filtroPais === 'Todo' ? '#fff' : '#8b949e', transition: 'all 0.2s' }}
        >
          Todo
        </button>

        {Object.entries(conteoPorPais).map(([pais, conteo]) => (
          <button 
            key={pais}
            onClick={() => setFiltroPais(pais)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', backgroundColor: filtroPais === pais ? '#21262d' : 'transparent', color: filtroPais === pais ? '#c9d1d9' : '#8b949e', transition: 'all 0.2s' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.6rem' }}>▶</span> {pais}
            </span>
            <span style={{ backgroundColor: '#30363d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', color: '#8b949e' }}>
              {conteo}
            </span>
          </button>
        ))}
      </div>

      {/* ÁREA PRINCIPAL (TABLA) */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#f0f6fc', margin: 0, fontWeight: '500' }}>Base de Datos - Direcciones</h2>
          <button className="btn-primary" onClick={handleNuevoRegistro}>
            + Agregar Dirección
          </button>
        </div>

        <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}>
              <tr>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>País</th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>Dirección Completa</th>
                <th style={{ padding: '16px', width: '100px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>No hay direcciones registradas en esta categoría.</td></tr>
              ) : (
                registrosFiltrados.map(reg => (
                  <tr key={reg.id} style={{ borderBottom: '1px solid #21262d', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#21262d'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem' }}>{reg.paisNombre}</td>
                    <td style={{ padding: '16px', color: '#8b949e', fontSize: '0.95rem', lineHeight: '1.4' }}>{reg.direccionCompleta}</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button onClick={() => handleEditarRegistro(reg)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }} title="Editar">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                        </button>
                        <button onClick={() => handleEliminar(reg.id!)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Eliminar">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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