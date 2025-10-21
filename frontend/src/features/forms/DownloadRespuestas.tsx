import { useState } from 'react';
import { api } from '../../lib/api';
import { useFolios } from '../../contexts/FoliosContext';
import { downloadZip } from '../../utils/downloadHelpers';

interface DownloadRespuestasProps {
  /** Casos pasados desde FormPage (modo batch). Solo funciona en modo batch */
  casos?: any[];
}

export default function DownloadRespuestas({ casos }: DownloadRespuestasProps = {}) {
  const { selectedFolios } = useFolios();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo funciona en modo batch
  const isBatchMode = selectedFolios.length > 0 && !!casos;

  const handleDownload = async () => {
    if (!isBatchMode) return;

    setLoading(true);
    setError(null);

    try {
      const blob = await api.generarRespuestasLote({ casos, folios: selectedFolios });
      const timestamp = Date.now();
      await downloadZip(blob, `RESPUESTAS_lote_${timestamp}.zip`);
    } catch (err: any) {
      console.error('Error descargando Respuestas en lote:', err);
      setError(err?.message || 'Error al generar el lote de Respuestas');
    } finally {
      setLoading(false);
    }
  };

  // Solo se muestra en modo batch
  if (!isBatchMode) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Generando Respuestas...' : `📋 Descargar Respuestas en lote (${selectedFolios.length} folios)`}
      </button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
