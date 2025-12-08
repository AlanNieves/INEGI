import { useState } from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({
  isOpen,
  title,
  message,
  itemName,
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirmText !== 'DELETE') {
      setError('Debe escribir DELETE exactamente como se muestra');
      return;
    }
    setConfirmText('');
    setError('');
    onConfirm();
  };

  const handleCancel = () => {
    setConfirmText('');
    setError('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4">{message}</p>
          
          {itemName && (
            <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 mb-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Elemento a eliminar:</span> {itemName}
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Para confirmar, escriba <span className="font-mono font-bold text-red-600">DELETE</span>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Escriba DELETE"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
              disabled={!confirmText}
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
