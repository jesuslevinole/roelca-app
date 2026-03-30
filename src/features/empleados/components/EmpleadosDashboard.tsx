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

  const handleEliminar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evita que se abra el modal de edición al hacer clic en eliminar
    if (window.confirm('¿Estás seguro de que deseas dar de baja y eliminar a este empleado permanentemente?')) {
      try {
        await eliminarRegistro('empleados', id);
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert('Hubo un error al eliminar. Revisa tu conexión.');
      }
    }
  };

  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      
      {/* RENDERIZADO CONDICIONAL DEL FORMULARIO MODAL */}
      {estadoFormulario !== 'cerrado' && (
        <EmployeeForm 
          estado={estadoFormulario} 
          initialData={registroEditando}
          onClose={() => { setEstadoFormulario('cerrado'); setRegistroEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} 
          onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      {/* CABECERA DEL MÓDULO */}
      <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="module-title" style={{ fontSize: '1.25rem', color: '#8b949e', margin: 0, fontWeight: '400' }}>
          Recursos Humanos &gt; <span style={{ color: '#f0f6fc', fontWeight: '600' }}>Base de Empleados ({registros.length})</span>
        </h1>
        <button className="btn btn-primary" onClick={handleNuevo} style={{ backgroundColor: '#D84315', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
          + Agregar Empleado
        </button>
      </div>

      {/* ÁREA DE LA TABLA */}
      <div className="content-body" style={{ display: 'block' }}>
        <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}>
              <tr>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}># Emp ↓</th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>Nombre Completo</th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>Alias</th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>RFC</th>
                <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>Contacto</th>
                <th style={{ padding: '16px', width: '150px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>Acciones</th>
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
                  <tr 
                    key={reg.id} 
                    onClick={() => editarRegistro(reg)} 
                    style={{ borderBottom: '1px solid #21262d', transition: 'background-color 0.2s', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#21262d'} 
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* ID */}
                    <td style={{ padding: '16px', fontWeight: 'bold', color: '#58a6ff', fontSize: '0.95rem' }}>
                      {reg.employeeId}
                    </td>
                    
                    {/* NOMBRE COMPLETO CONCATENADO */}
                    <td style={{ padding: '16px', color: '#f0f6fc', fontSize: '0.95rem' }}>
                      {`${reg.firstName} ${reg.lastNamePaternal} ${reg.lastNameMaternal}`}
                    </td>
                    
                    {/* ALIAS */}
                    <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', fontStyle: reg.alias ? 'normal' : 'italic' }}>
                      {reg.alias || 'N/A'}
                    </td>
                    
                    {/* RFC */}
                    <td style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                      {reg.rfc}
                    </td>

                    {/* CONTACTO CONCATENADO */}
                    <td style={{ padding: '16px', color: '#8b949e', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: '#c9d1d9' }}>📞 {reg.personalPhone}</span>
                        <span>✉️ {reg.personalEmail}</span>
                      </div>
                    </td>

                    {/* ACCIONES */}
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); editarRegistro(reg); }} 
                          style={{ background: 'transparent', border: '1px solid #30363d', borderRadius: '4px', color: '#c9d1d9', cursor: 'pointer', padding: '4px 12px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b949e'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#c9d1d9'; }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={(e) => handleEliminar(e, reg.id!)} 
                          style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '4px 12px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ef4444'; }}
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
      </div>
    </div>
  );
};

export default EmpleadosDashboard;