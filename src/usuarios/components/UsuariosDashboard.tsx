// src/usuarios/components/UsuariosDashboard.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, secondaryAuth } from '../../config/firebase';

export const UsuariosDashboard = () => {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [rolesDisponibles, setRolesDisponibles] = useState<any[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<any | null>(null);
  const [cargando, setCargando] = useState(false);

  // Estado del formulario
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rolesAsignados, setRolesAsignados] = useState<string[]>([]);

  // 1. Cargar Usuarios y Roles
  useEffect(() => {
    const unsubUsuarios = onSnapshot(collection(db, 'usuarios'), (snapshot) => {
      setUsuarios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubRoles = onSnapshot(collection(db, 'catalogo_roles'), (snapshot) => {
      setRolesDisponibles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubUsuarios();
      unsubRoles();
    };
  }, []);

  const handleAbrirModal = (user?: any) => {
    if (user) {
      setUsuarioActual(user);
      setNombre(user.nombre || '');
      setEmail(user.email || '');
      setPassword(''); // No mostramos ni editamos la contraseña aquí por seguridad
      setRolesAsignados(user.roles || []);
    } else {
      setUsuarioActual(null);
      setNombre('');
      setEmail('');
      setPassword('');
      setRolesAsignados([]);
    }
    setModalAbierto(true);
  };

  const handleToggleRol = (rolNombre: string) => {
    setRolesAsignados(prev => 
      prev.includes(rolNombre) ? prev.filter(r => r !== rolNombre) : [...prev, rolNombre]
    );
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (usuarioActual) {
        // MODO EDICIÓN (Solo actualizamos Firestore, Auth no permite cambiar emails ajenos desde el cliente)
        await setDoc(doc(db, 'usuarios', usuarioActual.id), {
          nombre: nombre.toUpperCase(),
          roles: rolesAsignados,
          fechaActualizacion: new Date().toISOString()
        }, { merge: true });
        
      } else {
        // MODO CREACIÓN (Usamos la App Secundaria para no cerrar la sesión del Admin)
        if (password.length < 6) {
          alert('La contraseña debe tener al menos 6 caracteres.');
          setCargando(false);
          return;
        }

        // 1. Crear en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUserId = userCredential.user.uid;

        // 2. Guardar el perfil en Firestore vinculándolo con su UID
        await setDoc(doc(db, 'usuarios', newUserId), {
          email: email.toLowerCase(),
          nombre: nombre.toUpperCase(),
          roles: rolesAsignados,
          fechaCreacion: new Date().toISOString(),
          activo: true
        });

        // 3. Cerrar sesión en la app secundaria para limpiarla
        await signOut(secondaryAuth);
      }
      
      setModalAbierto(false);
    } catch (error: any) {
      console.error(error);
      alert('Error: ' + (error.message || 'No se pudo guardar el usuario.'));
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (window.confirm('¿Eliminar el perfil de este usuario?\n\nNota: Por seguridad, esto elimina sus permisos, pero su cuenta de correo seguirá existiendo en la base de datos de Auth.')) {
      await deleteDoc(doc(db, 'usuarios', id));
    }
  };

  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#8b949e', margin: 0, fontWeight: '400' }}>
          Configuración {'>'} <span style={{ color: '#f0f6fc', fontWeight: '600' }}>Gestión de Usuarios ({usuarios.length})</span>
        </h2>
        <button className="btn-primary" onClick={() => handleAbrirModal()}>+ Nuevo Usuario</button>
      </div>

      <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}>
            <tr>
              <th style={{ padding: '16px', width: '160px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600' }}>ACCIONES</th>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600' }}>USUARIO</th>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600' }}>CORREO</th>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600' }}>ROLES ASIGNADOS</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>No hay usuarios registrados.</td></tr>
            ) : (
              usuarios.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => handleAbrirModal(user)} style={{ background: 'transparent', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', cursor: 'pointer', padding: '6px 12px' }}>Editar</button>
                      <button onClick={() => handleEliminar(user.id)} style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '6px 12px' }}>Eliminar</button>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: '#f0f6fc', fontWeight: '600' }}>{user.nombre}</td>
                  <td style={{ padding: '16px', color: '#8b949e' }}>{user.email}</td>
                  <td style={{ padding: '16px', color: '#c9d1d9' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {user.roles?.map((r: string) => (
                        <span key={r} style={{ backgroundColor: '#21262d', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid #30363d', color: '#58a6ff' }}>{r}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE EDICIÓN / CREACIÓN */}
      {modalAbierto && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="form-card" style={{ maxWidth: '600px', width: '100%', borderRadius: '12px', border: '1px solid #444', backgroundColor: '#0d1117' }}>
            <div className="form-header" style={{ padding: '24px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#f0f6fc', margin: 0, fontWeight: '500' }}>{usuarioActual ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button onClick={() => setModalAbierto(false)} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <form onSubmit={handleGuardar} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label style={{ color: '#8b949e', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Nombre Completo *</label>
                  <input 
                    type="text" 
                    value={nombre} 
                    onChange={(e) => setNombre(e.target.value)} 
                    required 
                    className="form-control" 
                    style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9', width: '100%', padding: '10px', borderRadius: '6px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ color: '#8b949e', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Correo Electrónico *</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    disabled={!!usuarioActual} // Deshabilitado si estamos editando
                    className="form-control" 
                    style={{ backgroundColor: !!usuarioActual ? '#161b22' : '#010409', border: '1px solid #30363d', color: !!usuarioActual ? '#8b949e' : '#c9d1d9', width: '100%', padding: '10px', borderRadius: '6px' }}
                  />
                </div>
              </div>

              {/* Solo pedimos contraseña al crear un usuario nuevo */}
              {!usuarioActual && (
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label style={{ color: '#8b949e', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Contraseña (Mín. 6 caracteres) *</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    minLength={6}
                    className="form-control" 
                    style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9', width: '100%', padding: '10px', borderRadius: '6px' }}
                  />
                </div>
              )}

              <div className="form-group">
                <label style={{ color: '#8b949e', fontSize: '0.85rem', display: 'block', marginBottom: '12px' }}>Roles del Usuario (Puedes elegir varios):</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#161b22', padding: '16px', borderRadius: '8px', border: '1px solid #30363d' }}>
                  {rolesDisponibles.length === 0 ? (
                    <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>No hay roles creados. Ve al menú de Roles primero.</span>
                  ) : (
                    rolesDisponibles.map(rol => (
                      <label key={rol.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c9d1d9', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input 
                          type="checkbox" 
                          checked={rolesAsignados.includes(rol.nombre)} 
                          onChange={() => handleToggleRol(rol.nombre)} 
                          style={{ accentColor: '#D84315', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        {rol.nombre}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #30363d', paddingTop: '20px' }}>
                <button type="button" onClick={() => setModalAbierto(false)} style={{ backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={cargando} style={{ backgroundColor: '#D84315', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>
                  {cargando ? 'Guardando...' : (usuarioActual ? 'Actualizar Usuario' : 'Crear Usuario')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};