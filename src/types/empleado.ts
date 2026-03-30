// src/types/empleado.ts

export interface Employee {
  id?: string; // ID interno del documento en Firestore
  employeeId: string; // ID consecutivo Ej: Emp-001
  firstName: string;
  lastNamePaternal: string;
  lastNameMaternal: string;
  alias: string;
  rfc: string;
  birthDate: string; // Mantenido como string (YYYY-MM-DD) para compatibilidad con <input type="date">
  addressId: string;
  addressLabel?: string; // Campo auxiliar para búsquedas visuales y Maps
  personalPhone: string;
  personalEmail: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}