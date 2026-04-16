// src/features/operaciones/config/statusRules.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export const calcularStatusDinamico = async (configId: string, formData: any, statusActual?: string): Promise<string> => {
  // 1. Validar que la configuración base exista
  if (!configId || configId.includes('N/A') || configId === '__') {
    throw new Error("⛔ Faltan datos para determinar el flujo. Asegúrate de que el Convenio generó correctamente el Servicio, Tráfico y Carga.");
  }

  // 2. Buscar el flujo en la base de datos de configuraciones
  const docRef = doc(db, 'config_flujos_operacion', configId);
  const snap = await getDoc(docRef);

  // 3. 🚨 BLOQUEO ESTRICTO: Si no existe el flujo, abortamos el guardado.
  if (!snap.exists() || !snap.data().flujo || snap.data().flujo.length === 0) {
    throw new Error(`⛔ BLOQUEO: No existe un flujo configurado para la combinación:\n"${configId.replace(/_/g, ' ')}"\n\nPor favor, créalo primero en el menú "Reglas de Estatus".`);
  }

  const reglas = snap.data().flujo as any[];

  // 4. Procesar el avance automático
  let ordenActual = -1;
  if (statusActual) {
    const reglaActual = reglas.find(r => r.nombreStatus === statusActual);
    if (reglaActual) ordenActual = reglaActual.orden;
  }

  const reglasAutomaticas = reglas
    .filter(r => r.tipoMecanismo === 'automatico')
    .sort((a, b) => b.orden - a.orden);

  for (const regla of reglasAutomaticas) {
    const camposRequeridos = regla.camposRequeridos || [];
    
    if (camposRequeridos.length === 0) {
      if (regla.orden <= ordenActual) return statusActual!;
      return regla.nombreStatus;
    }

    const cumpleTodos = camposRequeridos.every((campo: string) => {
      const valor = formData[campo];
      return valor !== undefined && valor !== null && String(valor).trim() !== '';
    });

    if (cumpleTodos) {
      if (regla.orden <= ordenActual) return statusActual!;
      return regla.nombreStatus; // Avanza al status automático
    }
  }

  // 5. Si ya tiene un status actual y no avanzó, se queda donde está
  if (statusActual) return statusActual;

  // 6. 🟢 ASIGNACIÓN INICIAL: Si es nuevo, toma el PRIMER status configurado en su regla, no un genérico
  const primerPaso = reglas.sort((a, b) => a.orden - b.orden)[0];
  return primerPaso.nombreStatus;
};

export const obtenerBotonesHorarioDinamicos = async (operacionInfo: any): Promise<string[]> => {
  if (!operacionInfo) return [];
  
  try {
    const { tipoServicio, trafico, carga } = operacionInfo;
    const configId = `${tipoServicio}_${trafico}_${carga}`;

    const docRef = doc(db, 'config_flujos_operacion', configId);
    const snap = await getDoc(docRef);

    if (!snap.exists() || !snap.data().flujo) {
      return []; 
    }

    const reglas = snap.data().flujo as any[];
    
    const botonesManuales = reglas
      .filter(r => r.tipoMecanismo === 'manual')
      .sort((a, b) => a.orden - b.orden)
      .map(r => r.nombreStatus);

    return botonesManuales;
  } catch (error) {
    return [];
  }
};