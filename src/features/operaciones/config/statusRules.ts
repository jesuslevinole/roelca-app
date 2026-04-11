// src/features/operaciones/config/statusRules.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

// ✅ CORRECCIÓN: El primer parámetro ahora es explícitamente "configId: string"
export const calcularStatusDinamico = async (configId: string, formData: any, statusActual?: string): Promise<string> => {
  try {
    if (!configId || configId.includes('N/A') || configId === '__') return statusActual || '1. Nuevo';

    const docRef = doc(db, 'config_flujos_operacion', configId);
    const snap = await getDoc(docRef);

    if (!snap.exists() || !snap.data().flujo) {
      return statusActual || '1. Nuevo'; 
    }

    const reglas = snap.data().flujo as any[];

    let ordenActual = 0;
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
         if (regla.orden < ordenActual) return statusActual!;
         return regla.nombreStatus;
      }

      const cumpleTodos = camposRequeridos.every((campo: string) => {
        const valor = formData[campo];
        return valor !== undefined && valor !== null && String(valor).trim() !== '';
      });

      if (cumpleTodos) {
        if (regla.orden < ordenActual) return statusActual!;
        return regla.nombreStatus;
      }
    }

    return statusActual || '1. Nuevo';
  } catch (error) {
    return statusActual || '1. Nuevo';
  }
};

export const obtenerBotonesHorarioDinamicos = async (operacionInfo: any): Promise<string[]> => {
  if (!operacionInfo) return [];
  
  try {
    const { tipoServicio, trafico, carga } = operacionInfo;
    const configId = `${tipoServicio}_${trafico}_${carga}`;

    const docRef = doc(db, 'config_flujos_operacion', configId);
    const snap = await getDoc(docRef);

    if (!snap.exists() || !snap.data().flujo) {
      return ['1. Sin Configurar']; 
    }

    const reglas = snap.data().flujo as any[];
    
    const botonesManuales = reglas
      .filter(r => r.tipoMecanismo === 'manual')
      .sort((a, b) => a.orden - b.orden)
      .map(r => r.nombreStatus);

    return botonesManuales.length > 0 ? botonesManuales : ['Sin botones configurados'];
  } catch (error) {
    return [];
  }
};