// src/features/empresas/components/EmpresasDashboard.tsx
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, eliminarRegistro } from '../../../config/firebase';
import { FormularioEmpresa } from './FormularioEmpresa';

const opcionesFiltro = [
  'Todo', 'Proveedor (Servicios)', 'Empresa Inactiva', 'Cliente (Mercancía)', 
  'Propietario (Remolques)', 'Bodega', 'Cliente (Paga)', 'Proveedor (Transporte)', 'Empresas Roelca'
];

const EmpresasDashboard = () => {
  const [estadoFormulario, setEstadoFormulario] = useState<'cerrado' | 'abierto' | 'minimizado'>('cerrado');
  const [empresaEditando, setEmpresaEditando] = useState<any | null>(null);
  
  // Estados para los filtros
  const [filtroActivo, setFiltroActivo] = useState('Todo');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // --- FIREBASE: Estado inicial vacío ---
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresaViendo, setEmpresaViendo] = useState<any | null>(null);

  // --- FIREBASE: Lectura en tiempo real ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'empresas'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenamos las empresas por su número de cliente (EMP-001, EMP-002, etc.)
      data.sort((a: any, b: any) => {
        if (a.numCliente && b.numCliente) {
          return a.numCliente.localeCompare(b.numCliente);
        }
        return 0;
      });

      setEmpresas(data);
    });

    return () => unsubscribe(); // Limpiamos la conexión al salir de la pantalla
  }, []);

  const handleNuevo = () => { setEmpresaEditando(null); setEstadoFormulario('abierto'); };
  const editarEmpresa = (empresa: any) => { setEmpresaEditando(empresa); setEmpresaViendo(null); setEstadoFormulario('abierto'); };
  
  // --- FIREBASE: Eliminar registro ---
  const eliminarEmpresa = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente esta empresa?')) {
      try {
        await eliminarRegistro('empresas', id);
        setEmpresaViendo(null); // Cierra el modal de detalle después de borrar
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert('Hubo un error al eliminar. Revisa tu conexión a internet.');
      }
    }
  };

  const mostrarDato = (dato: any) => (dato && dato !== '' ? dato : '-');

  // --- LÓGICA DE FILTRADO ---
  const empresasFiltradas = empresas.filter(emp => {
    if (filtroActivo === 'Todo') return true;
    if (filtroActivo === 'Empresa Inactiva') return emp.status === 'Inactiva';
    return emp.tiposServicio === filtroActivo;
  });

  return (
    <>
      {/* FORMULARIO */}
      {estadoFormulario !== 'cerrado' && (
        <FormularioEmpresa 
          estado={estadoFormulario} 
          initialData={empresaEditando}
          registros={empresas} // Le pasamos la lista para que pueda calcular el EMP-00X
          onClose={() => { setEstadoFormulario('cerrado'); setEmpresaEditando(null); }}
          onMinimize={() => setEstadoFormulario('minimizado')} 
          onRestore={() => setEstadoFormulario('abierto')}
        />
      )}

      {/* MODAL DETALLES */}
      {empresaViendo && (
        <div className="modal-overlay">
          <div className="form-card detail-card" style={{ maxWidth: '600px' }}>
            <div className="form-header">
              <h2>Detalle de Empresa <span style={{ color: '#D84315' }}>{empresaViendo.numCliente}</span></h2>
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
                <button onClick={() => eliminarEmpresa(empresaViendo.id)} className="btn btn-danger-solid">Eliminar</button>
                <button onClick={() => editarEmpresa(empresaViendo)} className="btn btn-edit-solid">Editar</button>
              </div>
              <button onClick={() => setEmpresaViendo(null)} className="btn btn-outline">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER Y BOTONES --- */}
      <div className="module-header" style={{ justifyContent: 'flex-end', paddingBottom: '16px' }}>
        <div className="action-buttons" style={{ display: 'flex', gap: '12px', position: 'relative' }}>
          
          <button className="btn btn-outline" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            Filtro: {filtroActivo} ▼
          </button>
          
          {mostrarFiltros && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', zIndex: 50, minWidth: '220px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', padding: '8px 0' }}>
              {opcionesFiltro.map((f) => (
                <div 
                  key={f} 
                  style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '0.9rem', color: filtroActivo === f ? '#f0f6fc' : '#8b949e', backgroundColor: filtroActivo === f ? '#21262d' : 'transparent' }}
                  onClick={() => { setFiltroActivo(f); setMostrarFiltros(false); }}
                >
                  {f}
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-primary" onClick={handleNuevo}>+ Agregar Cliente</button>
        </div>
      </div>

      {/* --- TABLA DE DATOS --- */}
      <div className="content-body" style={{ display: 'block' }}>
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
              {empresasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#8b949e' }}>
                    Aún no hay empresas registradas o ninguna coincide con el filtro.
                  </td>
                </tr>
              ) : (
                empresasFiltradas.map((emp) => (
                  <tr key={emp.id} onClick={() => setEmpresaViendo(emp)} style={{ cursor: 'pointer' }}>
                    <td className="font-mono">{emp.numCliente}</td>
                    <td style={{ fontWeight: '500', color: '#f0f6fc' }}>{emp.nombre}</td>
                    <td>{mostrarDato(emp.nombreCorto)}</td>
                    <td>{emp.tiposServicio}</td>
                    <td className="font-mono">{mostrarDato(emp.rfcTaxId)}</td>
                    <td>{mostrarDato(emp.fechaUltimoServicio)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default EmpresasDashboard;