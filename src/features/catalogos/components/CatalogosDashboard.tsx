// src/features/catalogos/components/CatalogosDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db, agregarRegistro, actualizarRegistro, eliminarRegistro } from '../../../config/firebase';

import { listaCatalogos } from '../config/catalogSchemas';
import type { CatalogSchema, CatalogField } from '../config/catalogSchemas';

// =========================================
// COMPONENTE PRINCIPAL
// =========================================
const CatalogosDashboard = () => {
  const [catalogoSeleccionado, setCatalogoSeleccionado] = useState<CatalogSchema | null>(null);
  const [registrosGlobales, setRegistrosGlobales] = useState<any[]>([]);
  const [modalEstado, setModalEstado] = useState<'cerrado' | 'formulario'>('cerrado');
  const [registroActual, setRegistroActual] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  
  const [opcionesDinamicas, setOpcionesDinamicas] = useState<Record<string, any[]>>({});
  const [busqueda, setBusqueda] = useState('');

  // ✅ ESTADOS DE VISTA DETALLE PRINCIPAL
  const [viendoDetalles, setViendoDetalles] = useState<boolean>(false);
  const [detailsData, setDetailsData] = useState<Record<string, any[]>>({});

  // ✅ ESTADOS DEL SUB-MODAL (AGREGAR/EDITAR DETALLES)
  const [subModalEstado, setSubModalEstado] = useState<'cerrado' | 'abierto'>('cerrado');
  const [subColeccionActual, setSubColeccionActual] = useState<any | null>(null);
  const [subRegistroActual, setSubRegistroActual] = useState<any | null>(null);
  const [subFormData, setSubFormData] = useState<any>({});

  // ✅ ESTADOS DE PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 50;

  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // ✅ HELPERS DE FORMATEO Y DETECCIÓN DE MONEDA
  const isCurrencyField = (fieldName: string) => {
    return /monto|importe|sueldo|total|precio|cargos|iva|isr|dolares|pesos|costo|pago|tarifa/i.test(fieldName);
  };

  const formatoMoneda = (monto: any) => {
    if (monto === undefined || monto === null || monto === '') return '-';
    const num = Number(monto);
    if (isNaN(num)) return monto;
    return `$ ${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDisplayValue = (reg: any, f: CatalogField | { name: string, label?: string, dynamicOptions?: any, options?: string[], type?: string }) => {
    let valor = reg[f.name];
    
    if ('options' in f && f.options?.includes('Sí') && f.options?.includes('No')) {
      if (valor === '1' || valor === 1 || valor === true || String(valor).toLowerCase() === 'sí') return 'Sí';
      if (valor === '0' || valor === 0 || valor === false || String(valor).toLowerCase() === 'no') return 'No';
    }

    if ('dynamicOptions' in f && f.dynamicOptions && opcionesDinamicas[f.dynamicOptions.collection]) {
      const dOpt = f.dynamicOptions;
      const encontrado = opcionesDinamicas[dOpt.collection].find((opt: any) => String(opt[dOpt.valueField]) === String(valor));
      return encontrado ? encontrado[dOpt.labelField] : valor;
    }

    if ((isCurrencyField(f.name) || f.type === 'currency') && valor !== undefined && valor !== null && valor !== '') {
      return formatoMoneda(valor);
    }

    return valor !== undefined && valor !== null && valor !== '' ? String(valor) : '-';
  };

  // Traductor de títulos de subcolecciones
  const getDetailTitle = (det: any) => {
    if (det.collection === 'gastos_mtto') return 'Asignar Gastos';
    if (det.collection === 'combustible') return 'Asignar Combustible';
    return det.titulo || det.name || det.collection;
  };

  // ✅ CARGA INICIAL DE CATÁLOGO Y OPCIONES DINÁMICAS
  useEffect(() => {
    if (!catalogoSeleccionado) return;

    setViendoDetalles(false);
    setRegistroActual(null);

    const unsubscribe = onSnapshot(collection(db, `catalogo_${catalogoSeleccionado.id}`), (snapshot) => {
      setRegistrosGlobales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const cargarOpcionesDinamicas = async () => {
      const nuevasOpciones: Record<string, any[]> = {};
      const collectionsToFetch = new Set<string>();

      catalogoSeleccionado.fields.forEach((field: CatalogField) => {
        if (field.dynamicOptions) collectionsToFetch.add(field.dynamicOptions.collection);
      });

      if (catalogoSeleccionado.details) {
        catalogoSeleccionado.details.forEach((det: any) => {
          if (det.fields) {
            det.fields.forEach((f: any) => {
              if (f.dynamicOptions) collectionsToFetch.add(f.dynamicOptions.collection);
            });
          }
        });
      }

      for (const col of Array.from(collectionsToFetch)) {
        try {
          const querySnapshot = await getDocs(collection(db, col));
          nuevasOpciones[col] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
          console.error(`Error cargando colección dinámica ${col}:`, error);
        }
      }
      setOpcionesDinamicas(nuevasOpciones);
    };

    cargarOpcionesDinamicas();
    setBusqueda(''); 
    setPaginaActual(1);

    return () => unsubscribe();
  }, [catalogoSeleccionado]);

  // ✅ CARGA DE SUB-COLECCIONES (DETALLES) EN TIEMPO REAL
  useEffect(() => {
    const details = catalogoSeleccionado?.details;

    if (viendoDetalles && registroActual && details) {
      const unsubscribes: any[] = [];

      details.forEach((detail: any) => {
        const unsub = onSnapshot(collection(db, detail.collection), (snapshot) => {
          const data = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Record<string, any>))
            .filter(docData => docData[detail.foreignKey] === registroActual.id);
          
          setDetailsData(prev => ({
            ...prev,
            [detail.collection]: data
          }));
        });
        unsubscribes.push(unsub);
      });

      return () => {
        unsubscribes.forEach(unsub => unsub());
      };
    }
  }, [viendoDetalles, registroActual, catalogoSeleccionado]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  const guardarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const col = `catalogo_${catalogoSeleccionado!.id}`;
      registroActual ? await actualizarRegistro(col, registroActual.id, formData) : await agregarRegistro(col, formData);
      setModalEstado('cerrado');
      setRegistroActual(null); 
    } catch (error) { alert('Error en Firebase al guardar.'); }
  };

  // ✅ FUNCIONES CRUD PARA SUBDETALLES (Motor de Formularios Anidados)
  const handleAgregarEditarSubdetalle = (coleccion: string, data?: any) => {
    const detailConfig = catalogoSeleccionado?.details?.find(d => d.collection === coleccion);
    if (!detailConfig) return;

    setSubColeccionActual(detailConfig);
    setSubRegistroActual(data || null);
    
    // Si es nuevo, inyectamos la llave foránea automáticamente conectando con el padre
    setSubFormData(data || { [detailConfig.foreignKey]: registroActual.id });
    setSubModalEstado('abierto');
  };

  const guardarSubRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (subRegistroActual) {
        await actualizarRegistro(subColeccionActual.collection, subRegistroActual.id, subFormData);
      } else {
        await agregarRegistro(subColeccionActual.collection, subFormData);
      }
      setSubModalEstado('cerrado');
      setSubRegistroActual(null);
      setSubColeccionActual(null);
      setSubFormData({});
    } catch (error) {
      alert('Error al guardar el sub-registro en Firebase.');
    }
  };

  const handleEliminarSubdetalle = async (coleccion: string, id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro permanentemente?')) {
      try {
        await eliminarRegistro(coleccion, id);
      } catch (error) {
        console.error("Error al eliminar subdetalle:", error);
        alert("Hubo un error al eliminar el registro.");
      }
    }
  };

  // ✅ Filtrado GLOBAL Inteligente Dinámico
  const registrosFiltrados = useMemo(() => {
    if (!busqueda.trim() || !catalogoSeleccionado) return registrosGlobales;
    
    const termino = busqueda.toLowerCase();
    return registrosGlobales.filter(reg => {
      return Object.entries(reg).some(([key, value]) => {
        if (key === 'id') return false; 
        
        const fieldConfig = catalogoSeleccionado.fields.find((f: CatalogField) => f.name === key);
        if (fieldConfig?.dynamicOptions && opcionesDinamicas[fieldConfig.dynamicOptions.collection]) {
          const dOpt = fieldConfig.dynamicOptions;
          const labelAsociado = opcionesDinamicas[dOpt.collection].find((opt: any) => opt[dOpt.valueField] === value)?.[dOpt.labelField];
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
          const valor = getDisplayValue(reg, f);
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
      
      {/* ✅ ESTILOS INYECTADOS PARA EL GRID DE DETALLES */}
      <style>{`
        .detail-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 768px) {
          .detail-grid-3 {
            grid-template-columns: 1fr;
          }
        }
        .sub-table th, .sub-table td {
          padding: 12px 16px;
        }
      `}</style>

      {/* CONTENEDOR MAESTRO DE LA TABLA */}
      <div style={{ width: '100%', margin: '0 auto' }}>
        
        {/* HEADER: TÍTULO Y BOTÓN VOLVER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          <button 
            onClick={() => setCatalogoSeleccionado(null)} 
            style={{ background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            ← Volver a Catálogos
          </button>
          <h1 className="module-title" style={{ fontSize: '1.5rem', color: '#f0f6fc', margin: 0, fontWeight: 'bold' }}>
            {catalogoSeleccionado.titulo}
          </h1>
        </div>

        {/* BARRA DE CONTROLES */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', width: '100%' }}>
          <div style={{ flex: '1 1 auto', maxWidth: '200px', minWidth: '120px' }}>
            <select className="form-control" style={{ width: '100%', backgroundColor: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9' }}>
              <option>Filtro: Todo</option>
            </select>
          </div>
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
                      onClick={() => { setRegistroActual(reg); setViendoDetalles(true); }}
                      style={{ borderBottom: '1px solid #21262d', backgroundColor: hoveredRowId === reg.id ? '#21262d' : '#0d1117', transition: 'background-color 0.2s', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredRowId(reg.id!)} 
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
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

                      {catalogoSeleccionado.fields.map((f: CatalogField) => {
                        return (
                          <td key={f.name} style={{ padding: '16px', color: '#c9d1d9', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                            {getDisplayValue(reg, f)}
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

      {/* ✅ VISTA: MODAL DETALLES ELEGANTES (TABLAS) */}
      {viendoDetalles && registroActual && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', zIndex: 1500, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="form-card detail-card" style={{ maxWidth: '1000px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0d1117', borderRadius: '12px', border: '1px solid #30363d', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            
            <div className="form-header" style={{ padding: '20px 24px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ margin: 0, color: '#f0f6fc', fontSize: '1.25rem' }}>
                Detalles: <span style={{ color: '#58a6ff' }}>{catalogoSeleccionado.titulo}</span>
              </h2>
              <button 
                onClick={() => { setViendoDetalles(false); setRegistroActual(null); }} 
                style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', transition: 'background-color 0.2s' }}
                onMouseEnter={(e:any) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e:any) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ✕
              </button>
            </div>

            <div className="detail-content" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              
              <h3 style={{ color: '#D84315', marginBottom: '20px', borderBottom: '1px solid #30363d', paddingBottom: '10px', fontSize: '1.1rem' }}>
                Información General
              </h3>
              <div className="detail-grid-3" style={{ marginBottom: '32px' }}>
                {catalogoSeleccionado.fields.map((f: CatalogField) => (
                  <div key={f.name}>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: '#8b949e', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>
                      {f.label}
                    </span>
                    <span style={{ color: '#c9d1d9', fontWeight: '500', fontSize: '0.95rem' }}>
                      {getDisplayValue(registroActual, f)}
                    </span>
                  </div>
                ))}
              </div>

              {/* ✅ SUBDETALLES FORMATO TABLA ELEGANTE */}
              {catalogoSeleccionado.details && catalogoSeleccionado.details.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                  {catalogoSeleccionado.details.map((det: any) => {
                    const dataList = detailsData[det.collection] || [];
                    const tituloColeccion = getDetailTitle(det); 
                    
                    // Extraemos las llaves a renderizar (excluyendo la foreignKey)
                    const keysToRender = det.fields 
                      ? det.fields.filter((f: any) => f.name !== det.foreignKey)
                      : Object.keys(dataList[0] || {}).filter(k => k !== 'id' && k !== det.foreignKey).map(k => ({ name: k, label: k }));

                    return (
                      <div key={det.collection} style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #30363d', paddingBottom: '8px' }}>
                          <h3 style={{ color: '#D84315', fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span>{tituloColeccion}</span>
                            <span style={{ backgroundColor: '#161b22', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', color: '#8b949e', border: '1px solid #30363d' }}>
                              {dataList.length} Registros
                            </span>
                          </h3>
                          <button 
                            onClick={() => handleAgregarEditarSubdetalle(det.collection)}
                            style={{ backgroundColor: '#238636', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            + Agregar
                          </button>
                        </div>
                        
                        {dataList.length === 0 ? (
                          <div style={{ padding: '24px', backgroundColor: '#161b22', borderRadius: '8px', color: '#8b949e', textAlign: 'center', border: '1px dashed #30363d' }}>
                            No hay registros asociados en este momento.
                          </div>
                        ) : (
                          <div className="table-container" style={{ border: '1px solid #30363d', borderRadius: '8px', overflowX: 'auto', backgroundColor: '#161b22' }}>
                            <table className="sub-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                              <thead style={{ backgroundColor: '#1f2937' }}>
                                <tr>
                                  {keysToRender.map((subF: any) => (
                                    <th key={subF.name} style={{ color: '#8b949e', fontWeight: '600', borderBottom: '1px solid #30363d', textTransform: 'uppercase' }}>
                                      {subF.label || subF.name}
                                    </th>
                                  ))}
                                  <th style={{ color: '#8b949e', fontWeight: '600', borderBottom: '1px solid #30363d', textTransform: 'uppercase', textAlign: 'center', width: '140px' }}>
                                    Acciones
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {dataList.map((subItem: any) => (
                                  <tr key={subItem.id} style={{ borderBottom: '1px solid #21262d', transition: 'background-color 0.2s' }} onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = '#21262d'} onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    {keysToRender.map((subF: any) => (
                                      <td key={subF.name} style={{ color: '#c9d1d9' }}>
                                        {getDisplayValue(subItem, subF)}
                                      </td>
                                    ))}
                                    <td style={{ textAlign: 'center' }}>
                                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button 
                                          onClick={() => handleAgregarEditarSubdetalle(det.collection, subItem)}
                                          style={{ background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                          onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                                          onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                          Editar
                                        </button>
                                        <button 
                                          onClick={() => handleEliminarSubdetalle(det.collection, subItem.id)}
                                          style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                          onMouseEnter={(e: any) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                          onMouseLeave={(e: any) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-actions detail-actions" style={{ padding: '16px 24px', borderTop: '1px solid #30363d', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#161b22', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', flexShrink: 0 }}>
              <button onClick={() => { setViendoDetalles(false); setRegistroActual(null); }} className="btn btn-outline" style={{ padding: '8px 24px', borderRadius: '6px' }}>
                Cerrar Detalles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ SUB-MODAL DE EDICIÓN/CREACIÓN DE DETALLES (MOTOR DINÁMICO) */}
      {subModalEstado === 'abierto' && subColeccionActual && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', zIndex: 1600, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="form-card" style={{ maxWidth: '500px', width: '100%', borderRadius: '12px', border: '1px solid #444', backgroundColor: '#0d1117', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 15px 40px rgba(0,0,0,0.6)' }}>
            
            <div className="form-header" style={{ padding: '24px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '500', margin: 0, color: '#f0f6fc' }}>
                {subRegistroActual ? `Editar ${getDetailTitle(subColeccionActual)}` : `Agregar ${getDetailTitle(subColeccionActual)}`}
              </h2>
              <button type="button" onClick={() => { setSubModalEstado('cerrado'); setSubColeccionActual(null); setSubFormData({}); }} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <form onSubmit={guardarSubRegistro} style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                  {subColeccionActual.fields?.map((field: any) => {
                    // Ocultar la llave foránea en UI
                    if (field.name === subColeccionActual.foreignKey) return null;

                    const dOpt = field.dynamicOptions;
                    let valorInput = subFormData[field.name] !== undefined ? subFormData[field.name] : '';
                    
                    return (
                      <div key={field.name} className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ color: '#8b949e', fontSize: '0.85rem' }}>{field.label}</label>
                        {field.type === 'select' ? (
                          <select 
                            value={valorInput} 
                            onChange={e => setSubFormData({...subFormData, [field.name]: e.target.value})} 
                            className="form-control" 
                            required
                            style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }}
                          >
                            <option value="">Seleccione una opción</option>
                            {dOpt && opcionesDinamicas[dOpt.collection]
                              ? opcionesDinamicas[dOpt.collection].map((opt: any) => (
                                  <option key={opt[dOpt.valueField]} value={opt[dOpt.valueField]}>{opt[dOpt.labelField]}</option>
                                ))
                              : field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)
                            }
                          </select>
                        ) : (
                          <input 
                            type={field.type} 
                            step={field.type === 'number' || field.type === 'currency' ? 'any' : undefined}
                            value={valorInput} 
                            onChange={e => setSubFormData({...subFormData, [field.name]: e.target.value})} 
                            className="form-control" 
                            required 
                            style={{ backgroundColor: '#010409', border: '1px solid #30363d', color: '#c9d1d9' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'flex-end', borderTop: '1px solid #30363d', paddingTop: '24px' }}>
                  <button type="button" onClick={() => { setSubModalEstado('cerrado'); setSubColeccionActual(null); setSubFormData({}); }} style={{ backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
                  <button type="submit" style={{ backgroundColor: '#D84315', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FORMULARIO DE EDICIÓN/CREACIÓN PRINCIPAL */}
      {modalEstado === 'formulario' && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="form-card" style={{ maxWidth: isLongForm ? '800px' : '480px', width: '100%', borderRadius: '12px', border: '1px solid #444', backgroundColor: '#0d1117', transition: 'max-width 0.3s ease', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="form-header" style={{ padding: '24px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '500', margin: 0, color: '#f0f6fc' }}>
                {registroActual ? 'Editar Registro' : 'Nuevo Registro'}
              </h2>
              <button className="close-x" onClick={() => { setModalEstado('cerrado'); setRegistroActual(null); }} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <form onSubmit={guardarRegistro} style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isLongForm ? '1fr 1fr' : '1fr', gap: '20px', paddingRight: '8px' }}>
                  {catalogoSeleccionado.fields.map((field: CatalogField) => {
                    const esRequerido = field.required || false; 
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
                              ? opcionesDinamicas[dOpt.collection]
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
                            step={field.type === 'number' || field.type === 'currency' ? 'any' : undefined}
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
                  <button type="button" onClick={() => { setModalEstado('cerrado'); setRegistroActual(null); }} style={{ backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
                  <button type="submit" style={{ backgroundColor: '#D84315', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogosDashboard;