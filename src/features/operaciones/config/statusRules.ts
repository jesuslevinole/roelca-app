// src/features/operaciones/config/statusRules.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

/**
 * 1. MOTOR DE ESTATUS AUTOMÁTICO
 * Lee la configuración de Firebase y decide qué estatus asignar
 * basándose en los campos que están llenos en el formulario.
 */
export const calcularStatusDinamico = async (tipoOperacion: string, formData: any, statusActual?: string): Promise<string> => {
  try {
    if (!tipoOperacion) return statusActual || '1. Nuevo';

    const docRef = doc(db, 'config_flujos_operacion', tipoOperacion);
    const snap = await getDoc(docRef);

    if (!snap.exists() || !snap.data().flujo) {
      return statusActual || '1. Nuevo'; // Si no hay configuración, no cambia nada
    }

    const reglas = snap.data().flujo as any[];

    // Buscamos qué orden tiene el estatus actual para no hacer "downgrades" (retrocesos)
    let ordenActual = 0;
    if (statusActual) {
      const reglaActual = reglas.find(r => r.nombreStatus === statusActual);
      if (reglaActual) ordenActual = reglaActual.orden;
    }

    // Filtramos solo las reglas automáticas y las ordenamos de MAYOR a MENOR exigencia
    const reglasAutomaticas = reglas
      .filter(r => r.tipoMecanismo === 'automatico')
      .sort((a, b) => b.orden - a.orden);

    // Evaluamos cuál es la regla más alta que cumple todas sus condiciones
    for (const regla of reglasAutomaticas) {
      const camposRequeridos = regla.camposRequeridos || [];
      
      // Si no requiere campos, es una regla por defecto, vemos si aplica
      if (camposRequeridos.length === 0) {
         if (regla.orden < ordenActual) return statusActual!;
         return regla.nombreStatus;
      }

      // Verificamos si TODOS los campos que configuraste en el Front tienen datos
      const cumpleTodos = camposRequeridos.every((campo: string) => {
        const valor = formData[campo];
        return valor !== undefined && valor !== null && String(valor).trim() !== '';
      });

      if (cumpleTodos) {
        // Si cumple la regla, pero la operación ya va en un paso más avanzado (ej. ya va en camino),
        // no la regresamos a un paso anterior.
        if (regla.orden < ordenActual) return statusActual!;
        
        return regla.nombreStatus;
      }
    }

    return statusActual || '1. Nuevo';
  } catch (error) {
    console.error("Error calculando status dinámico:", error);
    return statusActual || '1. Nuevo';
  }
};

/**
 * 2. MOTOR DE BOTONES DE BITÁCORA
 * Descarga de Firebase los estatus manuales configurados para ese tipo de operación.
 */
export const obtenerBotonesHorarioDinamicos = async (tipoOperacion: string): Promise<string[]> => {
  if (!tipoOperacion) return [];
  
  try {
    const docRef = doc(db, 'config_flujos_operacion', tipoOperacion);
    const snap = await getDoc(docRef);

    if (!snap.exists() || !snap.data().flujo) {
      return ['1. Sin Configurar']; 
    }

    const reglas = snap.data().flujo as any[];
    
    // Extraemos solo los que marcaste como "Manual (Botón)" en el Front
    const botonesManuales = reglas
      .filter(r => r.tipoMecanismo === 'manual')
      .sort((a, b) => a.orden - b.orden)
      .map(r => r.nombreStatus);

    return botonesManuales.length > 0 ? botonesManuales : ['Sin botones configurados'];
  } catch (error) {
    console.error("Error obteniendo botones dinámicos:", error);
    return [];
  }
};