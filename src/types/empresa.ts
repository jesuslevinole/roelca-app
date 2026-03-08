// src/types/empresa.ts
export interface Empresa {
  id?: string;
  numCliente: string;
  nombre: string;
  nombreCorto?: string;
  tiposServicio: string; // Ej: "Cliente (Mercancía), Proveedor"
  rfcTaxId?: string;
  fechaUltimoServicio?: string;
  
  // Datos de contacto y fiscales sugeridos
  status: 'Activa' | 'Inactiva';
  direccion?: string;
  telefono?: string;
  correo?: string;
  
  createdAt?: string;
  [key: string]: any;
}