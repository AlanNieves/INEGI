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

export default function ConvocatoriasPage() {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Convocatoria | null>(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', name: '' });
  const [formData, setFormData] = useState({ nombre: '' });
  const [error, setError] = useState<string | null>(null);

  /** ░░░ Cargar datos iniciales ░░░ */
  useEffect(() => {
    loadConvocatorias();
  }, []);

  const loadConvocatorias = async () => {
    try {
      setLoading(true);
      const response = await api.get('/convocatorias');
      setConvocatorias(response.data);
    } catch (err) {
      setError('Error al cargar convocatorias');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /** ░░░ Crear ░░░ */
  const handleCreate = () => {
    setEditingItem(null);
    setFormData({ nombre: '' });
    setShowForm(true);
  };

  /** ░░░ Editar ░░░ */
  const handleEdit = (item: Convocatoria) => {
    setEditingItem(item);
    setFormData({ nombre: item.nombre || '' });
    setShowForm(true);
  };

  /** ░░░ Eliminar ░░░ */
  const handleDelete = (item: Convocatoria) => {
    setDeleteModal({
      isOpen: true,
      id: item._id,
      name: item.nombre || item._id,
    });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/convocatorias/${deleteModal.id}`, {
        data: { confirmacion: 'DELETE' },
      });
      setDeleteModal({ isOpen: false, id: '', name: '' });
      await loadConvocatorias();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar');
      console.error(err);
    }
  };

  /** ░░░ Guardar (crear o editar) ░░░ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/convocatorias/${editingItem._id}`, formData);
      } else {
        await api.post('/convocatorias', formData);
      }
      setShowForm(false);
      await loadConvocatorias();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar');
    }
  };

  /** ░░░ Columnas centradas ░░░ */
  const columns = [
    { 
      key: 'nombre', 
      title: 'Nombre', 
      width: '100%', 
      headerClass: 'text-center', 
      className: 'text-center'
    },
  ];

  /** ░░░ FORMULARIO ░░░ */
  if (showForm) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          {editingItem ? 'Editar Convocatoria' : 'Nueva Convocatoria'}
        </h1>

        {error && (
          <div className="glass-panel border-red-400 text-red-200 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <div className="glass-panel p-8 rounded-2xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900/40 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Ej: 005/2025"
                required
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-600 rounded-lg text-blue-200 hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn-glass px-6 py-2 rounded-lg transition-colors"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /** ░░░ VISTA PRINCIPAL ░░░ */
  return (
    <div className="w-full min-h-screen flex justify-center items-start py-16">

      <div className="w-full max-w-3xl px-4">

        {/* Encabezado */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-1 tracking-wide">
            Convocatorias
          </h1>
          <p className="text-blue-200 text-sm opacity-90">
            Gestión del catálogo de convocatorias
          </p>
        </div>

        {/* Botón */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleCreate}
            className="btn-glass font-semibold py-2.5 px-6 shadow-md rounded-lg"
          >
            + Nueva Convocatoria
          </button>
        </div>

        {/* Tabla centrada con ancho compacto */}
        <div className="w-full flex justify-center">
          <div className="glass-panel w-full max-w-2xl p-4 rounded-2xl shadow-xl">
            <EntityTable
              data={convocatorias}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              loading={loading}
              emptyMessage="No hay convocatorias registradas"
            />
          </div>
        </div>

        {/* Modal */}
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          title="Confirmar eliminación"
          message="Esta acción eliminará la convocatoria y todos sus concursos asociados."
          itemName={deleteModal.name}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteModal({ isOpen: false, id: '', name: '' })}
        />

      </div>
    </div>
  );
}
