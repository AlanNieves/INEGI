import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api, type PrefillPayload, type LinkVerify } from "../lib/api";
import { useFolios } from "../contexts/FoliosContext";
import FormCasePractices, {
  type EstructuraPayload,
} from "../features/casos-practicos/FormCasePractices";
import PrivacyModal from "../components/PrivacyModal";

type PrefillFlat = {
  convocatoria: string; 
  unidadAdministrativa: string;
  concurso: string;
  puesto: string;
  codigoPuesto: string;
  nombreEspecialista: string;
  folio: string;
};

export default function FormPage() {
  const { token = "" } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";
  const { selectedFolios, setSelectedFolios } = useFolios();
  const [verif, setVerif] = useState<LinkVerify | null>(null);
  const [prefill, setPrefill] = useState<PrefillPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  
  // 🆕 Estado del formulario para generación en lote
  const [formData, setFormData] = useState<EstructuraPayload | null>(null);

  // Estado para controlar el aviso de privacidad obligatorio
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [privacySubmitting, setPrivacySubmitting] = useState(false);

  // 🆕 Detectar si es modo batch desde el header del link
  const isBatchMode = (verif?.header as any)?.isBatch || false;
  const batchFolios = (verif?.header as any)?.folios || [];

  // Guardar datos del formulario cuando son válidos
  const handleCasePracticesChange = (data: EstructuraPayload, isValid: boolean) => {
    if (isValid) {
      setFormData(data);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      
      try {
        // En modo edición, solo necesitamos cargar datos del localStorage
        // No validamos el link porque puede estar expirado o usado
        if (isEditMode) {
          // Crear un objeto de verificación simulado para modo edición
          setVerif({ valid: true });
          // Intentar obtener prefill para tener datos base, pero no es crítico si falla
          try {
            const p = await api.prefillExam(token);
            setPrefill(p);
          } catch {
            // En modo edición, el prefill no es crítico
            // Los datos se cargarán desde localStorage
            console.log("Modo edición: usando datos de localStorage");
          }
          setLoading(false);
          return;
        }
        
        // Modo normal: Verificar token
        const v = await api.verifyLink(token);
        setVerif(v);
        if (!v.valid) {
          setErr(v.reason || "Link inválido o expirado");
          return;
        }
        
        // 🆕 Si es modo batch, cargar los folios en el contexto
        if ((v.header as any)?.isBatch && (v.header as any)?.folios) {
          setSelectedFolios((v.header as any).folios);
        }
        
        // 2) Prefill (campos planos desde el back)
        const p = await api.prefillExam(token);
        setPrefill(p);
      } catch (e: any) {
        console.error("Error cargando formulario:", e);
        setErr("No se pudo cargar el formulario.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, isEditMode, setSelectedFolios]);

  // Mostrar el aviso de privacidad justo al entrar, solo si el link es válido
  // NOTA: En modo edición, saltamos el aviso de privacidad (ya fue aceptado)
  useEffect(() => {
    try {
      if (!loading && verif?.valid && !isEditMode) {
        const key = `consent:${token}`;
        const seen = localStorage.getItem(key) === "1";
        setPrivacyOpen(!seen);
      }
    } catch {
      if (!isEditMode) {
        setPrivacyOpen(true);
      }
    }
  }, [loading, verif, token, isEditMode]);

  // Handler cuando el usuario acepta el aviso (envía al backend y persiste local)
  const handleAcceptPrivacy = async ({ fullName }: { fullName: string }) => {
    if (privacySubmitting) return; // evitar llamadas concurrentes
    setPrivacyError(null);
    if (!token) {
      setPrivacyError("Falta token para registrar el consentimiento.");
      return;
    }
    setPrivacySubmitting(true);
    try {
  // El backend valida el campo `tipo` contra un enum; usar un valor permitido.
  // Valores válidos según backend: 'uso_app' | 'conclusion_examen'
  await api.postConsent(token, { tipo: "uso_app", nombreDeclarante: fullName, aceptado: true });
      try {
        localStorage.setItem(`consent:${token}`, "1");
      } catch {}
      setPrivacyOpen(false);
    } catch (e: any) {
      setPrivacyError(e?.response?.data?.message || e?.message || "No se pudo enviar el consentimiento.");
    } finally {
      setPrivacySubmitting(false);
    }
  };

  // Preferimos los 6 campos planos de /api/exams/prefill
  // y caemos al header anidado de verify si hiciera falta.
  // En modo edición, si no hay prefill, devolvemos un objeto vacío
  // porque los datos se cargarán desde localStorage
  const readonlyData: PrefillFlat | null = useMemo(() => {
    // En modo edición sin prefill, retornar objeto vacío
    // Los datos se cargarán desde localStorage en FormCasePractices
    if (isEditMode && !prefill) {
      return {
        convocatoria: "",
        unidadAdministrativa: "",
        concurso: "",
        puesto: "",
        codigoPuesto: "",
        nombreEspecialista: "",
        folio: "",
      };
    }

    const flat = (prefill as any) as PrefillFlat | null;

    // Si ya tenemos la respuesta plana del back, úsala tal cual.
    if (flat && typeof flat === "object" && flat.convocatoria != null) {
      return {
        convocatoria: String(flat.convocatoria ?? ""),
        unidadAdministrativa: String(flat.unidadAdministrativa ?? ""),
        concurso: String(flat.concurso ?? ""),
        puesto: String(flat.puesto ?? ""),
        codigoPuesto: String(flat.codigoPuesto ?? ""),
        nombreEspecialista: String(flat.nombreEspecialista ?? ""),
        folio: String(flat.folio ?? ""),
      };
    }

    // Fallback al header que viene en verify (por si acaso)
    const h = (verif as any)?.header ?? null;
    if (!h) return null;

    const conv = (h?.convocatoria?.codigo ?? h?.convocatoria ?? "") as string;
    const conc = (h?.concurso?.nombre ?? h?.concurso ?? "") as string;
    const ua = (h?.plaza?.unidadAdministrativa ?? "") as string;
    const puesto = (h?.plaza?.puesto ?? "") as string;
    const cod = (h?.plaza?.codigoPlaza ?? h?.plaza?.id ?? "") as string;
    const esp = (h?.especialista?.nombre ?? h?.especialista?.nombreCompleto ?? "") as string;
    const folio = (h?.plaza?.folio ?? h?.folio ?? "") as string;

    return {
      convocatoria: String(conv ?? ""),
      unidadAdministrativa: String(ua ?? ""),
      concurso: String(conc ?? ""),
      puesto: String(puesto ?? ""),
      codigoPuesto: String(cod ?? ""),
      nombreEspecialista: String(esp ?? ""),
      folio: String(folio ?? ""),
    };
  }, [prefill, verif, isEditMode]);

  // Memoizar initialData para evitar recrear el objeto en cada render
  const initialDataMemo = useMemo(() => ({
    // Estos 7 vienen prellenados y el backend los tomará como inmutables al submit
    convocatoria: readonlyData?.convocatoria ?? "",
    concurso: readonlyData?.concurso ?? "",
    unidadAdministrativa: readonlyData?.unidadAdministrativa ?? "",
    puesto: readonlyData?.puesto ?? "",
    codigoPuesto: readonlyData?.codigoPuesto ?? "",
    nombreEspecialista: readonlyData?.nombreEspecialista ?? "",
    folio: readonlyData?.folio ?? "",

    // Valores por defecto del examen (editables por el especialista)
    modalidad: "Escrita",
    duracionMin: 60,
    puestoEspecialista: "",
    fechaElaboracion: new Date().toISOString().split("T")[0],
  }), [readonlyData]);

  if (loading) {
    return <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="glass-panel p-8 md:p-10 text-cyan-100">Cargando…</div>
    </div>;
  }

  // Token inválido / expirado / error general
  if ((verif && !verif.valid) || err) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="glass-panel p-8 md:p-10">
          <h1 className="text-xl font-semibold mb-2 text-cyan-100">No se puede abrir el examen</h1>
          <p className="text-cyan-300">
            Motivo: <span className="font-mono">{err ?? verif?.reason ?? "desconocido"}</span>
          </p>
        </div>
      </div>
    );
  }

  // Formulario
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="glass-panel p-8 md:p-10">
      {/* Aviso de privacidad obligatorio (no se puede cerrar sin aceptar) */}
      <PrivacyModal
        open={privacyOpen}
        initialName={readonlyData?.nombreEspecialista ?? ""}
        onAccept={handleAcceptPrivacy}
        enforceAccept={true}
      />
      {privacyError && (
        <div className="mb-4">
          <p className="text-sm text-red-300">{privacyError}</p>
        </div>
      )}
      {/* Banner informativo para modo edición */}
      {isEditMode && (
        <div className="mb-6 p-4 bg-blue-900/20 border-2 border-blue-700/30 rounded-xl">
          <h3 className="text-lg font-bold text-blue-100 mb-2">
            Editando Formulario
          </h3>
        </div>
      )}
      {/* Banner informativo para modo batch */}
      {isBatchMode && (selectedFolios.length > 0 || batchFolios.length > 0) && (
        <div className="mb-6 p-4 bg-cyan-900/20 border-2 border-cyan-700/30 rounded-xl">
          <h3 className="text-lg font-bold text-cyan-100 mb-2">
            Modo de Generación en Lote
          </h3>
          <p className="text-sm text-cyan-300">
            Has seleccionado <strong>{selectedFolios.length || batchFolios.length} folios</strong>. 
            Llena el formulario una vez y descarga los documentos en lote al final.
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(selectedFolios.length > 0 ? selectedFolios : batchFolios).map((folio: string, idx: number) => (
              <span key={idx} className="px-2 py-1 bg-cyan-800/40 text-cyan-100 border border-cyan-600/30 rounded text-xs font-mono">
                {folio}
              </span>
            ))}
          </div>
        </div>
      )}

      <FormCasePractices
        onChange={handleCasePracticesChange}
        token={token}
        key={token}
        isBatchMode={isBatchMode}
        isEditMode={isEditMode}
        initialData={initialDataMemo}
      />

      {/* Botones de descarga en lote (solo en modo batch) */}
      {isBatchMode && formData && selectedFolios.length > 0 && (
        <div className="mt-8 p-6 bg-cyan-900/10 rounded-xl border-2 border-cyan-700/20">
          <h3 className="text-xl font-bold text-cyan-100 mb-4">
            Descargar Documentos en Lote
          </h3>
          <p className="text-sm text-cyan-300 mb-4">
            Genera y descarga archivos ZIP con documentos para todos los folios seleccionados:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Los botones individuales se han eliminado - ahora todo se genera desde "Artefactos" en SavedForms */}
          </div>
        </div>
      )}
      
      <style>{`
        .glass-panel {
          background: rgba(18, 28, 48, 0.72);
          border: 1.5px solid rgba(80, 180, 255, 0.09);
          box-shadow: 0 8px 40px rgba(14,165,233,0.10), 0 1px 0 rgba(255,255,255,0.02);
          backdrop-filter: blur(18px) saturate(120%);
          -webkit-backdrop-filter: blur(18px) saturate(120%);
          border-radius: 24px;
          transition: box-shadow 0.2s;
        }
      `}</style>
      </div>
    </div>
  );
}
