// src/utils/generarReferencia.ts
export const generarReferencia = (
  tipo: 'Transfer' | 'Logistica' | 'Fletes', 
  correlativoBD: number
): string => {
  const prefijos = {
    Transfer: 'TR',
    Logistica: 'LO',
    Fletes: 'FL'
  };
  
  const prefijo = prefijos[tipo];
  
  // Formato de fecha YYMMDD
  const hoy = new Date();
  const fechaStr = hoy.getFullYear().toString().slice(2) + 
                   String(hoy.getMonth() + 1).padStart(2, '0') + 
                   String(hoy.getDate()).padStart(2, '0');
                   
  // Correlativo de 3 dígitos (ej. 001, 015)
  const correlativoStr = String(correlativoBD).padStart(3, '0');

  return `${prefijo}-${fechaStr}-${correlativoStr}`;
};