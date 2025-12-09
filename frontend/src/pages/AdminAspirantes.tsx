import { useState, useEffect } from 'react';
import { aspirantesApi } from '../features/aspirantes/api';
import type { AspiranteData } from '../features/aspirantes/api';
import type { Convocatoria, Concurso } from '../features/convocatorias/api';
import { plazasApi } from '../features/convocatorias/api';
import FormAspirante from '../features/aspirantes/FormAspirante';
import TableAspirantes from '../features/aspirantes/TableAspirantes';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

export default function AdminAspirantes() {
  const [aspirantes, setAspirantes] = useState<AspiranteData[]>([]);
  const [catalogoConvocatorias, setCatalogoConvocatorias] = useState<Convocatoria[]>([]);
  const [catalogoConcursos, setCatalogoConcursos] = useState<Concurso[]>([]);
  const [selectedConvocatoria, setSelectedConvocatoria] = useState<string>('');
  const [selectedConcurso, setSelectedConcurso] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAspirante, setEditingAspirante] = useState<AspiranteData | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({ 
    isOpen: false, 
    id: '', 
    name: '' 
  });

  // Cargar catálogos al inicio
  useEffect(() => {
    loadCatalogos();
  }, []);

  // Cargar aspirantes cuando se seleccionen ambos filtros
  useEffect(() => {
    if (selectedConvocatoria && selectedConcurso) {
      loadAspirantes();
    } else {
      setAspirantes([]);
    }
  }, [selectedConvocatoria, selectedConcurso]);

  // Cargar concursos cuando cambie la convocatoria
  useEffect(() => {
    if (selectedConvocatoria) {
      loadConcursos(selectedConvocatoria);
      setSelectedConcurso('');
    } else {
      setCatalogoConcursos([]);
      setSelectedConcurso('');
    }
  }, [selectedConvocatoria]);

  const loadCatalogos = async () => {
    try {
      setLoadingCatalogos(true);
      const data = await plazasApi.getCatalogos();
      setCatalogoConvocatorias(data.convocatorias);
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
    } finally {
      setLoadingCatalogos(false);
    }
  };

  const loadConcursos = async (convocatoriaId: string) => {
    try {
      const response = await fetch(
        `/api/catalog/concursos?convocatoriaId=${convocatoriaId}`,
        { credentials: 'include' }
      );
      const concursos = await response.json();
      setCatalogoConcursos(concursos);
    } catch (err) {
      console.error('Error al cargar concursos:', err);
      setCatalogoConcursos([]);
    }
  };

  const loadAspirantes = async () => {
    if (!selectedConvocatoria || !selectedConcurso) return;
    
    try {
      setLoading(true);
      const data = await aspirantesApi.getByPlaza(selectedConvocatoria, selectedConcurso);
      setAspirantes(data.aspirantes as any);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar los aspirantes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAspirante(null);
    setShowForm(true);
  };

  const handleEdit = (aspirante: AspiranteData) => {
    setEditingAspirante(aspirante);
    setShowForm(true);
  };

  const handleDelete = (id: string, folio: string) => {
    setDeleteModal({ isOpen: true, id, name: folio });
  };

  const confirmDelete = async () => {
    try {
      await aspirantesApi.delete(deleteModal.id);
      setDeleteModal({ isOpen: false, id: '', name: '' });
      await loadAspirantes();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al eliminar el aspirante';
      alert(message);
      console.error(err);
    }
  };

  const handleFormSubmit = async (data: AspiranteData) => {
    try {
      if (editingAspirante?._id) {
        await aspirantesApi.update(editingAspirante._id, data);
      } else {
        await aspirantesApi.create(data);
      }
      setShowForm(false);
      setEditingAspirante(null);
      await loadAspirantes();
    } catch (err: any) {
      console.error('Error en handleFormSubmit:', err);
      throw err;
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingAspirante(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Administración de Aspirantes
        </h1>
        <p className="text-blue-200">
          Gestione folios de aspirantes por convocatoria y concurso
        </p>
      </div>

      {error && (
        <div className="glass-panel border-red-400 text-red-200 px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {!showForm ? (
        <div>
          {/* Filtros */}
          <div className="glass-panel p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-200 mb-4">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Selector de Convocatoria */}
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Convocatoria
                </label>
                <select
                  value={selectedConvocatoria}
                  onChange={(e) => setSelectedConvocatoria(e.target.value)}
                  disabled={loadingCatalogos}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                  <option value="">Seleccione una convocatoria</option>
                  {catalogoConvocatorias.map((conv) => (
                    <option key={conv._id} value={conv._id}>
                      {conv.codigo || conv.nombre || conv._id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Concurso */}
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Concurso
                </label>
                <select
                  value={selectedConcurso}
                  onChange={(e) => setSelectedConcurso(e.target.value)}
                  disabled={!selectedConvocatoria || loadingCatalogos}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                  <option value="">Seleccione un concurso</option>
                  {catalogoConcursos.map((conc) => (
                    <option key={conc._id} value={conc._id}>
                      {conc.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Botón de crear solo visible cuando se han seleccionado los filtros */}
          {selectedConvocatoria && selectedConcurso && (
            <div className="mb-4">
              <button
                onClick={handleCreate}
                className="btn-glass font-semibold py-2 px-6 shadow-md transition-colors"
              >
                + Nuevo Aspirante
              </button>
            </div>
          )}

          {/* Tabla solo visible cuando se han seleccionado ambos filtros */}
          {selectedConvocatoria && selectedConcurso && (
            loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Cargando...</p>
              </div>
            ) : (
              <TableAspirantes
                data={aspirantes}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )
          )}

          {/* Mensaje cuando no se han seleccionado filtros */}
          {(!selectedConvocatoria || !selectedConcurso) && (
            <div className="glass-panel p-8 text-center">
              <p className="text-blue-200">
                Seleccione una convocatoria y un concurso para ver los aspirantes
              </p>
            </div>
          )}
        </div>
      ) : (
        <FormAspirante
          initialData={editingAspirante}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        title="Confirmar eliminación"
        message="Esta acción no se puede deshacer. El aspirante será eliminado permanentemente."
        itemName={deleteModal.name}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', name: '' })}
      />
    </div>
  );
}
