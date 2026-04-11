// src/types/convenioProveedor.ts

export interface ConvenioProveedorDetalleRecord {
  id?: string;
  convenioId?: string; // Llave foránea que lo une al Maestro
  tipoConvenioId: string;
  tipoConvenioNombre: string;
  tarifa: number;
}

export interface ConvenioProveedorRecord {
  id?: string;
  numeroConvenio: string;      // CPRV-XXX
  proveedorId: string;
  proveedorNombre: string;
  monedaId: string;
  monedaNombre: string;
  credito: number;
  fechaConvenio: string;
  fechaVencimiento: string;
}