// Archivo: src/types/unidadProveedor.ts

export interface UnidadProveedorRecord {
  id?: string;
  proveedorId: string;       // ID relacional de la colección de empresas
  proveedorNombre: string;   // Nombre descriptivo para la vista en tabla
  numeroUnidad: string;      // # Unidad
  numeroSerie: string;       // # Serie
  placas: string;            // Placas
  pais: string;              // País
  estadoUbicacion: string;   // Estado (Se usa estadoUbicacion para no confundir con status)
}