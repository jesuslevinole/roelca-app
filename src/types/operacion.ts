// src/types/operacion.ts
export interface Operacion {
  id?: string;
  ref: string;
  tipoOperacion: string;
  fechaServicio: string;
  status: string;
  clientePaga?: string;
  convenio?: string;
  numeroRemolque?: string;
  refCliente?: string;
  origen?: string;
  destino?: string;
  observacionesEjecutivo?: string;
  
  // Pedimento
  clienteMercancia?: string;
  descripcionMercancia?: string;
  cantidad?: number;
  embalaje?: string;
  pesoKg?: number;
  numDoda?: string;

  // Manifiesto
  numEntry?: string;
  cantEntrys?: number;
  numManifiesto?: string;
  provServicios?: string;

  // Unidad y Operador
  proveedorUnidad?: string;
  facturadoEnUnidad?: string;
  convenioProveedor?: string;
  tipoCambioUnidad?: number;
  unidad?: string;
  operador?: string;
  sueldoOperador?: number;
  sueldosExtras?: number;
  combustibleGalones?: number;
  galonesExtras?: number;
  puente?: string;
  puenteMonto?: number;
  observacionesGastos?: string;

  // Por Cobrar
  facturadoEnCobrar?: string;
  convenioCobrar?: number;
  cargosAdicionales?: number;
  tipoCambioCobrar?: number;
  observacionesCostos?: string;

  createdAt?: string;
  [key: string]: any; // Comodín para evitar errores con campos futuros
}