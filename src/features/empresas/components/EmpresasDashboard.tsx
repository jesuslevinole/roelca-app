// src/features/empresas/components/EmpresasDashboard.tsx
import { useState } from 'react';
import { FormularioEmpresa } from './FormularioEmpresa';

// Datos de prueba basados en tu imagen
const datosIniciales = [
  { id: '1', numCliente: 'EMP-852', nombre: 'MEXKET S. DE R.L. DE C.V', nombreCorto: '', tiposServicio: 'Cliente (Mercancía)', rfcTaxId: '', fechaUltimoServicio: '', status: 'Activa' },
  { id: '2', numCliente: 'EMP-851', nombre: 'CHATOMIL', nombreCorto: '', tiposServicio: 'Proveedor (Transporte)', rfcTaxId: '', fechaUltimoServicio: '', status: 'Activa' },
  { id: '3', numCliente: 'EMP-850', nombre: 'TTO NUEVO', nombreCorto: '', tiposServicio: 'Proveedor (Servicios)', rfcTaxId: 'XAXX010101000', fechaUltimoServicio: '', status: 'Activa' },
  { id: '4', numCliente: 'EMP-849', nombre: 'GALAS DE MEXICO', nombreCorto: '', tiposServicio: 'Cliente (Mercancía)', rfcTaxId: '', fechaUltimoServicio: '', status: 'Activa' },
  { id: '5', numCliente: 'EMP-848', nombre: 'TRAYTON MUEBLES MEXICO S. DE...', nombreCorto: '', tiposServicio: 'Cliente (Mercancía)', rfcTaxId: '', fechaUltimoServicio: '', status: 'Activa' },
  { id: '6', numCliente: 'EMP-847', nombre: 'PATIO SINTRA NLD', nombreCorto: '', tiposServicio: 'Bódega', rfcTaxId: 'XAXX010101000', fechaUltimoServicio: '', status: 'Activa' },
];

const EmpresasDashboard = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [empresaEditando, setEmpresaEditando] = useState<any | null>(null);
  const [filtroActivo, setFiltroActivo] = useState('Todo');
  
  const [empresas, setEmpresas] = useState(datosIniciales);
  const [empresaViendo, setEmpresaViendo] = useState<any | null>(null);

  const handleNuevo = () => { setEmpresaEditando(null); setEstadoFormulario('abierto'); };
  const editarEmpresa = (empresa: any) => { setEmpresaEditando(empresa); setEmpresaViendo(null); setEstadoFormulario('abierto'); };
  
  const eliminarEmpresa = (id: string) => {
    if (window.confirm('⚠️ ¿Estás seguro de que deseas eliminar permanentemente esta empresa?')) {
      setEmpresas(empresas.filter(emp => emp.id !== id));
      setEmpresaViendo(null);
    }
  };

  const mostrarDato = (dato: any) => (dato && dato !== '' ? dato : '-');

  return (
    <>
      {/* Modal del Formulario */}
      {estadoFormulario !== 'cerrado' && (
        <FormularioEmpresa 
          estado={estadoFormulario} initialData={empresaEditando}
          onClose={() => { setEstadoFormulario('cerrado'); setEmpresaEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      {/* Modal de Detalles Verticales */}
      {empresaViendo && (
        <div className="modal-overlay">
          <div className="form-card detail-card" style={{ maxWidth: '600px' }}>
            <div className="form-header">
              <h2>🏢 Detalle de Empresa <span style={{ color: '#D84315' }}>{empresaViendo.numCliente}</span></h2>
              <button onClick={() => setEmpresaViendo(null)} className="btn-window close">✕</button>
            </div>
            
            <div className="detail-content">
              <div className="detail-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="detail-item"><span className="detail-label">Razón Social</span><span className="detail-value" style={{ color: '#D84315', fontWeight: 'bold' }}>{mostrarDato(empresaViendo.nombre)}</span></div>
                <div className="detail-item"><span className="detail-label">Nombre Corto</span><span className="detail-value">{mostrarDato(empresaViendo.nombreCorto)}</span></div>
                <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value"><span className={`dot ${empresaViendo.status === 'Activa' ? 'dot-green' : 'dot-gray'}`}></span>{mostrarDato(empresaViendo.status)}</span></div>
                <div className="detail-item"><span className="detail-label">Tipo de Servicios</span><span className="detail-value">{mostrarDato(empresaViendo.tiposServicio)}</span></div>
                <div className="detail-item"><span className="detail-label">RFC / Tax ID</span><span className="detail-value font-mono">{mostrarDato(empresaViendo.rfcTaxId)}</span></div>
                <div className="detail-item"><span className="detail-label">Fecha del último servicio</span><span className="detail-value">{mostrarDato(empresaViendo.fechaUltimoServicio)}</span></div>
                <div className="detail-item"><span className="detail-label">Dirección</span><span className="detail-value">{mostrarDato(empresaViendo.direccion)}</span></div>
                <div className="detail-item"><span className="detail-label">Teléfono / Correo</span><span className="detail-value">{mostrarDato(empresaViendo.telefono)} | {mostrarDato(empresaViendo.correo)}</span></div>
              </div>
            </div>

            <div className="form-actions detail-actions" style={{ marginTop: '24px', justifyContent: 'space-between', borderTop: '1px solid #21262d', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => eliminarEmpresa(empresaViendo.id)} className="btn btn-danger-solid">🗑️ Eliminar</button>
                <button onClick={() => editarEmpresa(empresaViendo)} className="btn btn-edit-solid">✏️ Editar</button>
              </div>
              <button onClick={() => setEmpresaViendo(null)} className="btn btn-outline">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Header del Módulo --- */}
      <div className="module-header">
        <h1 className="module-title" style={{ fontSize: '1.2rem', color: '#8b949e' }}>
          Bases de Datos &gt; <span style={{ color: '#f0f6fc', fontWeight: 'bold' }}>Empresas (834)</span>
        </h1>
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={handleNuevo}>+ Agregar</button>
        </div>
      </div>

      {/* --- Cuerpo Principal (Filtros y Tabla) --- */}
      <div className="content-body">
        <div className="filters-sidebar">
          <div className={`filter-item ${filtroActivo === 'Todo' ? 'active' : ''}`} onClick={() => setFiltroActivo('Todo')}><span>Todo</span></div>
          <div className={`filter-item ${filtroActivo === 'ProveedorServicios' ? 'active' : ''}`} onClick={() => setFiltroActivo('ProveedorServicios')}><span>Proveedor (Servicios)</span> <span className="filter-badge">58</span></div>
          <div className={`filter-item ${filtroActivo === 'Inactiva' ? 'active' : ''}`} onClick={() => setFiltroActivo('Inactiva')}><span>Empresa INACTIVA</span> <span className="filter-badge">6</span></div>
          <div className={`filter-item ${filtroActivo === 'ClienteMercancia' ? 'active' : ''}`} onClick={() => setFiltroActivo('ClienteMercancia')}><span>Cliente (Mercancía)</span> <span className="filter-badge">177</span></div>
          <div className={`filter-item ${filtroActivo === 'Propietario' ? 'active' : ''}`} onClick={() => setFiltroActivo('Propietario')}><span>Propietario (Remolques)</span> <span className="filter-badge">5</span></div>
          <div className={`filter-item ${filtroActivo === 'Bodega' ? 'active' : ''}`} onClick={() => setFiltroActivo('Bodega')}><span>Bódega</span> <span className="filter-badge">508</span></div>
          <div className={`filter-item ${filtroActivo === 'ClientePaga' ? 'active' : ''}`} onClick={() => setFiltroActivo('ClientePaga')}><span>Cliente (Paga)</span> <span className="filter-badge">54</span></div>
          <div className={`filter-item ${filtroActivo === 'ProveedorTransporte' ? 'active' : ''}`} onClick={() => setFiltroActivo('ProveedorTransporte')}><span>Proveedor (Transporte)</span> <span className="filter-badge">47</span></div>
          <div className={`filter-item ${filtroActivo === 'EmpresasRoelca' ? 'active' : ''}`} onClick={() => setFiltroActivo('EmpresasRoelca')}><span>Empresas Roelca</span> <span className="filter-badge">4</span></div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th># de Cliente</th>
                <th>Empresa</th>
                <th>Nombre Corto</th>
                <th>Tipo de Servicios</th>
                <th>RFC / Tax Id</th>
                <th>Fecha del ultimo Servicio</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((emp) => (
                <tr key={emp.id} onClick={() => setEmpresaViendo(emp)}>
                  <td className="font-mono">{emp.numCliente}</td>
                  <td style={{ fontWeight: '500', color: '#f0f6fc' }}>{emp.nombre}</td>
                  <td>{mostrarDato(emp.nombreCorto)}</td>
                  <td>{emp.tiposServicio}</td>
                  <td className="font-mono">{mostrarDato(emp.rfcTaxId)}</td>
                  <td>{mostrarDato(emp.fechaUltimoServicio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default EmpresasDashboard;