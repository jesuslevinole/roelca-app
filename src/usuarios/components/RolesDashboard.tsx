// src/usuarios/components/RolesDashboard.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, getDoc, setDoc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { registrarLog } from '../../utils/logger';

export const RolesDashboard: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [ipOficial, setIpOficial] = useState('');
  const [guardandoIp, setGuardandoIp] = useState(false);
  
  // Estados para el Modal de Rol
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rolEditando, setRolEditando] = useState<any>(null);
  
  const [nombreRol, setNombreRol] = useState('');
  const [modulos, setModulos] = useState<string[]>([]);
  const [cargandoRol, setCargandoRol] = useState(false);

  const listaModulos = [
    'Operaciones', 'Proveedores', 'Empresas (Bases de Datos)', 'Catálogos',
    'Usuarios y Roles', 'Clientes', 'Direcciones (Bases de Datos)', 'Empleados',
    'Historial de Actividad'
  ];

  useEffect(() => {
    // Suscripción a Roles
    const unsubRoles = onSnapshot(collection(db, 'roles'), (snapshot) => {
      const rolesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRoles(rolesData);
    });

    // Cargar Configuración IP
    const fetchConfig = async () => {
      const configRef = doc(db, 'configuracion', 'seguridad');
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        setIpOficial(snap.data().ipOficial || '');
      }
    };
    fetchConfig();

    return () => unsubRoles();
  }, []);

  const detectarIp = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      setIpOficial(data.ip);
    } catch (e) {
      alert("No se pudo detectar tu IP automáticamente.");
    }
  };

  const guardarIp = async () => {
    if (!ipOficial) return;
    setGuardandoIp(true);
    try {
      await setDoc(doc(db, 'configuracion', 'seguridad'), { ipOficial }, { merge: true });
      await registrarLog('Seguridad', 'Actualización', `Actualizó la IP Oficial del Reloj Checador a: ${ipOficial}`);
      alert("IP Oficial guardada. El Reloj Checador ahora usará esta red.");
    } catch (e) {
      alert("Error al guardar IP.");
    } finally {
      setGuardandoIp(false);
    }
  };

  const abrirModalNuevo = () => {
    setRolEditando(null);
    setNombreRol('');
    setModulos([]);
    setModalAbierto(true);
  };

  const abrirModalEditar = (rol: any) => {
    setRolEditando(rol);
    setNombreRol(rol.nombre);
    setModulos(rol.modulosPermitidos || []);
    setModalAbierto(true);
  };

  const toggleModulo = (mod: string) => {
    setModulos(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  const guardarRol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreRol.trim()) return alert("El nombre del rol es obligatorio");
    
    setCargandoRol(true);
    try {
      const datosRol = {
        nombre: nombreRol.toUpperCase().trim(),
        modulosPermitidos: modulos,
        timestamp: Date.now()
      };

      if (rolEditando) {
        await updateDoc(doc(db, 'roles', rolEditando.id), datosRol);
        await registrarLog('Roles', 'Edición', `Editó el rol: ${datosRol.nombre}`);
      } else {
        await addDoc(collection(db, 'roles'), datosRol);
        await registrarLog('Roles', 'Creación', `Creó el rol: ${datosRol.nombre}`);
      }
      setModalAbierto(false);
    } catch (error) {
      alert("Error al guardar rol.");
    } finally {
      setCargandoRol(false);
    }
  };

  const eliminarRol = async (id: string, nombre: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el rol ${nombre}?`)) {
      try {
        await deleteDoc(doc(db, 'roles', id));
        await registrarLog('Roles', 'Eliminación', `Eliminó el rol: ${nombre}`);
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      
      {/* SECCIÓN 1: CONFIGURACIÓN IP (EXCLUSIVO PARA EL RELOJ) */}
      <div style={{ backgroundColor: '#0d1117', border: '1px solid #3b82f6', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', color: '#f0f6fc', fontSize: '1.1rem' }}>
          🛡️ Configuración de Red para Reloj Checador
        </h3>
        <p style={{ color: '#8b949e', fontSize: '0.9rem', marginBottom: '20px' }}>
          Define aquí la Dirección IP pública del internet de tu oficina. Los colaboradores operativos <strong>solo podrán registrar su asistencia</strong> si se encuentran conectados a esta red.
        </p>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <input 
            type="text" 
            value={ipOficial} 
            onChange={(e) => setIpOficial(e.target.value)} 
            placeholder="Ej. 192.168.1.1" 
            className="form-control" 
            style={{ width: '250px', backgroundColor: '#010409', color: '#c9d1d9', border: '1px solid #30363d' }} 
          />
          <button onClick={detectarIp} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            📍 Detectar mi IP actual
          </button>
          <button onClick={guardarIp} className="btn btn-primary" disabled={guardandoIp} style={{ backgroundColor: '#3b82f6', border: 'none' }}>
            {guardandoIp ? 'Guardando...' : 'Guardar IP Oficial'}
          </button>
        </div>
      </div>

      {/* SECCIÓN 2: LISTA DE ROLES */}
      <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#8b949e', margin: 0, fontWeight: '400' }}>
          Configuración {'>'} <span style={{ color: '#f0f6fc', fontWeight: '600' }}>Roles y Permisos ({roles.length})</span>
        </h2>
        <button className="btn btn-primary" onClick={abrirModalNuevo}>+ Nuevo Rol</button>
      </div>

      <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#161b22' }}>
            <tr>
              <th style={{ padding: '16px', width: '160px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>ACCIONES</th>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>NOMBRE DEL ROL</th>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', borderBottom: '1px solid #30363d' }}>MÓDULOS PERMITIDOS</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(rol => (
              <tr key={rol.id} style={{ borderBottom: '1px solid #21262d' }}>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                      onClick={() => abrirModalEditar(rol)} 
                      className="btn-small btn-edit"
                      style={{ background: 'transparent', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', cursor: 'pointer', padding: '4px 12px' }}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => eliminarRol(rol.id, rol.nombre)} 
                      className="btn-small btn-danger"
                      style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '4px 12px' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
                <td style={{ padding: '16px', color: '#f0f6fc', fontWeight: 'bold' }}>{rol.nombre}</td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {rol.modulosPermitidos?.map((mod: string) => (
                      <span key={mod} style={{ backgroundColor: '#21262d', color: '#c9d1d9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #30363d' }}>
                        {mod}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE EDICIÓN DE ROL (Limpio, sin checkbox de red) */}
      {modalAbierto && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="form-card" style={{ maxWidth: '500px', backgroundColor: '#0d1117', border: '1px solid #444', borderRadius: '12px' }}>
            <div className="form-header" style={{ padding: '24px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#f0f6fc', margin: 0, fontWeight: '500' }}>
                {rolEditando ? 'Editar Rol' : 'Nuevo Rol'}
              </h2>
              <button onClick={() => setModalAbierto(false)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={guardarRol} style={{ padding: '24px' }}>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ color: '#8b949e' }}>Nombre del Rol (Ej. VENTAS, ADMIN) *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={nombreRol} 
                  onChange={(e) => setNombreRol(e.target.value)} 
                  required 
                  style={{ backgroundColor: '#010409', color: '#f0f6fc', border: '1px solid #30363d' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label className="form-label" style={{ color: '#8b949e', marginBottom: '12px' }}>Selecciona los módulos a los que tendrá acceso:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#161b22', padding: '16px', borderRadius: '8px', border: '1px solid #30363d' }}>
                  {listaModulos.map(mod => (
                    <label key={mod} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c9d1d9', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input 
                        type="checkbox" 
                        checked={modulos.includes(mod)} 
                        onChange={() => toggleModulo(mod)} 
                        style={{ accentColor: '#D84315', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      {mod}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #30363d' }}>
                <button type="button" onClick={() => setModalAbierto(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={cargandoRol} style={{ flex: 1, backgroundColor: '#D84315', border: 'none' }}>
                  {cargandoRol ? 'Guardando...' : 'Guardar Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};