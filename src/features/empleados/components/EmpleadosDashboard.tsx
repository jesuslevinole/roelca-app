// src/features/empleados/components/EmpleadosDashboard.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, eliminarRegistro } from '../../../config/firebase'; 
import { EmployeeForm } from './EmployeeForm';
import type { Employee } from '../../../types/empleado';

export const EmpleadosDashboard: React.FC = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [registroEditando, setRegistroEditando] = useState<Employee | null>(null);
  const [registros, setRegistros] = useState<Employee[]>([]);

  // Estados para los filtros (Visuales para coincidir con la UI)
  const [filtroActivo, setFiltroActivo] = useState('Todo');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // --- OBTENER DATOS EN TIEMPO REAL ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'empleados'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
      
      // Ordenar por ID de empleado de forma descendente (Ej: Emp-005, Emp-004...)
      data.sort((a, b) => {
        const numA = parseInt(a.employeeId.replace('Emp-', ''), 10) || 0;
        const numB = parseInt(b.employeeId.replace('Emp-', ''), 10) || 0;
        return numB - numA;
      });
      
      setRegistros(data);
    });

    return () => unsubscribe();
  }, []);

  // --- MANEJADORES DE ESTADO ---
  const handleNuevo = () => { 
    setRegistroEditando(null); 
    setEstadoFormulario('abierto'); 
  };
  
  const editarRegistro = (registro: Employee) => { 
    setRegistroEditando(registro); 
    setEstadoFormulario('abierto'); 
  };

  const handleEliminar = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente este registro?')) {
      try {
        await eliminarRegistro('empleados', id);
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert('Hubo un error al eliminar. Revisa tu conexión.');
      }
    }
  };

  const mostrarDato = (dato: any) => (dato && dato !== '' ? dato : '-');

  return (
    <>
      {/* RENDERIZADO DEL FORMULARIO MODAL */}
      {estadoFormulario !== 'cerrado' && (
        <EmployeeForm 
          estado={estadoFormulario} 
          initialData={registroEditando}
          onClose={() => { setEstadoFormulario('cerrado'); setRegistroEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} 
          onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      {/* --- HEADER CON BOTONES INTEGRADOS --- */}
      <div className="module-header" style={{ justifyContent: 'flex-end', paddingBottom: '16px' }}>
        <div className="action-buttons" style={{ display: 'flex', gap: '12px', position: 'relative' }}>
          
          <button className="btn btn-outline" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            Filtro: {filtroActivo} ▼
          </button>
          
          {mostrarFiltros && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', zIndex: 50, minWidth: '180px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', padding: '8px 0' }}>
              {['Todo', 'Activos', 'Inactivos'].map((f) => (
                <div 
                  key={f} 
                  style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '0.9rem', color: filtroActivo === f ? '#f0f6fc' : '#8b949e', backgroundColor: filtroActivo === f ? '#21262d' : 'transparent' }}
                  onClick={() => { setFiltroActivo(f); setMostrarFiltros(false); }}
                >
                  {f}
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-outline">Exportar CSV</button>
          <button className="btn btn-primary" onClick={handleNuevo}>+ Agregar Empleado</button>
        </div>
      </div>

      {/* --- ÁREA DE LA TABLA --- */}
      <div className="content-body" style={{ display: 'block' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th># Emp</th>
                <th>Nombre Completo</th>
                <th>Alias</th>
                <th>RFC</th>
                <th>Contacto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
                    No hay empleados registrados. Haz clic en "+ Agregar Empleado" para comenzar.
                  </td>
                </tr>
              ) : (
                registros.map((reg) => (
                  <tr key={reg.id}>
                    <td className="font-mono">{reg.employeeId}</td>
                    <td>{`${reg.firstName} ${reg.lastNamePaternal} ${reg.lastNameMaternal}`}</td>
                    <td><span style={{ fontStyle: reg.alias ? 'normal' : 'italic', color: reg.alias ? 'inherit' : '#8b949e' }}>{mostrarDato(reg.alias)}</span></td>
                    <td className="font-mono">{mostrarDato(reg.rfc)}</td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: '#c9d1d9' }}>{mostrarDato(reg.personalPhone)}</span>
                        <span style={{ color: '#8b949e' }}>{mostrarDato(reg.personalEmail)}</span>
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="actions-cell">
                        <button className="btn-small btn-edit" onClick={() => editarRegistro(reg)}>Editar</button>
                        <button className="btn-small btn-danger" onClick={() => handleEliminar(reg.id!)}>Eliminar</button>
                      </div>
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

export default EmpleadosDashboard;