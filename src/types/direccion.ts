// src/types/direccion.ts

export interface DireccionRecord {
  id?: string;
  paisId: string;
  paisNombre: string;
  estadoId: string;
  estadoNombre: string;
  municipioId: string;
  municipioNombre: string;
  coloniaId: string;
  coloniaNombre: string;
  cpId: string;
  cpNombre: string;
  calleId: string;
  calleNombre: string;
  numExterior: string;
  numInterior: string;
  direccionCompleta: string;
}