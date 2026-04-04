// src/usuarios/components/RolesDashboard.tsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc, setDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { registrarLog } from '../../utils/logger';

const MODULOS_SISTEMA = [
  'Operaciones',
  'Clientes',
  'Proveedores',
  'Empleados',
  'Empresas (Bases de Datos)',
  'Direcciones (Bases de Datos)',
  'Catálogos',
  'Usuarios y Roles',
  'Historial de Actividad'
];

export const RolesDashboard = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rolActual, setRolActual] = useState<any | null>(null);
  const [cargando, setCargando] = useState(false);

  const [nombre, setNombre] = useState('');
  const [modulosPermitidos, setModulosPermitidos] = useState<string[]>([]);
  const [requiereIPOficina, setRequiereIPOficina] = useState(false);

  // ESTADOS PARA LA CONFIGURACIÓN GLOBAL DE IP
  const [ipOficina, setIpOficina] = useState('');
  const [guardandoIp, setGuardandoIp] = useState(false);

  useEffect(() => {
    // Cargar roles
    const unsubscribeRoles = onSnapshot(collection(db, 'catalogo_roles'), (snapshot) => {
      setRoles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Cargar configuración de IP global
    const cargarConfiguracionIP = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'configuracion', 'seguridad'));
        if (docSnap.exists()) {
          setIpOficina(docSnap.data().ipOficina || '');
        }
      } catch (error) {
        console.error("Error cargando IP de oficina:", error);
      }
    };
    cargarConfiguracionIP();

    return () => unsubscribeRoles();
  }, []);

  const handleAbrirModal = (rol?: any) => {
    if (rol) {
      setRolActual(rol);
      setNombre(rol.nombre || '');
      setModulosPermitidos(rol.modulos || []);
      setRequiereIPOficina(rol.requiereIPOficina || false);
    } else {
      setRolActual(null);
      setNombre('');
      setModulosPermitidos([]);
      setRequiereIPOficina(false);
    }
    setModalAbierto(true);
  };

  const handleToggleModulo = (modulo: string) => {
    setModulosPermitidos(prev => 
      prev.includes(modulo) ? prev.filter(m => m !== modulo) : [...prev, modulo]
    );
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      const data = {
        nombre: nombre.toUpperCase(),
        modulos: modulosPermitidos,
        requiereIPOficina: requiereIPOficina,
        fechaActualizacion: new Date().toISOString()
      };

      if (rolActual) {
        await setDoc(doc(db, 'catalogo_roles', rolActual.id), data, { merge: true });
        await registrarLog('Roles y Permisos', 'Edición', `Editó los permisos del rol: ${data.nombre}`);
      } else {
        await addDoc(collection(db, 'catalogo_roles'), data);
        await registrarLog('Roles y Permisos', 'Creación', `Creó un nuevo rol: ${data.nombre}`);
      }
      setModalAbierto(false);
    } catch (error) {
      alert('Error guardando el rol');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (rol: any) => {
    if (window.confirm(`¿Eliminar el rol "${rol.nombre}" de forma permanente?`)) {
      await deleteDoc(doc(db, 'catalogo_roles', rol.id));
      await registrarLog('Roles y Permisos', 'Eliminación', `Eliminó el rol: ${rol.nombre}`);
    }
  };

  // FUNCIONES PARA LA IP GLOBAL
  const obtenerMiIpActual = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      setIpOficina(data.ip);
    } catch (error) {
      alert("No se pudo detectar la IP. Por favor, escríbela manualmente.");
    }
  };

  const handleGuardarIPGlobal = async () => {
    setGuardandoIp(true);
    try {
      await setDoc(doc(db, 'configuracion', 'seguridad'), { ipOficina: ipOficina }, { merge: true });
      await registrarLog('Roles y Permisos', 'Seguridad', `Actualizó la IP de la Oficina autorizada a: ${ipOficina}`);
      alert("IP de seguridad guardada correctamente.");
    } catch (error) {
      alert("Error al guardar la configuración de seguridad.");
    } finally {
      setGuardandoIp(false);
    }
  };

  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      
      {/* TARJETA DE CONFIGURACIÓN GLOBAL DE SEGURIDAD (IP) */}
      <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '8px', border: '1px solid #3b82f6', marginBottom: '32px' }}>
        <h3 style={{ color: '#58a6ff', margin: '0 0 12px 0', fontSize: '1rem' }}>🛡️ Configuración de Seguridad Perimetral</h3>
        <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '16px' }}>
          Define aquí la Dirección IP pública del internet de tu oficina. Los roles que tengan activa la restricción de red solo podrán iniciar sesión si su equipo coincide con esta IP.
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Ej. 190.200.50.12" 
            value={ipOficina}
            onChange={(e) => setIpOficina(e.target.value)}
            style={{ padding: '10px', backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9', borderRadius: '6px', width: '250px' }}
          />
          <button onClick={obtenerMiIpActual} style={{ background: 'transparent', border: '1px solid #8b949e', color: '#c9d1d9', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
            📍 Detectar mi IP actual
          </button>
          <button onClick={handleGuardarIPGlobal} disabled={guardandoIp} style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
            {guardandoIp ? 'Guardando...' : 'Guardar IP Oficial'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#8b949e', margin: 0, fontWeight: '400' }}>
          Configuración {'>'} <span style={{ color: '#f0f6fc', fontWeight: '600' }}>Roles y Permisos ({roles.length})</span>
        </h2>
        <button className="btn-primary" onClick={() => handleAbrirModal()}>+ Nuevo Rol</button>
      </div>

      <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}>
            <tr>
              <th style={{ padding: '16px', width: '160px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600' }}>ACCIONES</th>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600' }}>NOMBRE DEL ROL</th>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600' }}>RESTRICCIÓN DE RED</th>
              <th style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600' }}>MÓDULOS PERMITIDOS</th>
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>No hay roles registrados.</td></tr>
            ) : (
              roles.map(rol => (
                <tr key={rol.id} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => handleAbrirModal(rol)} style={{ background: 'transparent', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', cursor: 'pointer', padding: '6px 12px' }}>Editar</button>
                      <button onClick={() => handleEliminar(rol)} style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '6px 12px' }}>Eliminar</button>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: '#f0f6fc', fontWeight: '600' }}>{rol.nombre}</td>
                  
                  {/* INDICADOR DE SEGURIDAD */}
                  <td style={{ padding: '16px' }}>
                    {rol.requiereIPOficina ? (
                      <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>🔒 Solo Oficina</span>
                    ) : (
                      <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>🌐 Acceso Remoto</span>
                    )}
                  </td>

                  <td style={{ padding: '16px', color: '#c9d1d9' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {rol.modulos?.map((m: string) => (
                        <span key={m} style={{ backgroundColor: '#21262d', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid #30363d' }}>{m}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="form-card" style={{ maxWidth: '500px', width: '100%', borderRadius: '12px', border: '1px solid #444', backgroundColor: '#0d1117' }}>
            <div className="form-header" style={{ padding: '24px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#f0f6fc', margin: 0, fontWeight: '500' }}>{rolActual ? 'Editar Rol' : 'Nuevo Rol'}</h2>
              <button onClick={() => setModalAbierto(false)} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <form onSubmit={handleGuardar} style={{ padding: '24px' }}>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ color: '#8b949e', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Nombre del Rol (Ej. VENTAS, ADMIN) *</label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)} 
                  required 
                  className="form-control" 
                  style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9', width: '100%', padding: '10px', borderRadius: '6px' }}
                />
              </div>

              {/* CHECKBOX DE SEGURIDAD POR IP */}
              <div className="form-group" style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', color: '#f0f6fc', cursor: 'pointer', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={requiereIPOficina}
                    onChange={(e) => setRequiereIPOficina(e.target.checked)}
                    style={{ accentColor: '#ef4444', width: '20px', height: '20px', marginTop: '2px' }}
                  />
                  <div>
                    <span style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Bloquear fuera de la oficina</span>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: '#8b949e', lineHeight: '1.4' }}>
                      Si activas esta casilla, los usuarios con este rol serán bloqueados automáticamente si intentan iniciar sesión desde una red WiFi ajena a la configurada.
                    </span>
                  </div>
                </label>
              </div>

              <div className="form-group">
                <label style={{ color: '#8b949e', fontSize: '0.85rem', display: 'block', marginBottom: '12px' }}>Selecciona los módulos a los que tendrá acceso:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#161b22', padding: '16px', borderRadius: '8px', border: '1px solid #30363d' }}>
                  {MODULOS_SISTEMA.map(modulo => (
                    <label key={modulo} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c9d1d9', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input 
                        type="checkbox" 
                        checked={modulosPermitidos.includes(modulo)} 
                        onChange={() => handleToggleModulo(modulo)} 
                        style={{ accentColor: '#D84315', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      {modulo}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #30363d', paddingTop: '20px' }}>
                <button type="button" onClick={() => setModalAbierto(false)} style={{ backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={cargando} style={{ backgroundColor: '#D84315', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>
                  {cargando ? 'Guardando...' : 'Guardar Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};