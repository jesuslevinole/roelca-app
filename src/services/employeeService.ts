// src/services/employeeService.ts
import { collection, doc, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Employee } from '../types/empleado';

const COLLECTION_NAME = 'empleados';
const COUNTERS_COLLECTION = '_contadores';
const COUNTER_DOC_ID = 'empleados_seq';

/**
 * Guarda un empleado garantizando un ID secuencial único mediante una Transacción Atómica.
 */
export const guardarEmpleadoConTransaccion = async (empleadoData: Employee): Promise<void> => {
  try {
    const dataToSave = { ...empleadoData };
    delete dataToSave.id;

    // Si ya existe un ID de Firestore, es una actualización normal (no requiere transacción de secuencia)
    if (empleadoData.id) {
      const docRef = doc(db, COLLECTION_NAME, empleadoData.id);
      await updateDoc(docRef, dataToSave as any);
      return;
    }

    // --- LÓGICA DE TRANSACCIÓN PARA NUEVOS REGISTROS ---
    const counterRef = doc(db, COUNTERS_COLLECTION, COUNTER_DOC_ID);
    const newEmployeeRef = doc(collection(db, COLLECTION_NAME)); // Generamos el ID de documento anticipadamente

    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let nextSeq = 1;
      if (counterDoc.exists()) {
        nextSeq = (counterDoc.data().seq || 0) + 1;
      }

      // 1. Actualizamos el contador de forma atómica
      transaction.set(counterRef, { seq: nextSeq }, { merge: true });

      // 2. Formateamos el ID
      const formattedId = `Emp-${String(nextSeq).padStart(3, '0')}`;
      dataToSave.employeeId = formattedId;

      // 3. Escribimos el nuevo empleado
      transaction.set(newEmployeeRef, dataToSave);
    });

  } catch (error) {
    console.error("Transacción fallida al guardar empleado:", error);
    throw error; // Propagamos el error para que la UI reaccione
  }
};