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
      
      data.sort((a, b) => {
        const numA = parseInt(a.numeroConvenio.replace('CONV-', ''), 10) || 0;
        const numB = parseInt(b.numeroConvenio.replace('CONV-', ''), 10) || 0;
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
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th># de Convenio ↓</th>
                <th>Fecha del convenio</th>
                <th>Fecha de vencimiento</th>
                <th>Cliente</th>
                <th>Moneda</th>
                <th>Credito</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#8b949e' }}>
                    Aún no hay convenios. Haz clic en "+ Agregar" para crear el primero.
                  </td>
                </tr>
              ) : (
                registros.map((reg) => (
                  <tr key={reg.id} onClick={() => editarRegistro(reg)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 'bold', color: '#f0f6fc' }}>{reg.numeroConvenio}</td>
                    <td>{formatearFechaEsp(reg.fechaConvenio)}</td>
                    <td>{formatearFechaEsp(reg.fechaVencimiento)}</td>
                    <td>{reg.clienteNombre}</td>
                    <td>{reg.monedaNombre}</td>
                    <td className="font-mono">{reg.credito}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-small btn-danger" onClick={(e) => handleEliminar(e, reg.id!)}>
                        Eliminar
                      </button>
                    </td>
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