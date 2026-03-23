// Archivo: src/types/convenioCliente.ts

// CORRECCIÓN: Nueva interfaz para el subformulario (Detalle)
export interface ConvenioDetalle {
  idLocal: string;            // ID temporal para manejar el array en React
  tipoConvenioId: string;      // ID del catálogo tarifario
  tipoConvenioNombre: string;  // Nombre del tarifario (para mostrar en la UI sin re-consultar)
  tarifa: number;             // Monto final acordado
}

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
  detalles: ConvenioDetalle[]; // CORRECCIÓN: Array que contendrá los detalles del convenio
}