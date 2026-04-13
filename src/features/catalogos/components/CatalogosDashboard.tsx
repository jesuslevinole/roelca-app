// src/features/catalogos/components/CatalogosDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro, eliminarRegistro } from '../../../config/firebase';

import { listaCatalogos } from '../config/catalogSchemas';
import type { CatalogSchema, CatalogField } from '../config/catalogSchemas';

// =========================================
// SUB-COMPONENTE: MODAL DE CONFIGURACIÓN
// =========================================
const FieldConfigModal = ({ 
  isOpen, 
  onClose, 
  fields, 
  requiredFields, 
  toggleRequired 
}: {
  isOpen: boolean;
  onClose: () => void;
  fields: { name: string; label: string }[];
  requiredFields: string[];
  toggleRequired: (f: string) => void;
}) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', zIndex: 2000 }}>
      <div className="form-card" style={{ maxWidth: '400px', borderRadius: '16px', border: '1px solid #30363d', backgroundColor: '#0d1117' }}>
        <div className="form-header" style={{ padding: '20px 24px', borderBottom: '1px solid #30363d', marginBottom: '0' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', margin: 0, color: '#f0f6fc' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Campos Obligatorios
          </h3>
          <button className="close-x" onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: '0.85rem', color: '#8b949e', marginBottom: '20px', lineHeight: '1.5' }}>
            Selecciona qué campos deben ser obligatorios al llenar este formulario.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {fields.map((f: { name: string; label: string }) => (
              <label key={f.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.95rem', color: '#c9d1d9' }}>
                <input 
                  type="checkbox" 
                  checked={requiredFields.includes(f.name)} 
                  onChange={() => toggleRequired(f.name)} 
                  style={{ width: '18px', height: '18px', accentColor: '#D84315', cursor: 'pointer' }}
                />
                {f.label}
              </label>
            ))}
          </div>
          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-primary" onClick={onClose} style={{ width: '100%', padding: '10px' }}>Listo</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================
// COMPONENTE PRINCIPAL
// =========================================
const CatalogosDashboard = () => {
  const [catalogoSeleccionado, setCatalogoSeleccionado] = useState<CatalogSchema | null>(null);
  const [registrosGlobales, setRegistrosGlobales] = useState<any[]>([]);
  const [modalEstado, setModalEstado] = useState<'cerrado' | 'formulario' | 'detalle'>('cerrado');
  const [registroActual, setRegistroActual] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  
  const [opcionesDinamicas, setOpcionesDinamicas] = useState<Record<string, any[]>>({});
  
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);

  const [busqueda, setBusqueda] = useState('');

  // ✅ ESTADOS DE PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 50;

  // Estado para el hover de las filas (Fondo sólido móvil)
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // ✅ HELPER DE FORMATEO
  const formatearValorVisual = (valor: any, field: CatalogField) => {
    if (field.options?.includes('Sí') && field.options?.includes('No')) {
      if (valor === '1' || valor === 1 || valor === true || valor === 'Sí') return 'Sí';
      if (valor === '0' || valor === 0 || valor === false || valor === 'No') return 'No';
    }
    return valor !== undefined && valor !== null ? String(valor) : '-';
  };

  useEffect(() => {
    if (!catalogoSeleccionado) return;
    
    const savedConfig = localStorage.getItem(`formConfig_${catalogoSeleccionado.id}`);
    if (savedConfig) {
      setRequiredFields(JSON.parse(savedConfig));
    } else {
      const defaults = catalogoSeleccionado.fields.filter((f: CatalogField) => f.required).map((f: CatalogField) => f.name);
      setRequiredFields(defaults);
    }

    const unsubscribe = onSnapshot(collection(db, `catalogo_${catalogoSeleccionado.id}`), (snapshot) => {
      setRegistrosGlobales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const cargarOpcionesDinamicas = async () => {
      const nuevasOpciones: Record<string, any[]> = {};
      for (const field of catalogoSeleccionado.fields) {
        if (field.dynamicOptions) {
          const { collection: col } = field.dynamicOptions;
          try {
            const querySnapshot = await getDocs(collection(db, col));
            nuevasOpciones[field.name] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          } catch (error) {
            console.error(`Error cargando colección dinámica ${col}:`, error);
          }
        }
      }
      setOpcionesDinamicas(nuevasOpciones);
    };

    cargarOpcionesDinamicas();
    setBusqueda(''); 
    setPaginaActual(1);

    return () => unsubscribe();
  }, [catalogoSeleccionado]);

  // Si busca, reseteamos a página 1
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  const toggleRequired = (fieldName: string) => {
    if (!catalogoSeleccionado) return;
    const newRequired = requiredFields.includes(fieldName)
      ? requiredFields.filter((f: string) => f !== fieldName)
      : [...requiredFields, fieldName];
    
    setRequiredFields(newRequired);
    localStorage.setItem(`formConfig_${catalogoSeleccionado.id}`, JSON.stringify(newRequired));
  };

  const isRequired = (fieldName: string) => requiredFields.includes(fieldName);

  const guardarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const col = `catalogo_${catalogoSeleccionado!.id}`;
      registroActual ? await actualizarRegistro(col, registroActual.id, formData) : await agregarRegistro(col, formData);
      setModalEstado('cerrado');
    } catch (error) { alert('Error en Firebase.'); }
  };

  // ✅ Filtrado GLOBAL Inteligente Dinámico
  const registrosFiltrados = useMemo(() => {
    if (!busqueda.trim() || !catalogoSeleccionado) return registrosGlobales;
    
    const termino = busqueda.toLowerCase();
    return registrosGlobales.filter(reg => {
      return Object.entries(reg).some(([key, value]) => {
        if (key === 'id') return false; 
        
        const fieldConfig = catalogoSeleccionado.fields.find((f: CatalogField) => f.name === key);
        if (fieldConfig?.dynamicOptions && opcionesDinamicas[key]) {
          const dOpt = fieldConfig.dynamicOptions;
          const labelAsociado = opcionesDinamicas[key].find((opt: any) => opt[dOpt.valueField] === value)?.[dOpt.labelField];
          return String(labelAsociado || '').toLowerCase().includes(termino);
        }
        
        return String(value).toLowerCase().includes(termino);
      });
    });
  }, [registrosGlobales, busqueda, catalogoSeleccionado, opcionesDinamicas]);

  // ✅ LOGICA DE PAGINACIÓN
  const totalPaginas = Math.ceil(registrosFiltrados.length / registrosPorPagina);
  const indiceUltimoRegistro = paginaActual * registrosPorPagina;
  const indicePrimerRegistro = indiceUltimoRegistro - registrosPorPagina;
  const registrosEnPantalla = registrosFiltrados.slice(indicePrimerRegistro, indiceUltimoRegistro);

  const irPaginaSiguiente = () => setPaginaActual(prev => Math.min(prev + 1, totalPaginas));
  const irPaginaAnterior = () => setPaginaActual(prev => Math.max(prev - 1, 1));

  // ✅ EXPORTAR CSV
  const exportarCSV = () => {
    if (!catalogoSeleccionado || registrosFiltrados.length === 0) return alert("No hay datos para exportar.");

    const headers = catalogoSeleccionado.fields.map(f => f.label);
    const csvContent = [
      headers.join(','),
      ...registrosFiltrados.map(reg => {
        return catalogoSeleccionado.fields.map((f: CatalogField) => {
          let valor = reg[f.name] !== undefined ? reg[f.name] : '';
          
          if (f.options?.includes('Sí') && f.options?.includes('No')) {
            if (valor === '1' || valor === 1 || valor === true) valor = 'Sí';
            if (valor === '0' || valor === 0 || valor === false) valor = 'No';
          }

          if (f.dynamicOptions && opcionesDinamicas[f.name]) {
            const dOpt = f.dynamicOptions;
            valor = opcionesDinamicas[f.name].find((opt: any) => opt[dOpt.valueField] === valor)?.[dOpt.labelField] || valor;
          }
          
          return `"${String(valor).replace(/"/g, '""')}"`;
        }).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Catalogo_${catalogoSeleccionado.titulo}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLongForm = catalogoSeleccionado ? catalogoSeleccionado.fields.length > 4 : false;

  // --- VISTA 1: CUADRÍCULA DE CATÁLOGOS ---
  if (!catalogoSeleccionado) return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      <h1 className="module-title" style={{ fontSize: '1.5rem', color: '#f0f6fc', margin: '0 0 24px 0', fontWeight: 'bold' }}>
        Administración de Catálogos
      </h1>
      <div className="catalog-grid">
        {listaCatalogos.map((cat: CatalogSchema) => (
          <div key={cat.id} className="catalog-card" onClick={() => setCatalogoSeleccionado(cat)}>
            <div className="catalog-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">{cat.icono}</svg>
            </div>
            <div className="catalog-title">{cat.titulo}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // --- VISTA 2: TABLA ESTANDARIZADA ---
  return (
    <div className="module-container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease', width: '100%', boxSizing: 'border-box' }}>
      
      {/* CONTENEDOR MAESTRO */}
     <div style={{ width: '100%', margin: '0 auto' }}>
        
        {/* HEADER: TÍTULO Y BOTÓN VOLVER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          <button onClick={() => setCatalogoSeleccionado(null)} style={{ background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ← Volver a Catálogos
          </button>
          <h1 className="module-title" style={{ fontSize: '1.5rem', color: '#f0f6fc', margin: 0, fontWeight: 'bold' }}>
            {catalogoSeleccionado.titulo}
          </h1>
        </div>

        {/* BARRA DE CONTROLES: Responsive y Alineada */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', width: '100%' }}>
          
          {/* Izquierda: Filtro Estático */}
          <div style={{ flex: '1 1 auto', maxWidth: '200px', minWidth: '120px' }}>
            <select className="form-control" style={{ width: '100%', backgroundColor: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9' }}>
              <option>Filtro: Todo</option>
            </select>
          </div>

          {/* Centro: Buscador Inteligente Dinámico */}
          <div style={{ flex: '2 1 250px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
              <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder={`Buscar en ${catalogoSeleccionado.titulo.toLowerCase()}...`}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 40px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Derecha: Botones */}
          <div style={{ flex: '1 1 auto', display: 'flex', gap: '12px', justifyContent: 'flex-end', minWidth: '280px' }}>
            <button className="btn btn-outline" onClick={exportarCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Exportar CSV
            </button>
            <button className="btn btn-primary" onClick={() => { setRegistroActual(null); setFormData({}); setModalEstado('formulario'); }} style={{ whiteSpace: 'nowrap' }}>
              + Agregar Registro
            </button>
          </div>
        </div>

        {/* TABLA RESPONSIVE */}
        <div className="content-body" style={{ display: 'block', width: '100%' }}>
          <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', width: '100%' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#161b22', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '16px', width: '160px', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', position: 'sticky', left: 0, backgroundColor: '#161b22', zIndex: 12, borderRight: '1px solid #30363d', borderBottom: '1px solid #30363d' }}>
                    Acciones
                  </th>
                  {catalogoSeleccionado.fields.map((f: CatalogField) => (
                    <th key={f.name} style={{ padding: '16px', color: '#8b949e', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #30363d' }}>
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrosEnPantalla.length === 0 ? (
                  <tr>
                    <td colSpan={catalogoSeleccionado.fields.length + 1} style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
                      {busqueda ? 'No se encontraron coincidencias.' : 'No hay registros en este catálogo. Haz clic en "+ Agregar Registro" para comenzar.'}
                    </td>
                  </tr>
                ) : (
                  registrosEnPantalla.map((reg: any) => (
                    <tr 
                      key={reg.id} 
                      onClick={() => { setRegistroActual(reg); setModalEstado('detalle'); }}
                      style={{ borderBottom: '1px solid #21262d', backgroundColor: hoveredRowId === reg.id ? '#21262d' : '#0d1117', transition: 'background-color 0.2s', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredRowId(reg.id!)} 
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      {/* CELDA ACCIONES FIJA Y SÓLIDA */}
                      <td style={{ padding: '16px', textAlign: 'center', position: 'sticky', left: 0, backgroundColor: 'inherit', zIndex: 5, borderRight: '1px solid #30363d' }} onClick={(e: any) => e.stopPropagation()}>
                        <div className="actions-cell" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            className="btn-small btn-edit" 
                            onClick={(e) => { e.stopPropagation(); setRegistroActual(reg); setFormData(reg); setModalEstado('formulario'); }}
                            style={{ background: 'transparent', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                            onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                            onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            Editar
                          </button>
                          <button 
                            className="btn-small btn-danger" 
                            onClick={async (e) => { e.stopPropagation(); if (window.confirm('¿Desea eliminar permanentemente este registro?')) await eliminarRegistro(`catalogo_${catalogoSeleccionado!.id}`, reg.id); }}
                            style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem', transition: 'all 0.2s' }}
                            onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>

                      {/* DATOS DINÁMICOS */}
                      {catalogoSeleccionado.fields.map((f: CatalogField) => {
                        const dOpt = f.dynamicOptions;
                        return (
                          <td key={f.name} style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                            {dOpt && opcionesDinamicas[f.name]
                              ? (opcionesDinamicas[f.name].find((opt: any) => opt[dOpt.valueField] === reg[f.name])?.[dOpt.labelField] || formatearValorVisual(reg[f.name], f))
                              : formatearValorVisual(reg[f.name], f)
                            }
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* CONTROLES DE PAGINACIÓN */}
          {registrosFiltrados.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ color: '#8b949e', fontSize: '0.9rem' }}>
                Mostrando {indicePrimerRegistro + 1} - {Math.min(indiceUltimoRegistro, registrosFiltrados.length)} de {registrosFiltrados.length} registros
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={irPaginaAnterior} 
                  disabled={paginaActual === 1}
                  style={{ padding: '6px 12px', backgroundColor: paginaActual === 1 ? '#0d1117' : '#21262d', color: paginaActual === 1 ? '#484f58' : '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Anterior
                </button>
                <span style={{ padding: '6px 12px', color: '#f0f6fc', fontWeight: 'bold' }}>{paginaActual} / {totalPaginas || 1}</span>
                <button 
                  onClick={irPaginaSiguiente} 
                  disabled={paginaActual === totalPaginas || totalPaginas === 0}
                  style={{ padding: '6px 12px', backgroundColor: paginaActual === totalPaginas || totalPaginas === 0 ? '#0d1117' : '#21262d', color: paginaActual === totalPaginas || totalPaginas === 0 ? '#484f58' : '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: paginaActual === totalPaginas || totalPaginas === 0 ? 'not-allowed' : 'pointer' }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODALES EXTRAS (Configuración y Formularios) */}
      <FieldConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        fields={catalogoSeleccionado.fields} 
        requiredFields={requiredFields} 
        toggleRequired={toggleRequired} 
      />

      {modalEstado !== 'cerrado' && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="form-card" style={{ maxWidth: modalEstado === 'formulario' && isLongForm ? '800px' : '480px', width: '100%', borderRadius: '12px', border: '1px solid #444', backgroundColor: '#0d1117', transition: 'max-width 0.3s ease' }}>
            <div className="form-header" style={{ padding: '24px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '500', margin: 0, color: '#f0f6fc' }}>
                {modalEstado === 'detalle' ? 'Información del Registro' : (registroActual ? 'Editar Registro' : 'Nuevo Registro')}
              </h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {modalEstado === 'formulario' && (
                  <button 
                    type="button" 
                    onClick={() => setIsConfigOpen(true)} 
                    style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Configurar campos obligatorios"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                  </button>
                )}
                <button className="close-x" onClick={() => setModalEstado('cerrado')} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              </div>
            </div>
            
            <div>
              {modalEstado === 'formulario' ? (
                <form onSubmit={guardarRegistro} style={{ padding: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isLongForm ? '1fr 1fr' : '1fr', gap: '20px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
                    {catalogoSeleccionado.fields.map((field: CatalogField) => {
                      const esRequerido = isRequired(field.name);
                      const dOpt = field.dynamicOptions;
                      
                      let valorInput = formData[field.name] !== undefined ? formData[field.name] : '';
                      if (field.options?.includes('Sí') && field.options?.includes('No')) {
                        if (valorInput === '1' || valorInput === 1 || valorInput === true) valorInput = 'Sí';
                        if (valorInput === '0' || valorInput === 0 || valorInput === false) valorInput = 'No';
                      }

                      return (
                        <div key={field.name} className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>
                            {field.label} {esRequerido && <span style={{ color: '#ff4d4d' }}>*</span>}
                          </label>
                          {field.type === 'select' ? (
                            <select 
                              value={valorInput} 
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, [field.name]: e.target.value})} 
                              className="form-control" 
                              required={esRequerido}
                              style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }}
                            >
                              <option value="">Seleccione una opción</option>
                              {dOpt 
                                ? opcionesDinamicas[field.name]
                                    ?.filter((opt: any) => {
                                      if (!dOpt.filterField || !dOpt.filterValue) return true;
                                      const fVal = opt[dOpt.filterField];
                                      if (Array.isArray(fVal)) return fVal.includes(dOpt.filterValue);
                                      return JSON.stringify(opt).toLowerCase().includes(String(dOpt.filterValue).toLowerCase());
                                    })
                                    .map((opt: any) => (
                                      <option key={opt[dOpt.valueField]} value={opt[dOpt.valueField]}>
                                        {opt[dOpt.labelField]}
                                      </option>
                                    ))
                                : field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)
                              }
                            </select>
                          ) : (
                            <input 
                              type={field.type} 
                              value={valorInput} 
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, [field.name]: e.target.value})} 
                              className="form-control" 
                              required={esRequerido} 
                              style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'flex-end', borderTop: '1px solid #30363d', paddingTop: '24px' }}>
                    <button type="button" onClick={() => setModalEstado('cerrado')} style={{ backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
                    <button type="submit" style={{ backgroundColor: '#D84315', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Guardar</button>
                  </div>
                </form>
              ) : (
                <div className="detalle-view" style={{ padding: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isLongForm ? '1fr 1fr' : '1fr', gap: '20px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
                    {catalogoSeleccionado.fields.map((f: CatalogField) => {
                      const dOpt = f.dynamicOptions;
                      return (
                        <div key={f.name} style={{ borderBottom: '1px solid #21262d', paddingBottom: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{f.label}</span>
                          <span style={{ fontSize: '1rem', color: '#f0f6fc' }}>
                            {dOpt && opcionesDinamicas[f.name]
                              ? (opcionesDinamicas[f.name].find((opt: any) => opt[dOpt.valueField] === registroActual[f.name])?.[dOpt.labelField] || formatearValorVisual(registroActual[f.name], f))
                              : formatearValorVisual(registroActual[f.name], f)
                            }
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" onClick={() => setModalEstado('cerrado')} style={{ width: '100%', marginTop: '32px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Cerrar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogosDashboard;