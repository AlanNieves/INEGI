import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // si usas React Router
import { getSubmissionPreview, downloadFile } from "../../lib/tirangulacionApi";
import { useAuth } from "../../hooks/useAuth";

type PreviewData = {
  encabezado: any;
  caso: any;
  criterios: Array<{ descripcion: string; puntaje: number }>;
  respuestasOriginales: any;
};

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const { isTriangulacion } = useAuth();
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const p = await getSubmissionPreview(id);
        setData(p);
      } catch (e: any) {
        setErr(e?.message ?? "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (!isTriangulacion) return <div>No autorizado.</div>;
  if (loading) return <div>Cargando…</div>;
  if (err) return <div className="text-red-500">{err}</div>;
  if (!data) return null;

  const fnameBase = `_${data?.encabezado?.convocatoria ?? "conv"}_${data?.encabezado?.codigoPuesto ?? "puesto"}`.replace(/\s+/g, "_");

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Respuestas del especialista</h2>

      <div className="rounded border p-3 bg-neutral-900">
        <pre className="text-xs overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>

      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500"
          onClick={() =>
            downloadFile(`/api/triangulacion/submissions/${id}/fa`, `FA${fnameBase}.pdf`)
          }
        >
          Descargar FA (PDF)
        </button>

        <button
          className="px-4 py-2 rounded bg-green-600 hover:bg-green-500"
          onClick={() =>
            downloadFile(`/api/triangulacion/submissions/${id}/fe`, `FE${fnameBase}.xlsx`)
          }
        >
          Descargar FE (Excel)
        </button>
      </div>
    </div>
  );
}
