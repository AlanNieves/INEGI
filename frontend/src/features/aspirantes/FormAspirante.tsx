import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { AspiranteData } from './api';
import type { Convocatoria, Concurso } from '../convocatorias/api';
import { plazasApi } from '../convocatorias/api';

interface FormAspiranteProps {
  initialData: AspiranteData | null;
  onSubmit: (data: AspiranteData) => Promise<void>;
  onCancel: () => void;
}

export default function FormAspirante({ initialData, onSubmit, onCancel }: FormAspiranteProps) {
  const [formData, setFormData] = useState<AspiranteData>({
    convocatoriaId: '',
    concursoId: '',
    plazaId: '',
    folio: '',
    aspiranteName: '',
    convocatoriaName: '',
    concursoName: '',
  });

  const [catalogos, setCatalogos] = useState<{
    convocatorias: Convocatoria[];
    concursos: Concurso[];
  }>({
    convocatorias: [],
    concursos: [],
  });

  const [selectedConvocatoriaId, setSelectedConvocatoriaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCatalogos();
    if (initialData) {
      setFormData(initialData);
      if (initialData.convocatoriaId) {
        setSelectedConvocatoriaId(initialData.convocatoriaId);
        loadConcursos(initialData.convocatoriaId);
      }
    }
  }, [initialData]);

  // Cargar concursos cuando cambie la convocatoria seleccionada
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedConvocatoriaId) {
        loadConcursos(selectedConvocatoriaId);
      } else {
        setCatalogos(prev => ({ ...prev, concursos: [] }));
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedConvocatoriaId]);

  const loadCatalogos = async () => {
    try {
      setLoading(true);
      const data = await plazasApi.getCatalogos();
      
      setCatalogos({
        convocatorias: data.convocatorias,
        concursos: [],
      });
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
      setError('Error al cargar los catálogos');
    } finally {
      setLoading(false);
    }
  };

  const loadConcursos = async (convocatoriaId: string) => {
    try {
      const response = await fetch(
        `/api/catalog/concursos?convocatoriaId=${convocatoriaId}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const concursos = await response.json();
      setCatalogos(prev => ({ ...prev, concursos }));
    } catch (err) {
      console.error('Error al cargar concursos:', err);
      setCatalogos(prev => ({ ...prev, concursos: [] }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    requestAnimationFrame(() => {
      setFormData(prev => ({ ...prev, [name]: value }));
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.convocatoriaId || !formData.concursoId) {
      setError('Debe seleccionar convocatoria y concurso');
      return;
    }

    if (!formData.folio || !formData.folio.trim()) {
      setError('El folio es requerido');
      return;
    }

    if (!formData.aspiranteName || !formData.aspiranteName.trim()) {
      setError('El nombre del aspirante es requerido');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (err: any) {
      console.error('Error al guardar aspirante:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error al guardar';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Cargando formulario...</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      <h2 className="text-2xl font-bold text-white mb-6">
        {initialData ? 'Editar Aspirante' : 'Nuevo Aspirante'}
      </h2>

      {error && (
        <div className="glass-panel border-red-400 text-red-200 px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Convocatoria */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Convocatoria *
            </label>
            <select
              value={selectedConvocatoriaId}
              onChange={(e) => {
                const convId = e.target.value;
                setSelectedConvocatoriaId(convId);
                const conv = catalogos.convocatorias.find(c => c._id === convId);
                setFormData(prev => ({ 
                  ...prev, 
                  convocatoriaId: convId,
                  convocatoriaName: conv?.nombre || conv?._id || '',
                  concursoId: '',
                  concursoName: ''
                }));
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={!!initialData}
            >
              <option value="">Seleccione...</option>
              {catalogos.convocatorias.map((conv) => (
                <option key={conv._id} value={conv._id}>
                  {conv.nombre || conv._id}
                </option>
              ))}
            </select>
          </div>

          {/* Concurso */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Concurso *
            </label>
            <select
              value={formData.concursoId}
              onChange={(e) => {
                const concId = e.target.value;
                const conc = catalogos.concursos.find(c => c._id === concId);
                setFormData(prev => ({
                  ...prev,
                  concursoId: concId,
                  concursoName: conc?.nombre?.toString() || ''
                }));
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-700"
              required
              disabled={!selectedConvocatoriaId || !!initialData}
            >
              <option value="">Seleccione...</option>
              {catalogos.concursos.map((conc) => (
                <option key={conc._id} value={conc._id}>
                  {conc.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Folio */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Folio *
            </label>
            <input
              type="text"
              name="folio"
              value={formData.folio}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: ASP-001"
              required
            />
          </div>

          {/* Nombre del Aspirante */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Nombre del Aspirante *
            </label>
            <input
              type="text"
              name="aspiranteName"
              value={formData.aspiranteName}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Juan Pérez García"
              required
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-600 rounded-md text-blue-200 hover:bg-gray-800 transition-colors"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-glass px-6 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
