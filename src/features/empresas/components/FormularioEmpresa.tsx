// src/features/empresas/components/FormularioEmpresa.tsx
import React, { useState, useEffect } from 'react';

interface FormProps {
  estado: 'abierto' | 'minimizado';
  initialData?: any;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
}

export const FormularioEmpresa = ({ estado, initialData, onClose, onMinimize, onRestore }: FormProps) => {
  const [pestañaActiva, setPestañaActiva] = useState<'general' | 'contacto'>('general');

  const [formData, setFormData] = useState({
    numCliente: 'EMP-', nombre: '', nombreCorto: '', tiposServicio: 'Cliente (Mercancía)', 
    rfcTaxId: '', status: 'Activa', direccion: '', telefono: '', correo: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (initialData) setFormData(prev => ({ ...prev, ...initialData }));
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí irá la lógica de Firebase: await guardarEmpresa(formData)
    alert(initialData ? 'Empresa actualizada correctamente.' : 'Empresa guardada exitosamente');
    onClose();
  };

  return (
    <div className={`modal-overlay ${estado === 'minimizado' ? 'minimized' : ''}`}>
      <div className="form-card" style={{ maxWidth: '800px' }}>
        
        <div className="form-header">
          <h2>{estado === 'minimizado' ? 'Editando Empresa...' : (initialData ? `Editar Empresa ${initialData.numCliente}` : 'Nueva Empresa')}</h2>
          <div className="header-actions">
            {estado === 'abierto' ? <button type="button" onClick={onMinimize} className="btn-window">🗕</button> : <button type="button" onClick={onRestore} className="btn-window restore">🗖</button>}
            <button type="button" onClick={onClose} className="btn-window close">✕</button>
          </div>
        </div>

        <div style={{ display: estado === 'minimizado' ? 'none' : 'block' }}>
          <div className="tabs-container">
            <button type="button" className={`tab-button ${pestañaActiva === 'general' ? 'active' : ''}`} onClick={() => setPestañaActiva('general')}>Información General y Fiscal</button>
            <button type="button" className={`tab-button ${pestañaActiva === 'contacto' ? 'active' : ''}`} onClick={() => setPestañaActiva('contacto')}>Contacto y Dirección</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="tab-content" style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: '10px' }}>
              
              {pestañaActiva === 'general' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label orange"># de Cliente *</label>
                    <input type="text" name="numCliente" className="form-control" value={formData.numCliente} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
                      <option value="Activa">Activa</option>
                      <option value="Inactiva">Inactiva</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Razón Social (Empresa) *</label>
                    <input type="text" name="nombre" className="form-control" value={formData.nombre} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre Corto</label>
                    <input type="text" name="nombreCorto" className="form-control" value={formData.nombreCorto} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Tipo de Servicios (Categoría Principal) *</label>
                    <select name="tiposServicio" className="form-control" value={formData.tiposServicio} onChange={handleChange} required>
                      <option value="Proveedor (Servicios)">Proveedor (Servicios)</option>
                      <option value="Cliente (Mercancía)">Cliente (Mercancía)</option>
                      <option value="Propietario (Remolques)">Propietario (Remolques)</option>
                      <option value="Bódega">Bódega</option>
                      <option value="Cliente (Paga)">Cliente (Paga)</option>
                      <option value="Proveedor (Transporte)">Proveedor (Transporte)</option>
                      <option value="Empresas Roelca">Empresas Roelca</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">RFC / Tax Id</label>
                    <input type="text" name="rfcTaxId" className="form-control" value={formData.rfcTaxId} onChange={handleChange} />
                  </div>
                </div>
              )}

              {pestañaActiva === 'contacto' && (
                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <label className="form-label">Dirección Completa</label>
                    <input type="text" name="direccion" className="form-control" value={formData.direccion} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono Principal</label>
                    <input type="text" name="telefono" className="form-control" value={formData.telefono} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Correo Electrónico</label>
                    <input type="email" name="correo" className="form-control" value={formData.correo} onChange={handleChange} />
                  </div>
                </div>
              )}

            </div>

            <div className="form-actions" style={{ marginTop: '16px' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">Cancelar</button>
              <button type="submit" className="btn btn-primary">{initialData ? 'Guardar Cambios' : 'Guardar Empresa'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};