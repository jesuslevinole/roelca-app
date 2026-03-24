// Archivo: src/types/convenioProveedor.ts

export interface ConvenioProveedorDetalle {
  idLocal: string;
  tipoConvenioId: string;
  tipoConvenioNombre: string;
  tarifa: number;
}

export interface ConvenioProveedorRecord {
  id?: string;
  numeroConvenio: string;      // Consecutivo único (ej. CPRV-001)
  proveedorId: string;        // Llave primaria del catálogo de empresas
  proveedorNombre: string;    // Nombre descriptivo para la tabla
  monedaId: string;           // Llave primaria del catálogo de monedas
  monedaNombre: string;       // Nombre de la moneda
  credito: number;            // Valor numérico (días)
  fechaConvenio: string;      // Formato YYYY-MM-DD
  fechaVencimiento: string;   // Formato YYYY-MM-DD
  detalles: ConvenioProveedorDetalle[]; // Lista de conceptos/tarifas
}