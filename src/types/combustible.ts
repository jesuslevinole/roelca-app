// src/types/combustible.ts

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
  proveedor: string;           // El nombre en texto
  proveedorId?: string;        // ✅ ¡AGREGA ESTA LÍNEA! El ID relacional
  costo: number;
  tipoCambio?: number;
  totalPesos?: number;
}