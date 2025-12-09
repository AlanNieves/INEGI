import { useEffect, useMemo, useState, useRef } from "react";

/** Tipos */
export type Encabezado = {
  convocatoria: string;
  unidadAdministrativa: string;
  concurso: string;
  puesto: string;
  codigoPuesto: string;
  folio: string;              // Folio de la plaza
  modalidad: string;          // Oral | Escrita (o lo que decidas)
  duracionMin: number;        // 1..120
  nombreEspecialista: string;
  puestoEspecialista: string;
  fechaElaboracion: string;   // yyyy-mm-dd
};

export type Aspecto = { descripcion: string; puntaje: number };

export type CasoPractico = {
  encabezado: Encabezado;
  temasGuia: string;       // I
  planteamiento: string;   // II
  equipoAdicional: string; // III
  aspectos: Aspecto[];     // IV (1..10)
};

/** Payload agregado (compat con tu CasePractices: usa concurso raíz para el nombre del archivo) */
export type EstructuraPayload = Encabezado & {
  casos: CasoPractico[]; // 1..3
};

/** Constantes */
const storageKey = (token: string) => `inegi_cp_from_v2:${token}`

/** 🔒 Campos inmutables en el front */
const LOCKED_KEYS = new Set<keyof Encabezado>([
  "convocatoria",
  "unidadAdministrativa",
  "concurso",
  "puesto",
  "codigoPuesto",
  "nombreEspecialista",
]);

const emptyHeader = (): Encabezado => ({
  convocatoria: "",
  unidadAdministrativa: "",
  concurso: "",
  puesto: "",
  codigoPuesto: "",
  folio: "",
  modalidad: "",
  duracionMin: 0,
  nombreEspecialista: "",
  puestoEspecialista: "",
  fechaElaboracion: "",
});

const emptyCase = (header?: Encabezado): CasoPractico => ({
  encabezado: header ? { ...header } : emptyHeader(),
  temasGuia: "",
  planteamiento: "",
  equipoAdicional: "",
  aspectos: [{ descripcion: "", puntaje: 0 }], // 1 aspecto inicial
});

/** Migración desde el esquema viejo (una sola hoja) si existiera en localStorage */
function migrateIfNeeded(raw: any): EstructuraPayload | null {
  if (!raw) return null;
  // Si ya tiene casos, asumimos v2
  if (Array.isArray(raw.casos)) {
    const c1 = raw.casos[0]?.encabezado;
    // espejo raíz con encabezado del caso 1
    if (c1) {
      return {
        ...c1,
        casos: raw.casos,
      };
    }
    return null;
  }
  // Esquema v1 (sin casos, con campos raíz + "aspectos")
  const keys = [
    "convocatoria","unidadAdministrativa","concurso","puesto","codigoPuesto","folio","modalidad",
    "duracionMin","nombreEspecialista","puestoEspecialista","fechaElaboracion",
    "temasGuia","planteamiento","equipoAdicional","aspectos"
  ];
  const looksLikeV1 = keys.every((k) => k in raw);
  if (!looksLikeV1) return null;

  const header: Encabezado = {
    convocatoria: raw.convocatoria ?? "",
    unidadAdministrativa: raw.unidadAdministrativa ?? "",
    concurso: raw.concurso ?? "",
    puesto: raw.puesto ?? "",
    codigoPuesto: raw.codigoPuesto ?? "",
    folio: raw.folio ?? "",
    modalidad: raw.modalidad ?? "",
    duracionMin: raw.duracionMin ?? 0,
    nombreEspecialista: raw.nombreEspecialista ?? "",
    puestoEspecialista: raw.puestoEspecialista ?? "",
    fechaElaboracion: raw.fechaElaboracion ?? "",
  };
  const case1: CasoPractico = {
    encabezado: header,
    temasGuia: raw.temasGuia ?? "",
    planteamiento: raw.planteamiento ?? "",
    equipoAdicional: raw.equipoAdicional ?? "",
    aspectos: Array.isArray(raw.aspectos) ? raw.aspectos : [{ descripcion: "", puntaje: 0 }],
  };
  return { ...header, casos: [case1] };
}

/** Componente principal */
export default function FormCasePractices({
  onChange,
  initialData,
  token,
  isBatchMode = false,
  isEditMode = false,
}: {
  onChange: (data: EstructuraPayload, isValid: boolean) => void;
  initialData?: Partial<Encabezado>;
  token: string;
  isBatchMode?: boolean;
  isEditMode?: boolean;
}) {
  // Carga inicial desde localStorage (lazy initializer)
  const [data, setData] = useState<EstructuraPayload>(() => {
    try {
      const saved = localStorage.getItem(storageKey(token));
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrated = migrateIfNeeded(parsed);
        if (migrated) {
          // En modo edición, retornar SOLO los datos guardados sin fusionar con initialData
          if (isEditMode) {
            return migrated;
          }
          // Si NO es modo edición y hay initialData, fusionarlo con los datos guardados
          if (initialData) {
            const updatedHeader = { ...migrated, ...initialData };
            const updatedCasos = migrated.casos.map((caso, index) => ({
              ...caso,
              encabezado: index === 0 ? { ...caso.encabezado, ...initialData } : caso.encabezado
            }));
            return { ...updatedHeader, casos: updatedCasos };
          }
          return migrated;
        }
      }
    } catch {}

    // Si no hay datos guardados, crear con initialData si está disponible
    const first = emptyCase();
    const headerWithInitial = initialData ? { ...first.encabezado, ...initialData } : first.encabezado;
    const caseWithInitial = { ...first, encabezado: headerWithInitial };
    return { ...headerWithInitial, casos: [caseWithInitial] };
  });

  // Pestaña activa (1..N)
  const [activeIndex, setActiveIndex] = useState(0);

  // NUEVO: estados de envío/descarga/errores
  const [submitting, setSubmitting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Ref para evitar que se guarde doble en el historial (debido a React.StrictMode)
  const hasBeenSavedToHistory = useRef(false);

  // Actualizar datos cuando cambien los initialData
  // PERO solo si NO estamos en modo edición (para preservar los datos guardados)
  useEffect(() => {
    if (initialData && !isEditMode) {
      setData(prevData => {
        const updatedHeader = { ...prevData, ...initialData };
        const updatedCasos = prevData.casos.map((caso, index) => ({
          ...caso,
          encabezado: index === 0 ? { ...caso.encabezado, ...initialData } : caso.encabezado
        }));
        return { ...updatedHeader, casos: updatedCasos };
      });
    }
  }, [initialData, isEditMode]);

  // Persistencia automática
  useEffect(() => {
    localStorage.setItem(storageKey(token), JSON.stringify(data));
  }, [data]);

  /** Helpers para editar */
  const setHeader = <K extends keyof Encabezado>(i: number, k: K, v: Encabezado[K]) =>
    setData((d) => {
      // ⛔ Ignora cambios a campos bloqueados
      if (LOCKED_KEYS.has(k)) return d;

      const casos = d.casos.map((c, idx) =>
        idx === i ? { ...c, encabezado: { ...c.encabezado, [k]: v } } : c
      );
      // espejo raíz si editan el encabezado del Caso 1
      let root = { ...d };
      if (i === 0) {
        (root as any)[k] = v;
      }
      return { ...root, casos };
    });

  const setCaseField = <K extends keyof CasoPractico>(i: number, k: K, v: CasoPractico[K]) =>
    setData((d) => {
      const casos = d.casos.map((c, idx) => (idx === i ? { ...c, [k]: v } : c));
      return { ...d, casos };
    });

  const setAspecto = (i: number, j: number, patch: Partial<Aspecto>) =>
    setData((d) => {
      const casos = d.casos.map((c, idx) => {
        if (idx !== i) return c;
        const asp = c.aspectos.slice();
        const next = { ...asp[j], ...patch };
        // clamp puntaje 0..100
        let p = Number(next.puntaje);
        p = Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0;
        
        // Verificar que la suma total no exceda 100
        const currentSum = asp.reduce((acc, a, idx) => acc + (idx === j ? 0 : (Number.isFinite(a.puntaje) ? a.puntaje : 0)), 0);
        const newSum = currentSum + p;
        
        if (newSum > 100) {
          // Si excede 100, ajustar el valor para que la suma sea exactamente 100
          p = Math.max(0, 100 - currentSum);
        }
        
        next.puntaje = p;
        asp[j] = next;
        return { ...c, aspectos: asp };
      });
      return { ...d, casos };
    });

  const addAspecto = (i: number) =>
    setData((d) => {
      const casos = d.casos.map((c, idx) => {
        if (idx !== i) return c;
        if (c.aspectos.length >= 10) return c;
        return { ...c, aspectos: [...c.aspectos, { descripcion: "", puntaje: 0 }] };
      });
      return { ...d, casos };
    });

  const removeAspecto = (i: number, j: number) =>
    setData((d) => {
      const casos = d.casos.map((c, idx) => {
        if (idx !== i) return c;
        if (c.aspectos.length <= 1) return c;
        const next = c.aspectos.slice();
        next.splice(j, 1);
        return { ...c, aspectos: next };
      });
      return { ...d, casos };
    });

  const addCase = () =>
    setData((d) => {
      if (d.casos.length >= 3) return d;
      const base = d.casos[0]?.encabezado ?? emptyHeader();
      const nuevo = emptyCase(base);
      const casos = [...d.casos, nuevo];
      return { ...d, casos };
    });

  const removeCase = (i: number) =>
    setData((d) => {
      if (d.casos.length <= 1) return d; // siempre queda al menos 1
      const casos = d.casos.slice();
      casos.splice(i, 1);
      // espejo raíz (por si borramos el caso 0 y el nuevo primero tiene encabezado diferente)
      const h = casos[0].encabezado;
      return { ...h, casos };
    });

  const copyHeaderFromCase1 = (i: number) =>
    setData((d) => {
      const c1 = d.casos[0]?.encabezado ?? emptyHeader();
      const casos = d.casos.map((c, idx) => {
        if (idx !== i) return c;
        // ⚠️ Copia desde el Caso 1 solo campos NO bloqueados
        const nextEnc: Encabezado = { ...c.encabezado };
        (Object.keys(c1) as (keyof Encabezado)[]).forEach((k) => {
          if (!LOCKED_KEYS.has(k)) {
            (nextEnc as any)[k] = (c1 as any)[k];
          }
        });
        return { ...c, encabezado: nextEnc };
      });
      return { ...d, casos };
    });

  /** Totales y validación por caso y global */
  const totalByCase = (i: number) =>
    data.casos[i].aspectos.reduce((acc, a) => acc + (Number.isFinite(a.puntaje) ? a.puntaje : 0), 0);

  const isCaseValid = (c: CasoPractico) => {
    const h = c.encabezado;
    const reqText = [
      h.modalidad, h.convocatoria, h.unidadAdministrativa, h.concurso, h.puesto,
      h.codigoPuesto, h.folio, h.nombreEspecialista, /*h.puestoEspecialista,*/ h.fechaElaboracion,
      c.temasGuia, c.planteamiento,
    ].every((v) => !!v && String(v).trim().length > 0);
    const reqDur =
      Number.isFinite(h.duracionMin) && h.duracionMin >= 1 && h.duracionMin <= 120;
    const reqAspectos =
      c.aspectos.length >= 1 &&
      c.aspectos.length <= 10 &&
      c.aspectos.every(
        (a) => !!a.descripcion.trim() && Number.isFinite(a.puntaje) && a.puntaje >= 0 && a.puntaje <= 100
      );
      // La suma de puntajes por caso debe ser exactamente 100
      const total = c.aspectos.reduce((acc, a) => acc + (Number.isFinite(a.puntaje) ? a.puntaje : 0), 0);
      const reqTotal = total === 100;

      return reqText && reqDur && reqAspectos && reqTotal;
  };

  const allValid = useMemo(() => data.casos.every(isCaseValid), [data]);

  /** Notificar al padre y persistir */
  useEffect(() => {
    onChange(data, allValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, allValid]);

  /** Handler para finalizar y guardar la información del formulario */
  async function handleFinalize() {
    if (!allValid || !token) return;
    setSubmitting(true);
    setServerError(null);
    setDownloadUrl(null);
    try {
      // En modo edición, solo actualizamos localStorage sin enviar al backend
      if (isEditMode) {
        const INDEX_KEY = "inegi_cp_index_v1";
        const raw = localStorage.getItem(INDEX_KEY);
        const idx = raw ? (JSON.parse(raw) as any[]) : [];
        const existingIndex = idx.findIndex((item: any) => item.token === token);
        
        if (existingIndex !== -1) {
          idx[existingIndex] = {
            ...idx[existingIndex],
            nombreEspecialista: data?.nombreEspecialista || data?.casos?.[0]?.encabezado?.nombreEspecialista,
            concurso: data?.concurso || data?.casos?.[0]?.encabezado?.concurso,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
        }
        
        alert("Formulario actualizado exitosamente.");
        setSubmitting(false);
        return;
      }

      // Modo normal: Enviar al backend (funciona igual para 1 folio o múltiples)
      const res = await fetch(`/api/exams/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: data, consent: { accepted: true } }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Error al guardar el formulario: ${t}`);
      }

      const { examId, responsesUrl } = await res.json();
      if (!responsesUrl || !examId) {
        throw new Error("El backend no devolvió examId o responsesUrl.");
      }
      
      // Guardar en el historial SOLO si no se ha guardado antes (evita duplicados por StrictMode)
      if (!hasBeenSavedToHistory.current) {
        hasBeenSavedToHistory.current = true;
        try {
          const INDEX_KEY = "inegi_cp_index_v1";
          const raw = localStorage.getItem(INDEX_KEY);
          const idx = raw ? (JSON.parse(raw) as any[]) : [];
          const existingIndex = idx.findIndex((item: any) => item.token === token);
          if (existingIndex === -1) {
            // Solo agregar si no existe (los folios vendrán del servidor en el próximo refresh)
            idx.push({
              token,
              examId,
              responsesUrl,
              nombreEspecialista: data?.nombreEspecialista || data?.casos?.[0]?.encabezado?.nombreEspecialista,
              concurso: data?.concurso || data?.casos?.[0]?.encabezado?.concurso,
              savedAt: new Date().toISOString(),
            });
            localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
          }
        } catch {}
      }

      // Mostrar mensaje de éxito
      alert("Formulario guardado exitosamente. Puedes generar los documentos desde el historial.");
    } catch (e: any) {
      setServerError(e?.message || "No se pudo guardar el formulario.");
    } finally {
      setSubmitting(false);
    }
  }


  /** UI */
  const c = data.casos[activeIndex];

  return (
    <form className="bg-cyan-950/40 backdrop-blur rounded-3xl shadow-xl p-6 md:p-8 space-y-6 border border-cyan-800/30" onSubmit={(e) => e.preventDefault()}>
      {/* Tabs de casos + acciones */}
      <div className="flex flex-wrap items-center gap-2">
        {data.casos.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`px-3 py-1.5 rounded-full text-sm border transition
              ${activeIndex === i ? "bg-cyan-600 text-white border-cyan-600" : "bg-cyan-900/40 text-cyan-100 border-cyan-700/50 hover:bg-cyan-800/60"}`}
            aria-current={activeIndex === i ? "page" : undefined}
          >
            Caso {i + 1}
          </button>
        ))}

        <button
          type="button"
          onClick={addCase}
          disabled={data.casos.length >= 3}
          className={`ml-2 px-3 py-1.5 rounded-full text-sm border transition
            ${data.casos.length >= 3 ? "bg-cyan-950/40 text-cyan-500/50 border-cyan-800/30 cursor-not-allowed"
                                      : "bg-cyan-900/40 text-cyan-100 border-cyan-700/50 hover:bg-cyan-800/60"}`}
          title="Agregar caso (máximo 3)"
        >
          + Agregar caso
        </button>

        {data.casos.length > 1 && (
          <button
            type="button"
            onClick={() => removeCase(activeIndex)}
            className="px-3 py-1.5 rounded-full text-sm border border-red-400/50 text-red-200 bg-red-900/30 hover:bg-red-800/50 transition"
            title="Eliminar caso actual"
          >
            Eliminar caso
          </button>
        )}
      </div>

      {/* Encabezado del caso activo */}
      <div className="grid md:grid-cols-3 gap-4">
        <TextField
          label="Convocatoria *"
          value={c.encabezado.convocatoria}
          onChange={(v) => setHeader(activeIndex, "convocatoria", v)}
          disabled
        />
        <TextField
          label="Unidad Administrativa *"
          value={c.encabezado.unidadAdministrativa}
          onChange={(v) => setHeader(activeIndex, "unidadAdministrativa", v)}
          disabled
        />
        <TextField
          label="Concurso *"
          value={c.encabezado.concurso}
          onChange={(v) => setHeader(activeIndex, "concurso", v)}
          disabled
        />
        <TextField
          label="Puesto *"
          value={c.encabezado.puesto}
          onChange={(v) => setHeader(activeIndex, "puesto", v)}
          disabled
        />
        <TextField
          label="Código *"
          value={c.encabezado.codigoPuesto}
          onChange={(v) => setHeader(activeIndex, "codigoPuesto", v)}
          disabled
        />
        <TextField
          label="Folio *"
          value={c.encabezado.folio}
          onChange={(v) => setHeader(activeIndex, "folio", v)}
          disabled
        />
        <SelectField
          label="Modalidad *"
          value={c.encabezado.modalidad}
          onChange={(v) => setHeader(activeIndex, "modalidad", v)}
          options={["Oral", "Escrita"]}
        />
      </div>
      <div className="grid md:grid-cols-3 gap-4">

        <TextField
          label="Nombre del especialista"
          value={c.encabezado.nombreEspecialista}
          onChange={(v) => setHeader(activeIndex, "nombreEspecialista", v)}
          className="md:col-span-3"
          disabled
        
        />

        
      </div>
      <div className="grid md:grid-cols-2 gap-4">

        <MinutesField 
          label="Duración (minutos)"
          valueMinutes={c.encabezado.duracionMin}
          onChange={(mins) => setHeader(activeIndex, "duracionMin", mins)}
        />
        <DateField
          label="Fecha de elaboración *"
          value={c.encabezado.fechaElaboracion}
          onChange={(v) => setHeader(activeIndex, "fechaElaboracion", v)}
          
        />

      </div>

      {/* Botón para re-clonar encabezado del Caso 1 */}
      {activeIndex > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => copyHeaderFromCase1(activeIndex)}
            className="px-3 py-1.5 rounded-lg text-sm border border-cyan-300 text-cyan-800 hover:bg-cyan-50 transition"
            title="Copiar encabezado del Caso 1"
          >
            Copiar encabezado del Caso 1
          </button>
        </div>
      )}

      {/* Secciones I - III */}
      <AreaField
        label="I. Temas de la guía de estudio *"
        value={c.temasGuia}
        onChange={(v) => setCaseField(activeIndex, "temasGuia", v)}
        hint={
          <>
            Copie aquí los temas de la guía en que se basa el planteamiento.{" "}
            <a
              href="https://www.inegi.org.mx/app/spc/guias.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline"
            >
              Ver guías INEGI
            </a>
          </>
        }
      />
      <AreaField
        label="II. Planteamiento del caso práctico *"
        value={c.planteamiento}
        onChange={(v) => setCaseField(activeIndex, "planteamiento", v)}
      />
      <AreaField
        label="III. Equipo adicional requerido"
        value={c.equipoAdicional}
        onChange={(v) => setCaseField(activeIndex, "equipoAdicional", v)}
      />

      {/* IV. Aspectos por caso */}
      <fieldset className="border border-cyan-300 rounded-2xl p-4 space-y-4">
        <legend className="px-3 text-cyan-100 font-semibold bg-cyan-900/30 rounded-md -mx-3 inline-block">
          IV. Aspectos a evaluar y puntaje por criterio (0–100)
        </legend>

        <div className="space-y-3">
          {c.aspectos.map((asp, j) => (
            <div key={j} className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-3 items-end">
              <TextField
                label={`Aspecto ${j + 1} *`}
                value={asp.descripcion}
                onChange={(v) => setAspecto(activeIndex, j, { descripcion: v })}
              />
              <NumberField
                label="Puntaje"
                value={asp.puntaje}
                min={0}
                max={100}
                onChange={(v) => setAspecto(activeIndex, j, { puntaje: Number.isFinite(v) ? v : 0 })}
              />
              <button
                type="button"
                onClick={() => removeAspecto(activeIndex, j)}
                disabled={c.aspectos.length <= 1}
                className={`px-3 py-2 rounded-lg border transition
                  ${c.aspectos.length <= 1 ? "border-cyan-800/30 text-cyan-500/50 bg-cyan-950/40 cursor-not-allowed"
                                            : "border-red-400/50 text-red-200 bg-red-900/30 hover:bg-red-800/50"}`}
                title="Eliminar aspecto"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => addAspecto(activeIndex)}
            disabled={c.aspectos.length >= 10}
            className={`px-4 py-2 rounded-xl transition border
              ${c.aspectos.length >= 10 ? "bg-cyan-950/40 text-cyan-500/50 border-cyan-800/30 cursor-not-allowed"
                                        : "bg-cyan-900/40 text-cyan-100 border-cyan-700/50 hover:bg-cyan-800/60"}`}
          >
            Agregar aspecto
          </button>

          <div className="font-semibold text-cyan-100">
            TOTAL: <span className={
              totalByCase(activeIndex) === 100 
                ? "text-green-600" 
                : totalByCase(activeIndex) > 100 
                  ? "text-red-600" 
                  : "text-orange-600"
            }>
              {totalByCase(activeIndex)}/100
            </span>
            {totalByCase(activeIndex) !== 100 && (
              <span className={`text-sm ml-1 ${
                totalByCase(activeIndex) > 100 ? "text-red-600" : "text-orange-600"
              }`}>
                {totalByCase(activeIndex) > 100 
                  ? "(excede el límite)" 
                  : "(debe ser 100)"
                }
              </span>
            )}
          </div>
        </div>
      </fieldset>

      {/* Validación global */}
      <p className={`text-sm ${allValid ? "text-emerald-700" : "text-red-700"}`}>
        {allValid
          ? isBatchMode
            ? "Formulario completo. Desplázate hacia abajo para descargar los documentos en lote."
            : isEditMode
              ? "Formulario completo. Ya puedes actualizar los cambios desde el botón 'Finalizar'."
              : "Formulario completo. Ya puedes generar el PDF desde el botón 'Finalizar'."
          : "Completa los campos marcados con * y al menos 1 aspecto con puntaje (0–100) en cada caso. La suma total debe ser 100."}
      </p>

      {/* --- ACCIONES: Finalizar y Descarga --- */}
      <div className="mt-2 flex items-center gap-3 justify-end">
        {/* Botón Finalizar: solo visible en modo individual (no batch) */}
        {!isBatchMode && (
          <button
            type="button"
            onClick={handleFinalize}
            disabled={!allValid || submitting || !token}
            className={`px-4 py-2 rounded-xl border transition
              ${!allValid || submitting || !token
                ? "bg-cyan-950/40 text-cyan-500/50 border-cyan-800/30 cursor-not-allowed"
                : "bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-700"}`}
            title={!token ? "Falta token del link" : "Enviar formulario"}
          >
            {submitting ? (isEditMode ? "Actualizando..." : "Generando PDF...") : (isEditMode ? "Actualizar" : "Finalizar")}
          </button>
        )}

        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="px-4 py-2 rounded-xl border bg-cyan-900/40 text-cyan-100 border-cyan-700/50 hover:bg-cyan-800/60"
          >
            Descargar respuestas (PDF)
          </a>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-red-300 text-right">{serverError}</p>
      )}
    </form>
  );
}


/* ------- Inputs base ------- */
function TextField({
  label, value, onChange, className = "", disabled = false
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex flex-col ${className}`}>
      <span className="text-sm text-cyan-200 mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => !disabled && onChange(e.target.value)}
        disabled={disabled}
        className={`rounded-xl border px-3 py-2 text-center focus:outline-none focus:ring-2
          ${disabled ? "bg-cyan-950/40 text-cyan-500/50 border-cyan-800/30 cursor-not-allowed pointer-events-none"
                     : "bg-cyan-900/30 text-cyan-100 border-cyan-700/50 focus:ring-cyan-500 focus:border-cyan-500"}`}
      />
    </label>
  );
}

function NumberField({
  label, value, onChange, min, max, disabled = false
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col">
      <span className="text-sm text-cyan-200 mb-1">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        min={min} max={max}
        onChange={(e) => !disabled && onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        disabled={disabled}
        className={`rounded-xl border px-3 py-2 text-center focus:outline-none focus:ring-2
          ${disabled ? "bg-cyan-950/40 text-cyan-500/50 border-cyan-800/30 cursor-not-allowed pointer-events-none"
                     : "bg-cyan-900/30 text-cyan-100 border-cyan-700/50 focus:ring-cyan-500 focus:border-cyan-500"}`}
      />
    </label>
  );
}

function DateField({
  label, value, onChange, disabled = false
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col">
      <span className="text-sm text-cyan-200 mb-1">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => !disabled && onChange(e.target.value)}
        disabled={disabled}
        className={`rounded-xl border px-3 py-2 text-center focus:outline-none focus:ring-2
          ${disabled ? "bg-cyan-950/40 text-cyan-500/50 border-cyan-800/30 cursor-not-allowed pointer-events-none"
                     : "bg-cyan-900/30 text-cyan-100 border-cyan-700/50 focus:ring-cyan-500 focus:border-cyan-500"}`}
      />
    </label>
  );
}

function SelectField({
  label, value, onChange, options, disabled = false
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col">
      <span className="text-sm text-cyan-200 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => !disabled && onChange(e.target.value)}
        disabled={disabled}
        className={`rounded-xl border px-3 py-2 text-center focus:outline-none focus:ring-2
          ${disabled ? "bg-cyan-950/40 text-cyan-500/50 border-cyan-800/30 cursor-not-allowed pointer-events-none"
                     : "bg-cyan-900/30 text-cyan-100 border-cyan-700/50 focus:ring-cyan-500 focus:border-cyan-500"}`}
      >
        <option value="">Selecciona…</option>
        {options.map((op) => <option key={op} value={op}>{op}</option>)}
      </select>
    </label>
  );
}

function AreaField({
  label, value, onChange, hint, disabled = false
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col">
      <span className="text-sm text-cyan-200 mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => !disabled && onChange(e.target.value)}
        rows={4}
        disabled={disabled}
        className={`rounded-xl border px-3 py-2 text-center focus:outline-none focus:ring-2
          ${disabled ? "bg-cyan-950/40 text-cyan-500/50 border-cyan-800/30 cursor-not-allowed pointer-events-none"
                     : "bg-cyan-900/30 text-cyan-100 border-cyan-700/50 focus:ring-cyan-500 focus:border-cyan-500"}`}
      />
      {hint && <span className="text-xs text-cyan-400 mt-1">{hint}</span>}
    </label>
  );
}

/* Minutos 1..120 */
function MinutesField({
  label,
  valueMinutes,
  onChange,
  disabled = false,
}: {
  label: string;
  valueMinutes: number;
  onChange: (mins: number) => void;
  disabled?: boolean;
}) {
  const toHHMM = (mins: number) => {
    if (!Number.isFinite(mins) || mins <= 0) return "00:00";
    const clamped = Math.max(0, Math.min(120, Math.round(mins)));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(h)}:${pad(m)}`;
  };

  return (
    <label className="flex flex-col">
      <span className="text-sm text-cyan-200 mb-1">{label}</span>
      <input
        type="number"
        min={1}
        max={120}
        step={1}
        value={Number.isFinite(valueMinutes) ? valueMinutes : ""}
        onChange={(e) => {
          if (disabled) return;
          const n = e.target.value === "" ? NaN : Number(e.target.value);
          if (!Number.isFinite(n)) return onChange(NaN);
          const clamped = Math.max(1, Math.min(120, Math.round(n)));
          onChange(clamped);
        }}
        disabled={disabled}
        className={`rounded-xl border px-3 py-2 text-center focus:outline-none focus:ring-2
          ${disabled ? "bg-cyan-950/40 text-cyan-500/50 border-cyan-800/30 cursor-not-allowed pointer-events-none"
                     : "bg-cyan-900/30 text-cyan-100 border-cyan-700/50 focus:ring-cyan-500 focus:border-cyan-500"}`}
      />
      <span className="text-xs text-cyan-400 mt-1">
        {Number.isFinite(valueMinutes) && valueMinutes > 0
          ? `Equivale a ${toHHMM(valueMinutes)} (hh:mm)`
          : "Rango permitido: 1 a 120 minutos"}
      </span>
    </label>
  );
}
