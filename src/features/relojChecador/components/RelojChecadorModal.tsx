// src/features/relojChecador/components/RelojChecadorModal.tsx
import React, { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { registrarLog } from '../../../utils/logger';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  usuario: any;
}

export const RelojChecadorModal: React.FC<Props> = ({ isOpen, onClose, usuario }) => {
  const [tiempoActual, setTiempoActual] = useState(new Date());
  const [tipoRegistro, setTipoRegistro] = useState('Llegada al Turno');
  const [ubicacion, setUbicacion] = useState('');
  const [obteniendoGps, setObteniendoGps] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Reloj en tiempo real
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTiempoActual(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    setObteniendoGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setUbicacion(mapsLink);
        setObteniendoGps(false);
      },
      (error) => {
        console.error("Error GPS:", error);
        alert('No se pudo obtener la ubicación. Por favor, asegúrate de dar permisos o escríbela manualmente.');
        setObteniendoGps(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ubicacion) {
      alert("La ubicación es obligatoria para poder checar.");
      return;
    }

    setCargando(true);
    try {
      const fechaLocal = tiempoActual.toLocaleDateString('es-MX');
      const horaLocal = tiempoActual.toLocaleTimeString('es-MX');

      await addDoc(collection(db, 'reloj_checador'), {
        userId: usuario.id,
        userName: usuario.nombre || usuario.correo, // Fallback en caso de que falte el nombre
        fecha: fechaLocal,
        hora: horaLocal,
        tipoRegistro: tipoRegistro,
        ubicacion: ubicacion,
        timestamp: tiempoActual.getTime() // Para ordenar correctamente en la BD
      });

      await registrarLog('Asistencia', 'Chequeo', `${usuario.nombre || usuario.correo} registró: ${tipoRegistro}`);
      alert("¡Registro guardado exitosamente!");
      onClose();
    } catch (error) {
      console.error("Error al guardar chequeo:", error);
      alert("Error al guardar. Revisa tu conexión.");
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen || !usuario) return null;

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(6px)', zIndex: 3000 }}>
      <div className="form-card" style={{ maxWidth: '450px', backgroundColor: '#0d1117', border: '1px solid #3b82f6', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
        <div style={{ backgroundColor: '#161b22', padding: '24px', borderBottom: '1px solid #30363d', textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: '#f0f6fc', fontSize: '1.4rem' }}>⏱️ Reloj Checador</h2>
          <p style={{ color: '#8b949e', margin: '8px 0 0 0', fontSize: '0.9rem' }}>Registra tu asistencia del día</p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          
          {/* Reloj Digital Visual */}
          <div style={{ textAlign: 'center', marginBottom: '24px', backgroundColor: '#010409', padding: '16px', borderRadius: '8px', border: '1px solid #30363d' }}>
            <div style={{ color: '#58a6ff', fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px' }}>
              {tiempoActual.toLocaleTimeString('es-MX', { hour12: false })}
            </div>
            <div style={{ color: '#c9d1d9', fontSize: '0.9rem', marginTop: '4px', textTransform: 'uppercase' }}>
              {tiempoActual.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#8b949e' }}>Colaborador</label>
            <input type="text" className="form-control" value={usuario.nombre || usuario.correo} disabled style={{ backgroundColor: '#21262d', color: '#f0f6fc', fontWeight: 'bold', cursor: 'not-allowed' }} />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#8b949e' }}>Tipo de Registro *</label>
            <select className="form-control" value={tipoRegistro} onChange={(e) => setTipoRegistro(e.target.value)} required style={{ backgroundColor: '#010409', color: '#c9d1d9', border: '1px solid #30363d' }}>
              <option value="Llegada al Turno">Llegada al Turno</option>
              <option value="Salida a la Comida">Salida a la Comida</option>
              <option value="Llegada de la Comida">Llegada de la Comida</option>
              <option value="Salida del Turno">Salida del Turno</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#8b949e' }}>Ubicación *</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                className="form-control" 
                value={ubicacion} 
                onChange={(e) => setUbicacion(e.target.value)} 
                placeholder="Presiona el botón o escribe tu ubicación..." 
                required 
                style={{ flex: 1, backgroundColor: '#010409', color: '#c9d1d9', border: '1px solid #30363d' }}
              />
              <button type="button" onClick={obtenerUbicacion} disabled={obteniendoGps} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                {obteniendoGps ? 'Buscando...' : '📍 GPS'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={cargando || obteniendoGps} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold' }}>
              {cargando ? 'Registrando...' : 'Confirmar Chequeo'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};