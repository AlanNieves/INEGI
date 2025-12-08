import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { plazasApi } from './api';
import type { PlazaData, Convocatoria, Concurso, Especialista } from './api';
import SearchableSelect from '../../components/SearchableSelect';

interface FormConvocatoriaProps {
  initialData: PlazaData | null;
  onSubmit: (data: PlazaData) => Promise<void>;
  onCancel: () => void;
}

export default function FormConvocatoria({ initialData, onSubmit, onCancel }: FormConvocatoriaProps) {
  const [formData, setFormData] = useState<PlazaData>({
    convocatoria: '',
    concurso_id: '',
    concurso: 0,
    codigo: '',
    puesto: '',
    unidad_adm: '',
    radicacion: '',
    especialista_id: '',
  });

  const [catalogos, setCatalogos] = useState<{
    convocatorias: Convocatoria[];
    concursos: Concurso[];
    especialistas: Especialista[];
  }>({
    convocatorias: [],
    concursos: [],
    especialistas: [],
  });

  const [selectedConvocatoriaId, setSelectedConvocatoriaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCatalogos();
    if (initialData) {
      setFormData(initialData);
      if (initialData.convocatoria) {
        loadConcursos(initialData.convocatoria);
        setSelectedConvocatoriaId(initialData.convocatoria);
      }
    }
  }, [initialData]);

  // Cargar concursos cuando cambie la convocatoria seleccionada (con debounce)
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
        especialistas: data.especialistas,
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
    // Usar setTimeout para evitar bloquear el UI thread
    requestAnimationFrame(() => {
      setFormData(prev => ({ ...prev, [name]: value }));
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    console.log('Datos del formulario:', formData);
    
    // Validaciones
    if (!formData.convocatoria || !formData.concurso_id) {
      setError('Debe seleccionar convocatoria y concurso');
      return;
    }

    if (!formData.concurso || formData.concurso === 0) {
      setError('El número de concurso es requerido');
      return;
    }

    if (!formData.codigo || !formData.puesto || !formData.unidad_adm) {
      setError('Complete todos los campos obligatorios');
      return;
    }

    if (!formData.especialista_id) {
      setError('Debe seleccionar un especialista');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      console.log('Enviando datos:', formData);
      await onSubmit(formData);
      console.log('Plaza guardada exitosamente');
      // Plaza guardada exitosamente
    } catch (err: any) {
      console.error('Error al guardar plaza:', err);
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
        {initialData ? 'Editar Plaza' : 'Nueva Plaza'}
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
                setFormData(prev => ({ 
                  ...prev, 
                  convocatoria: convId,
                  concurso_id: '',
                  concurso: 0
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
              value={formData.concurso_id}
              onChange={(e) => {
                const concId = e.target.value;
                const conc = catalogos.concursos.find(c => c._id === concId);
                console.log('Concurso seleccionado:', conc);
                setFormData(prev => ({
                  ...prev,
                  concurso_id: concId,
                  concurso: conc?.nombre || 0
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
            {formData.concurso_id && (
              <p className="text-xs text-gray-400 mt-1">
                Número de concurso: {formData.concurso || 'No asignado'}
              </p>
            )}
          </div>

          {/* Código de Plaza */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Código de Plaza *
            </label>
            <input
              type="text"
              name="codigo"
              value={formData.codigo}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: PLZ-001"
              required
            />
          </div>

          {/* Puesto */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Puesto *
            </label>
            <input
              type="text"
              name="puesto"
              value={formData.puesto}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Médico General"
              required
            />
          </div>

          {/* Unidad Administrativa */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Unidad Administrativa *
            </label>
            <input
              type="text"
              name="unidad_adm"
              value={formData.unidad_adm}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Dirección General"
              required
            />
          </div>

          {/* Radicación */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Radicación
            </label>
            <input
              type="text"
              name="radicacion"
              value={formData.radicacion || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Ciudad de México"
            />
          </div>

          {/* Especialista */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Especialista Asignado *
            </label>
            <SearchableSelect
              options={catalogos.especialistas.map(esp => ({
                value: esp._id,
                label: esp.nombre,
                subtitle: esp.puesto
              }))}
              value={formData.especialista_id}
              onChange={(value) => setFormData(prev => ({ ...prev, especialista_id: value }))}
              placeholder="Buscar especialista por nombre o puesto..."
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
