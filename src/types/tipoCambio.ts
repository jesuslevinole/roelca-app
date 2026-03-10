// src/types/tipoCambio.ts
export interface TipoCambio {
  id?: string;
  dia: string;
  fecha: string;
  tcDof: string;
  tendencia: string;
  tipoTendencia: 'subio' | 'bajo' | 'igual';
}