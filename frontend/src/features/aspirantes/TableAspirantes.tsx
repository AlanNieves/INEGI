import type { AspiranteData } from './api';

interface TableAspirantesProps {
  data: AspiranteData[];
  onEdit: (aspirante: AspiranteData) => void;
  onDelete: (id: string, folio: string) => void;
}

export default function TableAspirantes({ data, onEdit, onDelete }: TableAspirantesProps) {
  const aspirantes = Array.isArray(data) ? data : [];

  if (aspirantes.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-blue-200">No hay aspirantes registrados</p>
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                Folio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                Nombre del Aspirante
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-blue-200 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {aspirantes.map((aspirante) => (
              <tr key={aspirante._id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                  {aspirante.folio}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-100">
                  {aspirante.aspiranteName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onEdit(aspirante)}
                    className="text-blue-400 hover:text-blue-300 mr-4 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(aspirante._id!, aspirante.folio)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-800/30 px-6 py-3 border-t border-gray-700">
        <p className="text-sm text-blue-200">
          Total de aspirantes: <span className="font-semibold">{aspirantes.length}</span>
        </p>
      </div>
    </div>
  );
}
