// src/features/tipoCambio/components/TipoCambioDashboard.tsx
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, eliminarRegistro } from '../../../config/firebase'; // <-- Conexión a Firebase
import { FormularioTipoCambio } from './FormularioTipoCambio';

const TipoCambioDashboard = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [registroEditando, setRegistroEditando] = useState<any | null>(null);
  
  // Estado inicial vacío (se llenará con los datos de Firebase)
  const [registros, setRegistros] = useState<any[]>([]);

  // --- LÓGICA DE FIREBASE EN TIEMPO REAL ---
  useEffect(() => {
    // Escucha la colección 'tipo_cambio' en Firebase
    const unsubscribe = onSnapshot(collection(db, 'tipo_cambio'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenar por fecha (más reciente primero)
      data.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
      setRegistros(data);
    });

    return () => unsubscribe(); // Limpia la conexión al salir del módulo
  }, []);

  const handleNuevo = () => { setRegistroEditando(null); setEstadoFormulario('abierto'); };
  const editarRegistro = (registro: any) => { setRegistroEditando(registro); setEstadoFormulario('abierto'); };

  // --- FUNCIÓN PARA ELIMINAR ---
  const handleEliminar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evita que se abra el modal de editar al hacer clic en eliminar
    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente este registro?')) {
      try {
        await eliminarRegistro('tipo_cambio', id);
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert('Hubo un error al eliminar. Revisa tu conexión.');
      }
    }
  };

  const renderTendencia = (tipo: string, texto: string) => {
    if (tipo === 'subio') return <span><span style={{color: '#ef4444', marginRight:'6px'}}>📈</span>{texto}</span>;
    if (tipo === 'bajo') return <span><span style={{color: '#3b82f6', marginRight:'6px'}}>📉</span>{texto}</span>;
    return <span><span style={{color: '#8b949e', marginRight:'6px'}}>—</span>{texto}</span>;
  };

  return (
    <>
      {estadoFormulario !== 'cerrado' && (
        <FormularioTipoCambio 
          estado={estadoFormulario} 
          initialData={registroEditando}
          registros={registros} // <--- ¡NUEVA LÍNEA AGREGADA AQUÍ!
          onClose={() => { setEstadoFormulario('cerrado'); setRegistroEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} 
          onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      <div className="module-header" style={{ justifyContent: 'space-between', paddingBottom: '16px' }}>
        <h1 className="module-title" style={{ fontSize: '1.2rem', color: '#8b949e' }}>
          Bases de Datos &gt; <span style={{ color: '#f0f6fc', fontWeight: 'bold' }}>Tipo de Cambio DOF (433)</span>
        </h1>
        <button className="btn btn-primary" onClick={handleNuevo}>+ Agregar</button>
      </div>

      <div className="content-body" style={{ display: 'block' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Día</th>
                <th>Fecha ↓</th>
                <th>T.C. DOF</th>
                <th>Tendencia</th>
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
                    <td style={{ fontWeight: '500', color: '#f0f6fc' }}>{reg.dia}</td>
                    <td>{reg.fecha}</td>
                    <td className="font-mono">{reg.tcDof}</td>
                    <td>{renderTendencia(reg.tipoTendencia, reg.tendencia)}</td>
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

export default TipoCambioDashboard;