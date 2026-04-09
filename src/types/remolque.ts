// src/features/remolques/types/remolque.ts

export interface RemolqueRecord {
  id?: string;
  nombre: string;
  tipoId: string;
  tipoNombre: string;
  placas: string;
  estadoId: string;
  estadoNombre: string;
  serie: string;
  marca: string;
  anio: number;
  propietarioId: string;
  propietarioNombre: string;
  paisId: string;
  paisNombre: string;
}