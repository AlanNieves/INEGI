import { useMemo, useState } from "react";
import { useFolios } from "../../contexts/FoliosContext";
import { downloadZip } from "../../utils/downloadHelpers";
import { api } from "../../lib/api";

/** Estructuras mínimas que esperamos desde el form de Casos */
type Encabezado = {
  convocatoria: string;
  unidadAdministrativa: string;
  concurso: string;
  puesto: string;
  codigoPuesto: string;
  modalidad: string;
  duracionMin: number;      // 1..120
  nombreEspecialista?: string;
  puestoEspecialista?: string;
  fechaElaboracion: string; // yyyy-mm-dd
};
type Caso = {
  encabezado: Encabezado;
  temasGuia: string;
  planteamiento: string;
  equipoAdicional?: string;
};
type CPStorageV2 = Encabezado & { casos: Caso[] };

const STORAGE_KEY = "inegi_cp_form_v2";

/** Lee casos desde localStorage (versión v2 del form multipágina) */
function readCases(): CPStorageV2 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CPStorageV2;
    if (!Array.isArray(data.casos) || data.casos.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

interface DownloadFAProps {
  /** Casos pasados desde FormPage (modo batch). Si no se pasa, lee de localStorage (modo individual) */
  casos?: any[];
}

export default function DownloadFA({ casos: casosProp }: DownloadFAProps = {}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedFolios } = useFolios();
  
  // Determinar si estamos en modo batch
  const isBatchMode = selectedFolios.length > 0 && !!casosProp;
  
  // Datos desde props (batch) o localStorage (individual)
  const dataFromStorage = useMemo(readCases, []); // lee una vez
  const data = casosProp ? null : dataFromStorage; // Si hay props, ignorar localStorage

  const validCases = useMemo(() => {
    const sourceCases = casosProp || data?.casos || [];
    return sourceCases.filter((c: any) => {
      const h = c.encabezado || ({} as Encabezado);
      const headerOk =
        [h.convocatoria, h.unidadAdministrativa, h.concurso, h.puesto, h.codigoPuesto, h.modalidad, h.fechaElaboracion]
          .every((v) => !!v && String(v).trim().length > 0) &&
        Number.isFinite(h.duracionMin) &&
        h.duracionMin >= 1 &&
        h.duracionMin <= 120;
      const planOk = !!(c.planteamiento || "").trim();
      return headerOk && planOk;
    });
  }, [casosProp, data]);

  const disabled = validCases.length === 0 || downloading;

  const handleDownload = async () => {
    if (disabled) return;
    
    setDownloading(true);
    setError(null);

    try {
      if (isBatchMode) {
        // Modo BATCH: Generar múltiples PDFs en ZIP
        const blob = await api.generarFALote({ casos: validCases, folios: selectedFolios });
        const timestamp = Date.now();
        await downloadZip(blob, `FA_lote_${timestamp}.zip`);
      } else {
        // Modo INDIVIDUAL: Generar un solo PDF
        const payload = {
          pagesPerCase: 2, // FA = 2 páginas por caso
          casos: validCases.map((c: any) => ({
            encabezado: c.encabezado,
            planteamiento: c.planteamiento,
          })),
        };

        const res = await fetch("/api/fa/generar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const ct = res.headers.get("content-type") || "";
        if (!res.ok) {
          const errText = ct.includes("application/json") ? JSON.stringify(await res.json()) : await res.text();
          throw new Error(`HTTP ${res.status} ${res.statusText} — ${errText}`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `FA_${data?.concurso || "formulario"}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      console.error('Error generando FA:', e);
      setError(e?.message || 'No se pudo generar el PDF de FA');
    } finally {
      setDownloading(false);
    }
  };

  // En modo batch, usar estilos específicos
  if (isBatchMode) {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={handleDownload}
          disabled={disabled}
          className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? 'Generando FA...' : `📄 Descargar FA en lote (${selectedFolios.length} folios)`}
        </button>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  // Modo individual: estilo original
  return (
    <div className="flex justify-center items-center">
      <button
        onClick={handleDownload}
        disabled={disabled}
        className={`flex items-center gap-2 px-8 py-4 rounded-3xl shadow-lg transition-all text-lg border
          ${!disabled ? "bg-white hover:bg-cyan-100 text-cyan-800 border-cyan-300"
                      : "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"}`}
        title={!disabled ? "Descargar FA (2 págs por caso)" : "Completa Estructura y Planteamiento en Casos"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6"
             fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/>
        </svg>
        {downloading ? "Generando..." : "PDF FA"}
      </button>
      {error && (
        <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
