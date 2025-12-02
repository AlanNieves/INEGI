import React from 'react';

interface Column<T> {
  key: string;
  title: string;
  render?: (value: any, record: T) => React.ReactNode;
  width?: string;
}

interface EntityTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => void;
  idField?: keyof T;
  emptyMessage?: string;
  loading?: boolean;
}

export default function EntityTable<T extends Record<string, any>>({
  data,
  columns,
  onEdit,
  onDelete,
  idField = '_id' as keyof T,
  emptyMessage = 'No hay registros',
  loading = false,
}: EntityTableProps<T>) {
  if (loading) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        <p className="mt-4 text-blue-200">Cargando...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-blue-200 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800 bg-opacity-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider"
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {data.map((record, index) => (
              <tr key={record[idField] || index} className="hover:bg-gray-800 hover:bg-opacity-30 transition-colors">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 text-sm text-blue-100">
                    {column.render
                      ? column.render(record[column.key], record)
                      : record[column.key] || '-'}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(record)}
                          className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                        >
                          Editar
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(record)}
                          className="text-red-400 hover:text-red-300 font-semibold transition-colors"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-800 bg-opacity-30 px-6 py-3 border-t border-gray-700">
        <p className="text-sm text-blue-200">
          Total de registros: <span className="font-semibold">{data.length}</span>
        </p>
      </div>
    </div>
  );
}
