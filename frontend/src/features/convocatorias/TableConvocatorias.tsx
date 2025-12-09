import type { PlazaData } from './api';

interface TableConvocatoriasProps {
  data: PlazaData[];
  onEdit: (convocatoria: PlazaData) => void;
  onDelete: (id: string, name: string) => void;
}

export default function TableConvocatorias({ data, onEdit, onDelete }: TableConvocatoriasProps) {
  // Asegurarse de que data es un array
  const plazas = Array.isArray(data) ? data : [];
  
  if (plazas.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-blue-200 text-lg">No hay plazas registradas</p>
        <p className="text-gray-400 text-sm mt-2">Haga clic en "Nueva Plaza" para crear una</p>
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800 bg-opacity-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                Código Plaza
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                Puesto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                Unidad Administrativa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                Radicación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                Especialista
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-blue-200 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {plazas.map((item) => (
              <tr key={item._id} className="hover:bg-gray-800 hover:bg-opacity-30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {item.codigo}
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  <div className="max-w-xs truncate" title={item.puesto}>
                    {item.puesto}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  <div className="max-w-xs truncate" title={item.unidad_adm}>
                    {item.unidad_adm}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  <div className="max-w-xs truncate" title={item.radicacion}>
                    {item.radicacion || '—'}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  <div className="max-w-xs truncate" title={item.especialista?.nombre}>
                    {item.especialista?.nombre || '—'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(item)}
                      className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                      title="Editar"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => item._id && onDelete(item._id, item.codigo || item.puesto)}
                      className="text-red-400 hover:text-red-300 font-semibold transition-colors"
                      title="Eliminar"
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
      
      <div className="bg-gray-800 bg-opacity-30 px-6 py-3 border-t border-gray-700">
        <p className="text-sm text-blue-200">
          Total de registros: <span className="font-semibold">{plazas.length}</span>
        </p>
      </div>
    </div>
  );
}
