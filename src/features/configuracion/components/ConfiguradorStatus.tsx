// src/features/configuracion/components/ConfiguradorStatus.tsx
import { useState, useEffect } from 'react'; // ✅ ALERTA CORREGIDA (Se eliminó 'React')
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';

interface ReglaStatus {
  id: string; 
  orden: number;
  nombreStatus: string;
  tipoMecanismo: 'automatico' | 'manual';
  camposRequeridos: string[]; 
}

const CAMPOS_OPERACION = [
  { id: 'fechaServicio', label: 'Fecha de Servicio' },
  { id: 'origen', label: 'Origen' },
  { id: 'destino', label: 'Destino' },
  { id: 'clientePaga', label: 'Cliente Paga' },
  { id: 'convenio', label: 'Convenio' },
  { id: 'operador', label: 'Operador Asignado' },
  { id: 'unidad', label: 'Unidad Asignada' },
  { id: 'numeroRemolque', label: 'Número de Remolque' },
  { id: 'numDoda', label: 'Número de DODA' },
  { id: 'numManifiesto', label: 'Número de Manifiesto' }
];

export const ConfiguradorStatus = () => {
  const [tiposOperacion, setTiposOperacion] = useState<string[]>([]);
  const [catalogoStatus, setCatalogoStatus] = useState<string[]>([]);
  
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>('');
  const [reglas, setReglas] = useState<ReglaStatus[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const opSnap = await getDocs(collection(db, 'catalogo_tipo_operacion'));
        const ops = opSnap.docs.map(d => d.data().tipo_operacion).filter(Boolean);
        setTiposOperacion(ops.length > 0 ? ops : ['Importación', 'Exportación', 'Fletes', 'Transfer']);

        const statusSnap = await getDocs(collection(db, 'catalogo_status_servicio'));
        const statuses = statusSnap.docs.map(d => d.data().nombre).filter(Boolean);
        setCatalogoStatus(statuses);
      } catch (error) {
        console.error("Error cargando catálogos:", error);
      }
    };
    cargarCatalogos();
  }, []);

  useEffect(() => {
    const cargarReglas = async () => {
      if (!tipoSeleccionado) {
        setReglas([]);
        return;
      }
      setCargando(true);
      try {
        const docRef = doc(db, 'config_flujos_operacion', tipoSeleccionado);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().flujo) {
          const flujoBD = docSnap.data().flujo as ReglaStatus[];
          flujoBD.sort((a, b) => a.orden - b.orden);
          setReglas(flujoBD);
        } else {
          setReglas([]);
        }
      } catch (error) {
        console.error("Error cargando flujo:", error);
      }
      setCargando(false);
    };
    cargarReglas();
  }, [tipoSeleccionado]);

  const agregarRegla = () => {
    const nuevaRegla: ReglaStatus = {
      id: `regla_${Date.now()}`,
      orden: reglas.length + 1,
      nombreStatus: '',
      tipoMecanismo: 'manual',
      camposRequeridos: []
    };
    setReglas([...reglas, nuevaRegla]);
  };

  const eliminarRegla = (id: string) => {
    const nuevasReglas = reglas.filter(r => r.id !== id);
    nuevasReglas.forEach((r, index) => r.orden = index + 1);
    setReglas(nuevasReglas);
  };

  const actualizarRegla = (id: string, campo: keyof ReglaStatus, valor: any) => {
    setReglas(reglas.map(r => r.id === id ? { ...r, [campo]: valor } : r));
  };

  const toggleCampoRequerido = (reglaId: string, campoOperacionId: string) => {
    setReglas(reglas.map(r => {
      if (r.id !== reglaId) return r;
      const tieneCampo = r.camposRequeridos.includes(campoOperacionId);
      const nuevosCampos = tieneCampo 
        ? r.camposRequeridos.filter(c => c !== campoOperacionId)
        : [...r.camposRequeridos, campoOperacionId];
      return { ...r, camposRequeridos: nuevosCampos };
    }));
  };

  const moverRegla = (index: number, direccion: 'arriba' | 'abajo') => {
    if (direccion === 'arriba' && index === 0) return;
    if (direccion === 'abajo' && index === reglas.length - 1) return;

    const nuevasReglas = [...reglas];
    const swapIndex = direccion === 'arriba' ? index - 1 : index + 1;
    
    const temp = nuevasReglas[index];
    nuevasReglas[index] = nuevasReglas[swapIndex];
    nuevasReglas[swapIndex] = temp;

    nuevasReglas.forEach((r, i) => r.orden = i + 1);
    setReglas(nuevasReglas);
  };

  const guardarConfiguracion = async () => {
    if (!tipoSeleccionado) return alert("Selecciona un tipo de operación primero.");
    if (reglas.some(r => !r.nombreStatus)) return alert("Todos los pasos deben tener un Estatus asignado.");

    setGuardando(true);
    try {
      const docRef = doc(db, 'config_flujos_operacion', tipoSeleccionado);
      await setDoc(docRef, {
        tipoOperacion: tipoSeleccionado,
        ultimaActualizacion: new Date().toISOString(),
        flujo: reglas
      });
      alert('Flujo de trabajo guardado exitosamente.');
    } catch (error) {
      console.error("Error guardando flujo:", error);
      alert('Error al guardar la configuración.');
    }
    setGuardando(false);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#c9d1d9' }}>
      <div className="module-header" style={{ borderBottom: '1px solid #30363d', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: '#f0f6fc', margin: '0 0 8px 0' }}>Configurador de Flujos y Estatus</h1>
          <p style={{ margin: 0, color: '#8b949e', fontSize: '0.9rem' }}>Define el orden y las reglas para que las operaciones cambien de estatus automáticamente o aparezcan como botones en la bitácora.</p>
        </div>
        <button onClick={guardarConfiguracion} disabled={guardando || !tipoSeleccionado} className="btn btn-primary" style={{ height: '40px', padding: '0 24px' }}>
          {guardando ? 'Guardando...' : 'Guardar Flujo Completo'}
        </button>
      </div>

      <div style={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <label className="form-label" style={{ fontSize: '1rem', color: '#f0f6fc' }}>1. Selecciona el Tipo de Operación a Configurar</label>
        <select 
          className="form-control" 
          value={tipoSeleccionado} 
          onChange={(e) => setTipoSeleccionado(e.target.value)}
          style={{ maxWidth: '400px', marginTop: '8px', border: '1px solid #D84315' }}
        >
          <option value="">-- Elige una opción --</option>
          {tiposOperacion.map(tipo => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
        </select>
      </div>

      {!tipoSeleccionado ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#161b22', border: '1px dashed #30363d', borderRadius: '8px', color: '#8b949e' }}>
          Selecciona un tipo de operación arriba para cargar o crear su flujo de trabajo.
        </div>
      ) : cargando ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>Cargando reglas...</div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#f0f6fc', margin: 0 }}>Línea de Tiempo del Flujo: <span style={{ color: '#D84315' }}>{tipoSeleccionado}</span></h2>
            <button onClick={agregarRegla} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>+</span> Agregar Nuevo Paso
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reglas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#161b22', border: '1px dashed #30363d', borderRadius: '8px', color: '#8b949e' }}>
                Este tipo de operación aún no tiene un flujo definido. Haz clic en "Agregar Nuevo Paso".
              </div>
            ) : (
              reglas.map((regla, index) => (
                <div key={regla.id} style={{ display: 'flex', gap: '16px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '20px' }}>
                  
                  {/* Controles de Orden */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRight: '1px solid #30363d', paddingRight: '16px' }}>
                    <button onClick={() => moverRegla(index, 'arriba')} disabled={index === 0} style={{ background: 'none', border: 'none', color: index === 0 ? '#30363d' : '#8b949e', cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: '1.2rem' }}>▲</button>
                    <div style={{ width: '32px', height: '32px', backgroundColor: '#21262d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#f0f6fc' }}>
                      {regla.orden}
                    </div>
                    <button onClick={() => moverRegla(index, 'abajo')} disabled={index === reglas.length - 1} style={{ background: 'none', border: 'none', color: index === reglas.length - 1 ? '#30363d' : '#8b949e', cursor: index === reglas.length - 1 ? 'not-allowed' : 'pointer', fontSize: '1.2rem' }}>▼</button>
                  </div>

                  {/* Configuración Principal de la Regla */}
                  <div style={{ flex: 1 }}>
                    <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr auto', gap: '16px', alignItems: 'end', marginBottom: regla.tipoMecanismo === 'automatico' ? '20px' : '0' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Estatus / Hito</label>
                        {catalogoStatus.length > 0 ? (
                          <select className="form-control" value={regla.nombreStatus} onChange={(e) => actualizarRegla(regla.id, 'nombreStatus', e.target.value)}>
                            <option value="">Seleccione del catálogo...</option>
                            {catalogoStatus.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <input type="text" className="form-control" placeholder="Escriba el nombre del estatus..." value={regla.nombreStatus} onChange={(e) => actualizarRegla(regla.id, 'nombreStatus', e.target.value)} />
                        )}
                      </div>
                      
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Mecanismo</label>
                        <select className="form-control" value={regla.tipoMecanismo} onChange={(e) => actualizarRegla(regla.id, 'tipoMecanismo', e.target.value)}>
                          <option value="automatico">🤖 Automático (Formulario)</option>
                          <option value="manual">👆 Manual (Botón de Horario)</option>
                        </select>
                      </div>

                      <button onClick={() => eliminarRegla(regla.id)} style={{ height: '40px', padding: '0 16px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer' }}>
                        Eliminar
                      </button>
                    </div>

                    {/* Configuración Condicional si es Automático */}
                    {regla.tipoMecanismo === 'automatico' && (
                      <div style={{ backgroundColor: '#0d1117', padding: '16px', borderRadius: '6px', border: '1px dashed #30363d' }}>
                        <label className="form-label" style={{ color: '#D84315', marginBottom: '12px' }}>
                          Condiciones Obligatorias (¿Qué campos del formulario deben estar llenos para llegar a este estatus?)
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                          {CAMPOS_OPERACION.map(campo => (
                            <label key={campo.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                              <input 
                                type="checkbox" 
                                checked={regla.camposRequeridos.includes(campo.id)}
                                onChange={() => toggleCampoRequerido(regla.id, campo.id)}
                                style={{ accentColor: '#D84315' }}
                              />
                              {campo.label}
                            </label>
                          ))}
                        </div>
                        {regla.camposRequeridos.length === 0 && (
                          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#8b949e', fontStyle: 'italic' }}>
                            * Si no seleccionas ninguna condición, este estatus se asignará por defecto si no se cumplen reglas superiores.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};