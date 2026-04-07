// src/features/relojChecador/components/RelojChecadorModal.tsx
import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { registrarLog } from '../../../utils/logger';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  usuario: any;
}

export const RelojChecadorModal: React.FC<Props> = ({ isOpen, onClose, usuario }) => {
  const [tiempoActual, setTiempoActual] = useState(new Date());
  const [tipoRegistro, setTipoRegistro] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  
  const [obteniendoGps, setObteniendoGps] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  // Estado para guardar los chequeos que el usuario YA hizo hoy
  const [registrosHoy, setRegistrosHoy] = useState<string[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  // Reloj en tiempo real
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTiempoActual(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Validar qué ha checado hoy al abrir el modal
  useEffect(() => {
    if (!isOpen || !usuario) return;

    const fetchRegistrosHoy = async () => {
      setCargandoHistorial(true);
      try {
        const fechaLocal = new Date().toLocaleDateString('es-MX');
        
        // Buscamos en Firebase qué movimientos hizo ESTE usuario HOY
        const q = query(
          collection(db, 'reloj_checador'),
          where('userId', '==', usuario.id),
          where('fecha', '==', fechaLocal)
        );
        
        const snap = await getDocs(q);
        const tipos = snap.docs.map(doc => doc.data().tipoRegistro);
        
        setRegistrosHoy(tipos);

        // Auto-seleccionar la opción lógica siguiente
        if (!tipos.includes('Llegada al Turno')) {
          setTipoRegistro('Llegada al Turno');
        } else if (tipos.includes('Llegada al Turno') && !tipos.includes('Salida a la Comida') && !tipos.includes('Salida del Turno')) {
          setTipoRegistro('Salida del Turno'); // Por defecto propone salir, aunque la comida esté habilitada
        } else if (tipos.includes('Salida a la Comida') && !tipos.includes('Llegada de la Comida')) {
          setTipoRegistro('Llegada de la Comida');
        } else if (tipos.includes('Llegada de la Comida') && !tipos.includes('Salida del Turno')) {
          setTipoRegistro('Salida del Turno');
        } else {
          setTipoRegistro(''); // Ya terminó todo
        }

      } catch (error) {
        console.error("Error al obtener historial de hoy:", error);
      } finally {
        setCargandoHistorial(false);
      }
    };

    fetchRegistrosHoy();
  }, [isOpen, usuario]);

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    setObteniendoGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsLink = `http://googleusercontent.com/maps.google.com/?q=${latitude},${longitude}`;
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
    if (!tipoRegistro) {
      alert("No hay un tipo de registro válido seleccionado.");
      return;
    }

    setCargando(true);
    try {
      const fechaLocal = tiempoActual.toLocaleDateString('es-MX');
      const horaLocal = tiempoActual.toLocaleTimeString('es-MX');

      await addDoc(collection(db, 'reloj_checador'), {
        userId: usuario.id,
        userName: usuario.nombre || usuario.correo, 
        fecha: fechaLocal,
        hora: horaLocal,
        tipoRegistro: tipoRegistro,
        ubicacion: ubicacion,
        timestamp: tiempoActual.getTime() 
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

  // LÓGICA ESTRICTA DE OPCIONES DISPONIBLES
  const hasLlegadaTurno = registrosHoy.includes('Llegada al Turno');
  const hasSalidaComida = registrosHoy.includes('Salida a la Comida');
  const hasLlegadaComida = registrosHoy.includes('Llegada de la Comida');
  const hasSalidaTurno = registrosHoy.includes('Salida del Turno');

  const opcionesDisponibles: string[] = [];

  if (!hasLlegadaTurno) {
    opcionesDisponibles.push('Llegada al Turno');
  } else if (!hasSalidaTurno) {
    // Si ya llegó al turno y no ha salido del turno, puede hacer lo siguiente:
    if (!hasSalidaComida) {
      opcionesDisponibles.push('Salida a la Comida');
    }
    if (hasSalidaComida && !hasLlegadaComida) {
      opcionesDisponibles.push('Llegada de la Comida');
    }
    // Puede salir del turno si NO ha salido a comer, o si ya salió Y volvió de comer
    if (!hasSalidaComida || (hasSalidaComida && hasLlegadaComida)) {
      opcionesDisponibles.push('Salida del Turno');
    }
  }

  const jornadaTerminada = hasSalidaTurno;

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(6px)', zIndex: 3000 }}>
      <div className="form-card" style={{ maxWidth: '450px', backgroundColor: '#0d1117', border: '1px solid #3b82f6', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
        <div style={{ backgroundColor: '#161b22', padding: '24px', borderBottom: '1px solid #30363d', textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: '#f0f6fc', fontSize: '1.4rem' }}>⏱️ Reloj Checador</h2>
          <p style={{ color: '#8b949e', margin: '8px 0 0 0', fontSize: '0.9rem' }}>Registra tu asistencia del día</p>
        </div>

        {cargandoHistorial ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>
            Verificando historial del día...
          </div>
        ) : (
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

            {jornadaTerminada ? (
              <div style={{ backgroundColor: 'rgba(46, 160, 67, 0.1)', border: '1px solid rgba(46, 160, 67, 0.4)', padding: '16px', borderRadius: '8px', textAlign: 'center', marginBottom: '24px' }}>
                <span style={{ color: '#3fb950', fontWeight: 'bold', fontSize: '1.1rem', display: 'block', marginBottom: '8px' }}>¡Jornada Finalizada! 🎉</span>
                <span style={{ color: '#8b949e', fontSize: '0.9rem' }}>Ya has registrado tu salida del turno por el día de hoy. ¡Buen trabajo!</span>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#8b949e' }}>Tipo de Registro *</label>
                  <select 
                    className="form-control" 
                    value={tipoRegistro} 
                    onChange={(e) => setTipoRegistro(e.target.value)} 
                    required 
                    style={{ backgroundColor: '#010409', color: '#c9d1d9', border: '1px solid #30363d' }}
                  >
                    {opcionesDisponibles.map(opcion => (
                      <option key={opcion} value={opcion}>{opcion}</option>
                    ))}
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
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">{jornadaTerminada ? 'Cerrar' : 'Cancelar'}</button>
              
              {!jornadaTerminada && (
                <button type="submit" className="btn btn-primary" disabled={cargando || obteniendoGps || !tipoRegistro} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold' }}>
                  {cargando ? 'Registrando...' : 'Confirmar Chequeo'}
                </button>
              )}
            </div>

          </form>
        )}
      </div>
    </div>
  );
};