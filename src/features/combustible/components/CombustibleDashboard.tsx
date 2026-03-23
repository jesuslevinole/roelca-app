// Archivo: src/features/combustible/components/CombustibleDashboard.tsx

import React, { useState, useEffect } from 'react';
import type { CombustibleRecord } from '../../../types/combustible';
import { getCombustibles } from '../services/combustibleService';
import { FormularioCombustible } from './FormularioCombustible';

export const CombustibleDashboard: React.FC = () => {
  const [registros, setRegistros] = useState<CombustibleRecord[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);

  const cargarDatos = async () => {
    const data = await getCombustibles();
    setRegistros(data);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Formatear la fecha estrictamente en español
  const formatearFechaEsp = (fechaString: string) => {
    const fechaObj = new Date(fechaString + 'T00:00:00'); // Evita desfase horario
    return fechaObj.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="dashboard-container">
      
      {/* 1. Uso de clases maestras del CSS para el encabezado */}
      <div className="module-header">
        <h2 className="module-title">
          {/* El span gris imita el efecto "Breadcrumb" de tu diseño */}
          <span style={{ color: '#8b949e', fontWeight: 'normal', fontSize: '1.2rem', marginRight: '8px' }}>
            Bases de Datos &gt;
          </span> 
          Costo del Combustible ({registros.length})
        </h2>
        
        {/* 2. Uso de tu clase btn-primary para el botón naranja */}
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={() => setModalAbierto(true)}>
            + Agregar
          </button>
        </div>
      </div>

      {/* 3. content-body envuelve la tabla para alinear el padding general */}
      <div className="content-body" style={{ flexDirection: 'column' }}>
        
        {/* 4. table-container y data-table aplican tus estilos globales automáticamente */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>FECHA</th>
                <th>PROVEEDOR</th>
                <th>TIPO</th>
                <th>MEDIDA</th>
                <th>MONEDA</th>
                <th>COSTO</th>
                <th>T.C.</th>
                <th>TOTAL MXN</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: '#8b949e' }}>
                    Aún no hay registros. Haz clic en "+ Agregar" para crear el primero.
                  </td>
                </tr>
              ) : (
                registros.map((r, i) => (
                  <tr key={i}>
                    <td>{formatearFechaEsp(r.fecha)}</td>
                    <td>{r.proveedor}</td>
                    <td>{r.tipoCombustible}</td>
                    <td>{r.tipoMedida}</td>
                    <td>{r.monedaNombre}</td>
                    <td>${r.costo.toFixed(2)}</td>
                    <td>{r.tipoCambio ? `$${r.tipoCambio.toFixed(4)}` : '-'}</td>
                    <td>{r.totalPesos ? `$${r.totalPesos.toFixed(2)}` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal del formulario */}
      {modalAbierto && (
        <FormularioCombustible 
          onClose={() => setModalAbierto(false)} 
          onSuccess={cargarDatos} 
        />
      )}
    </div>
  );
};