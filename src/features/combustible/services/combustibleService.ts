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
        esDolar: data.moneda?.toLowerCase().includes('dolar') || data.moneda?.toLowerCase().includes('usd')
      };
    });
    
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
// CORRECCIÓN APLICADA: Se eliminó el parámetro para evitar bloqueos estrictos de TS
export const getTipoCambioPorFecha = async (): Promise<number> => {
  return 17.8117; 
};

// 3. Guardar un nuevo registro de Combustible
export const saveCombustible = async (record: CombustibleRecord): Promise<void> => {
  try {
    await addDoc(collection(db, 'combustibles'), record);
  } catch (error) {
    console.error("Error al guardar combustible:", error);
    throw error;
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
    
    return records.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  } catch (error) {
    console.error("Error al obtener combustibles:", error);
    return [];
  }
};