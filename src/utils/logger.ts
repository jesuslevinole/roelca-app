// src/utils/logger.ts
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export const registrarLog = async (modulo: string, accion: string, detalle: string) => {
  try {
    const usuarioActual = auth.currentUser;
    const correo = usuarioActual?.email || 'Sistema';

    await addDoc(collection(db, 'historial_actividad'), {
      usuario: correo,
      modulo: modulo,
      accion: accion,
      detalle: detalle,
      fecha: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error al registrar en el historial:", error);
  }
};