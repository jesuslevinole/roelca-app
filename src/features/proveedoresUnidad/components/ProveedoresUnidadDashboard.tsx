// src/features/proveedoresUnidad/components/ProveedoresUnidadDashboard.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, eliminarRegistro } from '../../../config/firebase'; 
import { FormularioProveedorUnidad } from './FormularioProveedorUnidad';

export const ProveedoresUnidadDashboard: React.FC = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [registroEditando, setRegistroEditando] = useState<any | null>(null);
  const [registros, setRegistros] = useState<any[]>([]);

  // Suscripción en tiempo real a Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'proveedores_unidad'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenar alfabéticamente por Apellido como buena práctica
      data.sort((a: any, b: any) => a.apellido.localeCompare(b.apellido));
      
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

  const handleEliminar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente este proveedor?')) {
      try {
        await eliminarRegistro('proveedores_unidad', id);
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert('Hubo un error al eliminar. Revisa tu conexión.');
      }
    }
  };

  return (
    <>
      {estadoFormulario !== 'cerrado' && (
        <FormularioProveedorUnidad 
          estado={estadoFormulario} 
          initialData={registroEditando}
          onClose={() => { setEstadoFormulario('cerrado'); setRegistroEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} 
          onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      <div className="module-header" style={{ justifyContent: 'space-between', paddingBottom: '16px' }}>
        <h1 className="module-title" style={{ fontSize: '1.2rem', color: '#8b949e' }}>
          Bases de Datos &gt; <span style={{ color: '#f0f6fc', fontWeight: 'bold' }}>Proveedores de Unidad</span>
        </h1>
        <button className="btn btn-primary" onClick={handleNuevo}>+ Agregar</button>
      </div>

      <div className="content-body" style={{ display: 'block' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Proveedor Empresa</th>
                <th>Nombre Completo</th>
                <th>Licencia Federal</th>
                <th>Visa</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#8b949e' }}>
                    Aún no hay registros. Haz clic en "+ Agregar" para crear el primero.
                  </td>
                </tr>
              ) : (
                registros.map((reg) => (
                  <tr key={reg.id} onClick={() => editarRegistro(reg)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: '500', color: '#f0f6fc' }}>{reg.proveedorNombre}</td>
                    <td>{reg.nombre} {reg.apellido}</td>
                    <td className="font-mono">{reg.numeroLicencia || '-'}</td>
                    <td className="font-mono">{reg.numeroVisa || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-small btn-danger" onClick={(e) => handleEliminar(e, reg.id)}>
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

export default ProveedoresUnidadDashboard;