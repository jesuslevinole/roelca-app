// Archivo: src/types/proveedorUnidad.ts

export interface ProveedorUnidadRecord {
  id?: string;
  proveedorId: string;        // ID relacional de la colección de empresas
  proveedorNombre: string;    // Nombre descriptivo para evitar cruces en tiempo real
  nombre: string;
  apellido: string;
  fechaNacimiento: string;    // Formato YYYY-MM-DD
  paisNacimiento: string;
  sexo: 'Masculino' | 'Femenino';
  numeroVisa: string;
  numeroLicencia: string;
  paisExpedicion: string;
  estadoExpedicion: string;
}