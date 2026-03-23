// Archivo: src/types/combustible.ts

// CORRECCIÓN: Es obligatorio que estas interfaces tengan la palabra "export"
export interface Moneda {
  id: string;
  nombre: string;
  esDolar: boolean; 
}

export interface CombustibleRecord {
  id?: string;
  fecha: string; 
  tipoCombustible: 'Gasolina' | 'Diesel';
  monedaId: string;
  monedaNombre: string;
  tipoMedida: 'Litros' | 'Galones';
  proveedor: string;
  costo: number;
  tipoCambio?: number; 
  totalPesos?: number; 
}