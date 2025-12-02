import { useState, useEffect } from 'react';
import axios from 'axios';
import EntityTable from '../../components/EntityTable';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

interface Especialista {
  _id: string;
  nombre: string;
  correo?: string;
  puesto?: string;
}

export default function EspecialistasPage() {
  const [especialistas, setEspecialistas] = useState<Especialista[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Especialista | null>(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', name: '' });
  const [formData, setFormData] = useState({ nombre: '', correo: '', puesto: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEspecialistas();
  }, []);

  const loadEspecialistas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/especialistas');
      setEspecialistas(response.data);
    } catch (err) {
      setError('Error al cargar especialistas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({ nombre: '', correo: '', puesto: '' });
    setShowForm(true);
  };

  const handleEdit = (item: Especialista) => {
    setEditingItem(item);
    setFormData({
      nombre: item.nombre || '',
      correo: item.correo || '',
      puesto: item.puesto || '',
    });
    setShowForm(true);
  };

  const handleDelete = (item: Especialista) => {
    setDeleteModal({
      isOpen: true,
      id: item._id,
      name: item.nombre,
    });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/especialistas/${deleteModal.id}`, {
        data: { confirmacion: 'DELETE' },
      });
      setDeleteModal({ isOpen: false, id: '', name: '' });
      await loadEspecialistas();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar');
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/especialistas/${editingItem._id}`, formData);
      } else {
        await api.post('/especialistas', formData);
      }
      setShowForm(false);
      await loadEspecialistas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar');
    }
  };

  const columns = [
    {
      key: 'nombre',
      title: 'Nombre',
      width: '40%',
    },
    {
      key: 'correo',
      title: 'Correo',
      width: '30%',
    },
    {
      key: 'puesto',
      title: 'Puesto',
      width: '30%',
    },
  ];

  if (showForm) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">
          {editingItem ? 'Editar Especialista' : 'Nuevo Especialista'}
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
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Correo
                </label>
                <input
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Puesto
                </label>
                <input
                  type="text"
                  value={formData.puesto}
                  onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <h1 className="text-3xl font-bold text-white mb-2">Especialistas</h1>
        <p className="text-blue-200">Gestión de personal especializado</p>
      </div>

      {error && (
        <div className="glass-panel border-red-400 text-red-200 px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={handleCreate}
          className="btn-glass font-semibold py-2 px-6 shadow-md transition-colors"
        >
          + Nuevo Especialista
        </button>
      </div>

      <EntityTable
        data={especialistas}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
        emptyMessage="No hay especialistas registrados"
      />

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        title="Confirmar eliminación"
        message="Esta acción eliminará el especialista. No se podrá eliminar si tiene plazas asignadas."
        itemName={deleteModal.name}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', name: '' })}
      />
    </div>
  );
}
