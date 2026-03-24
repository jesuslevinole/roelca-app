// Archivo: src/features/combustible/services/combustibleService.ts

import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { Moneda, CombustibleRecord } from '../../../types/combustible';

// 1. Obtener catálogo de monedas
export const getMonedasCatalogo = async (): Promise<Moneda[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'catalogo_moneda'));
    const monedas = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nombre: data.moneda || 'Desconocida',
        // Comprueba si el nombre incluye "dolar" o "usd" para el cálculo automático
        esDolar: data.moneda?.toLowerCase().includes('dolar') || data.moneda?.toLowerCase().includes('usd')
      };
    });
    
    // Si la colección está vacía en Firebase, devolvemos unas por defecto para que no falle la UI
    if (monedas.length === 0) {
      return [
        { id: '1', nombre: 'Dólares (USD)', esDolar: true },
        { id: '2', nombre: 'Pesos (MXN)', esDolar: false }
      ];
    }
    return monedas;
  } catch (error) {
    console.error("Error al obtener monedas:", error);
    return [];
  }
};

// 2. Obtener Tipo de Cambio
// CORRECCIÓN: Se usa _fecha para decirle a TypeScript que ignore la variable sin arrojar error
export const getTipoCambioPorFecha = async (_fecha: string): Promise<number> => {
  // Aquí puedes conectar posteriormente tu API de Banxico. 
  // Por ahora retornamos un valor seguro para que compile perfecto.
  return 17.8117; 
};

// 3. Guardar un nuevo registro de Combustible
export const saveCombustible = async (record: CombustibleRecord): Promise<void> => {
  try {
    await addDoc(collection(db, 'combustibles'), record);
  } catch (error) {
    console.error("Error al guardar combustible:", error);
    throw error; // Lanzamos el error para que el formulario lo atrape y avise al usuario
  }
};

// 4. Obtener todos los registros de Combustible
export const getCombustibles = async (): Promise<CombustibleRecord[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'combustibles'));
    const records = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CombustibleRecord[];
    
    // Ordenamos por fecha de forma descendente (los más recientes arriba)
    return records.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  } catch (error) {
    console.error("Error al obtener combustibles:", error);
    return [];
  }
};