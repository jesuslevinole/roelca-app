// Archivo: src/features/combustible/services/combustibleService.ts

// CORRECCIÓN: Se agregó la palabra clave "type" a la importación.
import type { Moneda, CombustibleRecord } from '../../../types/combustible';

// Importación comentada temporalmente para evitar el error ts(6192)
// import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
// import { db } from '../../../config/firebase'; 

const DB_MOCK = true; 

export const getMonedasCatalogo = async (): Promise<Moneda[]> => {
  return [
    { id: 'mxn_01', nombre: 'Pesos Mexicanos', esDolar: false },
    { id: 'usd_01', nombre: 'Dólares (USD)', esDolar: true }
  ];
};

export const getTipoCambioPorFecha = async (fecha: string): Promise<number> => {
  return 17.8117; 
};

export const saveCombustible = async (data: CombustibleRecord): Promise<void> => {
  console.log('Registro guardado exitosamente:', data);
};

export const getCombustibles = async (): Promise<CombustibleRecord[]> => {
  return [];
};