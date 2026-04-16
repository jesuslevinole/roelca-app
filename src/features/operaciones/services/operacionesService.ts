// src/features/operaciones/services/operacionesService.ts
import { doc, runTransaction, collection } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { generarReferencia } from '../../../utils/generarReferencia';

export const guardarOperacionSegura = async (operacionData: any) => {
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

      // ✅ CORRECCIÓN DEL "UNDEFINED" EN LA REFERENCIA:
      let prefijoOperacion = "OP"; // Fallback por defecto
      if (operacionData.tipoOperacionId) {
        const tipoRef = doc(db, 'catalogo_tipo_operacion', operacionData.tipoOperacionId);
        const tipoSnap = await transaction.get(tipoRef);
        
        if (tipoSnap.exists()) {
          const dataTipo = tipoSnap.data();
          // Intentamos extraer una sigla clave, o en su defecto el nombre (ej. "Logistica")
          prefijoOperacion = dataTipo.clave || dataTipo.acronimo || dataTipo.tipo_operacion || "OP";
        }
      } else if (operacionData.tipoOperacion) {
        prefijoOperacion = operacionData.tipoOperacion;
      }

      // Generamos el ID único (usamos 'as any' para saltar la restricción estricta de TypeScript)
      const referenciaFinal = generarReferencia(prefijoOperacion as any, nuevoCorrelativo);

      transaction.set(nuevaOperacionRef, {
        ...operacionData,
        ref: referenciaFinal,
        createdAt: new Date().toISOString()
      });
    });

    return true;
  } catch (error) {
    console.error("Transacción fallida: ", error);
    // Propagamos el error exacto (para que salga la alerta de Bloqueo o de Firebase)
    throw error; 
  }
};