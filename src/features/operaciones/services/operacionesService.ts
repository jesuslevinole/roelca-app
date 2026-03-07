// src/features/operaciones/services/operacionesService.ts
import { doc, runTransaction, collection } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { Operacion } from '../../../types/operacion';
import { generarReferencia } from '../../../utils/generarReferencia';

export const guardarOperacionSegura = async (operacionData: Omit<Operacion, 'ref'>) => {
  const counterRef = doc(db, 'counters', 'operaciones');
  const nuevaOperacionRef = doc(collection(db, 'operaciones'));

  try {
    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nuevoCorrelativo = 1;

      if (!counterDoc.exists()) {
        transaction.set(counterRef, { count: 1 });
      } else {
        nuevoCorrelativo = counterDoc.data().count + 1;
        transaction.update(counterRef, { count: nuevoCorrelativo });
      }

      // Generamos el ID único combinando la lógica de la regla con el contador real
      const referenciaFinal = generarReferencia(operacionData.tipoOperacion, nuevoCorrelativo);

      transaction.set(nuevaOperacionRef, {
        ...operacionData,
        ref: referenciaFinal,
        createdAt: new Date().toISOString()
      });
    });

    return true;
  } catch (error) {
    console.error("Transacción fallida: ", error);
    throw new Error("No se pudo guardar la operación.");
  }
};