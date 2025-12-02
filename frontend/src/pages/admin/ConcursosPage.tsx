import { useState, useEffect } from 'react';
import axios from 'axios';
import EntityTable from '../../components/EntityTable';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

interface Convocatoria {
  _id: string;
  nombre: string;
}

interface Concurso {
  _id: string;
  concurso_id: string;
  convocatoria_id: string;
  convocatoria: string;
  nombre: number;
}

export default function ConcursosPage() {
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [selectedConvocatoria, setSelectedConvocatoria] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Concurso | null>(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', name: '' });
  const [formData, setFormData] = useState({ nombre: '', concurso_id: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConvocatorias();
  }, []);

  useEffect(() => {
    if (selectedConvocatoria) {
      loadConcursos();
    } else {
      setConcursos([]);
    }
  }, [selectedConvocatoria]);

  const loadConvocatorias = async () => {
    try {
      setLoadingCatalogo(true);
      const response = await api.get('/catalog/convocatorias');
      setConvocatorias(response.data);
    } catch (err) {
      console.error('Error al cargar convocatorias:', err);
    } finally {
      setLoadingCatalogo(false);
    }
  };

  const loadConcursos = async () => {
    if (!selectedConvocatoria) return;
    try {
      setLoading(true);
      const response = await api.get(`/concursos?convocatoriaId=${selectedConvocatoria}`);
      setConcursos(response.data);
    } catch (err) {
      setError('Error al cargar concursos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (!selectedConvocatoria) {
      alert('Seleccione una convocatoria primero');
      return;
    }
    setEditingItem(null);
    setFormData({ nombre: '', concurso_id: '' });
    setShowForm(true);
  };

  const handleEdit = (item: Concurso) => {
    setEditingItem(item);
    setFormData({
      nombre: String(item.nombre || ''),
      concurso_id: item.concurso_id || '',
    });
    setShowForm(true);
  };

  const handleDelete = (item: Concurso) => {
    setDeleteModal({
      isOpen: true,
      id: item._id,
      name: String(item.nombre) || item._id,
    });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/concursos/${deleteModal.id}`, {
        data: { confirmacion: 'DELETE' },
      });
      setDeleteModal({ isOpen: false, id: '', name: '' });
      await loadConcursos();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar');
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const convocatoriaObj = convocatorias.find(c => c._id === selectedConvocatoria);
      const data = { 
        nombre: Number(formData.nombre),
        concurso_id: formData.concurso_id || '',
        convocatoria_id: selectedConvocatoria,
        convocatoria: convocatoriaObj?.nombre || '',
      };
      console.log('Enviando datos:', data);
      
      let response;
      if (editingItem) {
        console.log(`PUT /api/concursos/${editingItem._id}`);
        response = await api.put(`/concursos/${editingItem._id}`, data);
      } else {
        console.log('POST /api/concursos');
        response = await api.post('/concursos', data);
      }
      console.log('Respuesta del servidor:', response.data);
      
      setShowForm(false);
      await loadConcursos();
    } catch (err: any) {
      console.error('Error completo:', err);
      console.error('Response data:', err.response?.data);
      console.error('Response status:', err.response?.status);
      const errorMsg = err.response?.data?.message || err.message || 'Error al guardar';
      setError(errorMsg);
      alert(errorMsg);
    }
  };

  const columns = [
    {
      key: 'nombre',
      title: 'Nombre (Número)',
      width: '100%',
    },
  ];

  if (showForm) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">
          {editingItem ? 'Editar Concurso' : 'Nuevo Concurso'}
        </h1>

        {error && (
          <div className="glass-panel border-red-400 text-red-200 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <div className="glass-panel p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Convocatoria
                </label>
                <input
                  type="text"
                  value={convocatorias.find((c) => c._id === selectedConvocatoria)?.nombre || ''}
                  disabled
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-400 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Nombre (Número) *
                </label>
                <input
                  type="number"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 105004"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-600 rounded-md text-blue-200 hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-glass px-6 py-2 transition-colors"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Concursos</h1>
        <p className="text-blue-200">Gestión de concursos por convocatoria</p>
      </div>

      {error && (
        <div className="glass-panel border-red-400 text-red-200 px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {/* Filtro de Convocatoria */}
      <div className="glass-panel p-6 mb-6">
        <label className="block text-sm font-medium text-blue-200 mb-2">
          Convocatoria *
        </label>
        <select
          value={selectedConvocatoria}
          onChange={(e) => setSelectedConvocatoria(e.target.value)}
          disabled={loadingCatalogo}
          className="w-full md:w-1/2 px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-700"
        >
          <option value="">Seleccione una convocatoria</option>
          {convocatorias.map((conv) => (
            <option key={conv._id} value={conv._id}>
              {conv.nombre || conv._id}
            </option>
          ))}
        </select>
      </div>

      {selectedConvocatoria && (
        <>
          <div className="mb-4">
            <button
              onClick={handleCreate}
              className="btn-glass font-semibold py-2 px-6 shadow-md transition-colors"
            >
              + Nuevo Concurso
            </button>
          </div>

          <EntityTable
            data={concursos}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
            emptyMessage="No hay concursos registrados para esta convocatoria"
          />
        </>
      )}

      {!selectedConvocatoria && !loadingCatalogo && (
        <div className="glass-panel p-8 text-center">
          <p className="text-blue-200">Seleccione una convocatoria para ver sus concursos</p>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        title="Confirmar eliminación"
        message="Esta acción eliminará el concurso y todas sus plazas asociadas."
        itemName={deleteModal.name}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', name: '' })}
      />
    </div>
  );
}
