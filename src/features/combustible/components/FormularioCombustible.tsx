// Archivo: src/features/combustible/components/FormularioCombustible.tsx

import React, { useState, useEffect } from 'react';
import type { Moneda, CombustibleRecord } from '../../../types/combustible';
import { getMonedasCatalogo, getTipoCambioPorFecha, saveCombustible } from '../services/combustibleService';

interface FormProps {
  estado?: 'abierto' | 'minimizado';
  onClose: () => void;
  onSuccess: () => void;
  onMinimize?: () => void; 
  onRestore?: () => void;
}

export const FormularioCombustible: React.FC<FormProps> = ({ 
  estado = 'abierto', 
  onClose, 
  onSuccess,
  onMinimize = () => {},
  onRestore = () => {}
}) => {
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const todayISO = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState<string>(todayISO);
  const [tipoCombustible, setTipoCombustible] = useState<'Gasolina' | 'Diesel'>('Diesel');
  const [monedaSeleccionada, setMonedaSeleccionada] = useState<Moneda | null>(null);
  
  const [tipoMedida, setTipoMedida] = useState<string>(''); 
  
  const [proveedor, setProveedor] = useState<string>('');
  const [costo, setCosto] = useState<number>(0);
  const [tipoCambio, setTipoCambio] = useState<number>(0);
  const [cargandoApi, setCargandoApi] = useState<boolean>(false);

  useEffect(() => {
    const fetchMonedas = async () => {
      const data = await getMonedasCatalogo();
      setMonedas(data);
      if (data.length > 0) {
        setMonedaSeleccionada(data[0]);
        setTipoMedida(data[0].esDolar ? 'Galones' : 'Litros');
      }
    };
    fetchMonedas();
  }, []);

  useEffect(() => {
    const fetchTipoCambio = async () => {
      if (monedaSeleccionada?.esDolar && fecha) {
        setCargandoApi(true);
        // CORRECCIÓN: Se eliminó la variable "fecha" de los paréntesis para coincidir con el servicio
        const tc = await getTipoCambioPorFecha();
        setTipoCambio(tc);
        setCargandoApi(false);
      } else {
        setTipoCambio(0);
      }
    };
    fetchTipoCambio();
  }, [fecha, monedaSeleccionada]);

  const esDolar = monedaSeleccionada?.esDolar ?? false;
  const totalPesos = esDolar ? costo * tipoCambio : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monedaSeleccionada) return;

    const record: CombustibleRecord = {
      fecha,
      tipoCombustible,
      monedaId: monedaSeleccionada.id,
      monedaNombre: monedaSeleccionada.nombre,
      tipoMedida: tipoMedida as 'Litros' | 'Galones',
      proveedor,
      costo,
      ...(esDolar && { tipoCambio, totalPesos })
    };

    await saveCombustible(record);
    onSuccess();
    onClose();
  };

  const handleMonedaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const encontrada = monedas.find(m => m.id === id) || null;
    setMonedaSeleccionada(encontrada);
    
    if (encontrada) {
      setTipoMedida(encontrada.esDolar ? 'Galones' : 'Litros');
    }
  };

  return (
    <div className={`modal-overlay ${estado === 'minimizado' ? 'minimized' : ''}`}>
      <div className="form-card" style={{ maxWidth: '700px' }}>
        <div className="form-header">
          <h2>{estado === 'minimizado' ? 'Editando...' : 'Nuevo Costo de Combustible'}</h2>
          <div className="header-actions">
            {estado === 'abierto' ? (
              <button type="button" onClick={onMinimize} className="btn-window">🗕</button>
            ) : (
              <button type="button" onClick={onRestore} className="btn-window restore">🗖</button>
            )}
            <button type="button" onClick={onClose} className="btn-window close">✕</button>
          </div>
        </div>

        <div style={{ display: estado === 'minimizado' ? 'none' : 'block', padding: '10px 0' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={fecha} 
                  onChange={(e) => setFecha(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Proveedor *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={proveedor} 
                  onChange={(e) => setProveedor(e.target.value)} 
                  required 
                  placeholder="Ej: Fuel America"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Combustible *</label>
                <select 
                  className="form-control" 
                  value={tipoCombustible} 
                  onChange={(e) => setTipoCombustible(e.target.value as 'Gasolina' | 'Diesel')}
                  required
                >
                  <option value="Gasolina">Gasolina</option>
                  <option value="Diesel">Diesel</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Moneda *</label>
                <select className="form-control" value={monedaSeleccionada?.id || ''} onChange={handleMonedaChange} required>
                  {monedas.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Medida *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={tipoMedida} 
                  onChange={(e) => setTipoMedida(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Costo ({monedaSeleccionada?.nombre || ''}) *</label>
                <input 
                  type="number" 
                  step="0.001" 
                  className="form-control" 
                  value={costo} 
                  onChange={(e) => setCosto(parseFloat(e.target.value) || 0)} 
                  required 
                />
              </div>

              {esDolar && (
                <>
                  <div className="form-group">
                    <label className="form-label orange">T.C. DOF (al {fecha})</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={cargandoApi ? 'Consultando...' : tipoCambio.toFixed(4)} 
                      disabled 
                      style={{ backgroundColor: '#21262d', color: '#8b949e', cursor: 'not-allowed' }} 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label orange">Total en Pesos MXN</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={totalPesos.toFixed(4)} 
                      disabled 
                      style={{ backgroundColor: '#21262d', color: '#8b949e', cursor: 'not-allowed' }} 
                    />
                  </div>
                </>
              )}
            </div>

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={cargandoApi}>Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};