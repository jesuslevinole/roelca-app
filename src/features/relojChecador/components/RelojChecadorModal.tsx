// src/features/relojChecador/components/RelojChecadorModal.tsx
import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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
  
  const [coordenadasVisuales, setCoordenadasVisuales] = useState(''); 
  const [ubicacionBD, setUbicacionBD] = useState(''); 
  
  const [obteniendoGps, setObteniendoGps] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  const [registrosHoy, setRegistrosHoy] = useState<string[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [ipValida, setIpValida] = useState<boolean | null>(null);
  const [ipActualUsuario, setIpActualUsuario] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTiempoActual(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !usuario) return;

    const inicializarChecador = async () => {
      setCargandoDatos(true);
      try {
        const rolesExentos = ['Admin', 'Gerencia', 'Sistemas'];
        let accesoPermitido = true;

        if (!rolesExentos.includes(usuario.rol)) {
          const configRef = doc(db, 'configuracion', 'seguridad');
          const configSnap = await getDoc(configRef);
          const ipOficial = configSnap.exists() ? configSnap.data().ipOficial : null;

          if (ipOficial) {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            const ipActual = data.ip;
            setIpActualUsuario(ipActual);

            if (ipActual !== ipOficial) {
              accesoPermitido = false;
            }
          }
        }

        setIpValida(accesoPermitido);

        if (!accesoPermitido) {
          setCargandoDatos(false);
          return;
        }

        const fechaLocal = new Date().toLocaleDateString('es-MX');
        const q = query(
          collection(db, 'reloj_checador'),
          where('userId', '==', usuario.id),
          where('fecha', '==', fechaLocal)
        );
        
        const snap = await getDocs(q);
        const tipos = snap.docs.map(doc => doc.data().tipoRegistro);
        
        setRegistrosHoy(tipos);

        if (!tipos.includes('Llegada al Turno')) {
          setTipoRegistro('Llegada al Turno');
        } else if (tipos.includes('Llegada al Turno') && !tipos.includes('Salida a la Comida') && !tipos.includes('Salida del Turno')) {
          setTipoRegistro('Salida del Turno');
        } else if (tipos.includes('Salida a la Comida') && !tipos.includes('Llegada de la Comida')) {
          setTipoRegistro('Llegada de la Comida');
        } else if (tipos.includes('Llegada de la Comida') && !tipos.includes('Salida del Turno')) {
          setTipoRegistro('Salida del Turno');
        } else {
          setTipoRegistro(''); 
        }

      } catch (error) {
        console.error("Error al inicializar checador:", error);
        alert("Hubo un problema de conexión al verificar la red.");
      } finally {
        setCargandoDatos(false);
      }
    };

    inicializarChecador();
  }, [isOpen, usuario]);

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    
    setObteniendoGps(true);

    // CONFIGURACIÓN ROBUSTA PARA PC DE ESCRITORIO Y NAVEGADORES PRIVADOS
    const opcionesGps = {
      enableHighAccuracy: false, // En PC, true provoca fallos si no hay chip GPS
      timeout: 15000,           // Máximo 15 segundos esperando
      maximumAge: 0             // No usar caché vieja
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        setCoordenadasVisuales(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        
        // Link real y funcional de Google Maps con Pin Exacto
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        setUbicacionBD(mapsLink);
        
        setObteniendoGps(false);
      },
      (error) => {
        console.error("Error GPS detallado:", error);
        let mensaje = 'No se pudo obtener la ubicación automáticamente.\n\nMotivo: ';
        
        if (error.code === 1) mensaje += 'Permiso denegado. (Revisa la configuración de Privacidad de Windows/Mac o del navegador Brave).';
        else if (error.code === 2) mensaje += 'Posición no disponible. (Común en PC de escritorio sin tarjeta WiFi).';
        else if (error.code === 3) mensaje += 'El tiempo de espera se agotó.';
        else mensaje += 'Error desconocido.';

        alert(mensaje + '\n\nPuedes escribir la dirección o "Ubicación en Oficina" manualmente en el recuadro si tu rol lo permite.');
        setObteniendoGps(false);
      },
      opcionesGps
    );
  };

  const handleIngresoManualGPS = (e: React.ChangeEvent<HTMLInputElement>) => {
    const texto = e.target.value;
    setCoordenadasVisuales(texto);
    setUbicacionBD(texto); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ubicacionBD) {
      alert("La ubicación es obligatoria para poder checar. Por favor presiona el botón GPS o escríbela a mano.");
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
        ubicacion: ubicacionBD, 
        ipRegistro: ipActualUsuario || 'Exento',
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

  const hasLlegadaTurno = registrosHoy.includes('Llegada al Turno');
  const hasSalidaComida = registrosHoy.includes('Salida a la Comida');
  const hasLlegadaComida = registrosHoy.includes('Llegada de la Comida');
  const hasSalidaTurno = registrosHoy.includes('Salida del Turno');

  const opcionesDisponibles: string[] = [];

  if (!hasLlegadaTurno) {
    opcionesDisponibles.push('Llegada al Turno');
  } else if (!hasSalidaTurno) {
    if (!hasSalidaComida) opcionesDisponibles.push('Salida a la Comida');
    if (hasSalidaComida && !hasLlegadaComida) opcionesDisponibles.push('Llegada de la Comida');
    if (!hasSalidaComida || (hasSalidaComida && hasLlegadaComida)) opcionesDisponibles.push('Salida del Turno');
  }

  const jornadaTerminada = hasSalidaTurno;

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(6px)', zIndex: 3000 }}>
      <div className="form-card" style={{ maxWidth: '450px', backgroundColor: '#0d1117', border: '1px solid #3b82f6', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
        <div style={{ backgroundColor: '#161b22', padding: '24px', borderBottom: '1px solid #30363d', textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: '#f0f6fc', fontSize: '1.4rem' }}>⏱️ Reloj Checador</h2>
          <p style={{ color: '#8b949e', margin: '8px 0 0 0', fontSize: '0.9rem' }}>Registra tu asistencia del día</p>
        </div>

        {cargandoDatos ? (
          <div style={{ padding: '60px 40px', textAlign: 'center', color: '#8b949e' }}>
            <div style={{ marginBottom: '16px', fontSize: '1.5rem' }}>⏳</div>
            Verificando credenciales de red y leyendo historial del día...
          </div>
        ) : ipValida === false ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ backgroundColor: 'rgba(218, 54, 51, 0.1)', border: '1px solid rgba(218, 54, 51, 0.4)', padding: '24px', borderRadius: '8px' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>⛔</span>
              <h3 style={{ color: '#ff4d4d', margin: '0 0 12px 0', fontSize: '1.2rem' }}>Acceso Denegado</h3>
              <p style={{ color: '#c9d1d9', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                No estás conectado a la red WiFi oficial de la oficina.<br/><br/>
                Tu IP actual es: <strong style={{ color: '#f0f6fc' }}>{ipActualUsuario}</strong>
              </p>
            </div>
            <button onClick={onClose} className="btn btn-outline" style={{ marginTop: '24px', width: '100%' }}>Cerrar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            
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
                  <label className="form-label" style={{ color: '#8b949e' }}>Ubicación (Lat, Lng) *</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="text" 
                      className="form-control font-mono" 
                      value={coordenadasVisuales} 
                      onChange={handleIngresoManualGPS} 
                      placeholder="Presiona el botón de GPS..." 
                      required 
                      readOnly={obteniendoGps}
                      style={{ flex: 1, backgroundColor: '#010409', color: '#c9d1d9', border: '1px solid #30363d', fontSize: '0.9rem' }}
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