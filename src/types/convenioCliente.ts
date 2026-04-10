// src/types/convenioCliente.ts

// 1. Colección: convenios_clientes_detalles
export interface ConvenioDetalleRecord {
  id?: string;
  convenioId?: string; // Llave foránea que lo une al Maestro
  tipoConvenioId: string;
  tipoConvenioNombre: string;
  tarifa: number;
}

// 2. Colección: convenios_clientes
export interface ConvenioClienteRecord {
  id?: string;
  numeroConvenio: string;
  clienteId: string;
  clienteNombre: string;
  monedaId: string;
  monedaNombre: string;
  credito: number;
  fechaConvenio: string;
  fechaVencimiento: string;
  // NOTA: 'detalles' ya no existe físicamente dentro de este documento
}