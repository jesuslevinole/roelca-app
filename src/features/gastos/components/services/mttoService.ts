import { doc, runTransaction, collection } from 'firebase/firestore';
// ✅ CORRECCIÓN: Agregamos un '../' extra para salir de la carpeta components
import { db } from '../../../../config/firebase';

export const guardarMttoSeguro = async (mttoData: any) => {
  // Aislamos el contador por FECHA para cumplir la regla: MTTO-MMDDAAAA-XXX
  const dateObj = new Date(mttoData.fecha || new Date());
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  const dateString = `${mm}${dd}${yyyy}`;
  
  const counterRef = doc(db, 'counters', `mtto_${dateString}`);
  const nuevoMttoRef = doc(collection(db, 'gastos_mtto'));

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

      // Rellena con ceros a la izquierda (Ej. 001)
      const paddedCorrelativo = String(nuevoCorrelativo).padStart(3, '0');
      const referenciaFinal = `MTTO-${dateString}-${paddedCorrelativo}`;

      transaction.set(nuevoMttoRef, {
        ...mttoData,
        numeroGasto: referenciaFinal,
        createdAt: new Date().toISOString()
      });
    });

    return true;
  } catch (error) {
    console.error("Transacción fallida al guardar MTTO: ", error);
    throw new Error("No se pudo guardar el gasto MTTO.");
  }
};