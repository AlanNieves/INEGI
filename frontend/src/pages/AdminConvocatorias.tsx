import { useState, useEffect } from 'react';
import { plazasApi } from '../features/convocatorias/api';
import type { PlazaData, Convocatoria, Concurso } from '../features/convocatorias/api';
import FormConvocatoria from '../features/convocatorias/FormConvocatoria.tsx';
import TableConvocatorias from '../features/convocatorias/TableConvocatorias.tsx';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal.tsx';

export type { PlazaData };

export default function AdminConvocatorias() {
  const [convocatorias, setConvocatorias] = useState<PlazaData[]>([]);
  const [catalogoConvocatorias, setCatalogoConvocatorias] = useState<Convocatoria[]>([]);
  const [catalogoConcursos, setCatalogoConcursos] = useState<Concurso[]>([]);
  const [selectedConvocatoria, setSelectedConvocatoria] = useState<string>('');
  const [selectedConcurso, setSelectedConcurso] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingConvocatoria, setEditingConvocatoria] = useState<PlazaData | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({ 
    isOpen: false, 
    id: '', 
    name: '' 
  });

  // Cargar catálogos al inicio
  useEffect(() => {
    loadCatalogos();
  }, []);

  // Cargar plazas cuando se seleccionen ambos filtros
  useEffect(() => {
    if (selectedConvocatoria && selectedConcurso) {
      loadConvocatorias();
    } else {
      setConvocatorias([]);
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
      // Hacer petición directa al endpoint de concursos con filtro
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

  const loadConvocatorias = async () => {
    if (!selectedConvocatoria || !selectedConcurso) return;
    
    try {
      setLoading(true);
      
      // Llamar a la API con filtros de convocatoria y concurso
      const response = await fetch(
        `/api/plazas?convocatoriaId=${selectedConvocatoria}&concursoId=${selectedConcurso}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      
      const data = await response.json();
      setConvocatorias(data);
      setError(null);
    } catch (err: any) {
      const errorMsg = err.message || 'Error al cargar las plazas';
      setError(errorMsg);
      console.error('Error completo:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingConvocatoria(null);
    setShowForm(true);
  };

  const handleEdit = (convocatoria: PlazaData) => {
    setEditingConvocatoria(convocatoria);
    setShowForm(true);
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    try {
      await plazasApi.delete(deleteModal.id);
      setDeleteModal({ isOpen: false, id: '', name: '' });
      await loadConvocatorias();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al eliminar el registro';
      alert(message);
      console.error(err);
    }
  };

  const handleFormSubmit = async (data: PlazaData) => {
    try {
      if (editingConvocatoria?._id) {
        await plazasApi.update(editingConvocatoria._id, data);
      } else {
        await plazasApi.create(data);
      }
      setShowForm(false);
      setEditingConvocatoria(null);
      await loadConvocatorias();
    } catch (err: any) {
      console.error('Error en handleFormSubmit:', err);
      console.error('Error response:', err.response?.data);
      // Re-lanzar el error para que lo maneje el formulario
      throw err;
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingConvocatoria(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Administración de Plazas
        </h1>
        <p className="text-blue-200">
          Gestione plazas por convocatoria y concurso
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
                + Nueva Plaza
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
              <TableConvocatorias
                data={convocatorias}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )
          )}

          {/* Mensaje cuando no se han seleccionado filtros */}
          {(!selectedConvocatoria || !selectedConcurso) && (
            <div className="glass-panel p-8 text-center">
              <p className="text-blue-200">
                Seleccione una convocatoria y un concurso para ver las plazas
              </p>
            </div>
          )}
        </div>
      ) : (
        <FormConvocatoria
          initialData={editingConvocatoria}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        title="Confirmar eliminación"
        message="Esta acción no se puede deshacer. La plaza será eliminada permanentemente."
        itemName={deleteModal.name}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', name: '' })}
      />
    </div>
  );
}
