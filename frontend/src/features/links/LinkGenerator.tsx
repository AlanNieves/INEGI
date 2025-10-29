// src/features/links/LinkGenerator.tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useFolios } from "../../contexts/FoliosContext";

/* ---------------------------- Tipos (flexibles) ---------------------------- */

type Convocatoria = {
  _id: string;
  codigo?: string;
  nombre?: string;
  activa?: boolean;
  hash?: string;
};

type Concurso = {
  _id: string;
  convocatoriaId?: string;
  codigo?: string;
  nombre?: string;
  activo?: boolean;
  hash?: string;
};

type Plaza = {
  _id: string;
  convocatoriaId?: string;
  concursoId?: string;

  // alias posibles de código de plaza
  codigoPlaza?: string;
  codigo?: string;
  plaza?: string;
  code?: string;
  clave?: string;

  // puesto / unidad (alias)
  puesto?: string;
  puestoNombre?: string;
  unidadAdministrativa?: string;
  unidad_adm?: string;

  radicacion?: string;

  // especialista (alias según la fuente)
  especialistaId?: string;     // camelCase (si viene normalizado)
  especialista_id?: string;    // snake_case (como en tu BD)
  especialistaNombre?: string; // opcional
};

type Especialista = {
  _id: string;
  nombreCompleto?: string;
  nombre?: string;
  email?: string;
};

type Aspirante = {
  _id: string;
  folio: string;
  nombre: string;
  label: string;
};

type GenResult = { token: string; url: string; expiraAt: string };

/* ------------------------------ Utilidades UI ----------------------------- */

function getPlazaCodigo(p: Plaza) {
  return p.codigoPlaza || p.codigo || p.plaza || p.code || p.clave || "";
}

function getPuesto(p: Plaza) {
  return p.puesto || p.puestoNombre || "";
}

function getUnidad(p: Plaza) {
  return p.unidadAdministrativa || (p as any).unidad_adm || "";
}

function getEspecialistaId(p: Plaza) {
  return p.especialistaId || (p as any).especialista_id || "";
}

function getEspecialistaNombre(p: Plaza, map: Record<string, Especialista>) {
  const id = getEspecialistaId(p);
  return (
    p.especialistaNombre ||
    (id ? map[id]?.nombreCompleto || (map[id] as any)?.nombre : "") ||
    ""
  );
}

function labelConcurso(c: Concurso) {
  return c.nombre || c.codigo || c.hash || "SIN-NOMBRE";
}

function labelConvocatoria(c: Convocatoria) {
  return c.codigo || c.nombre || c.hash || "SIN-CODIGO";
}

/* --------------------------------- Componente -------------------------------- */

export default function LinkGenerator() {
  const { setSelectedFolios } = useFolios();
  const BATCH_KEY = '__lote';
  
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [especialistas, setEspecialistas] = useState<Especialista[]>([]);
  const [aspirantes, setAspirantes] = useState<Aspirante[]>([]);

  const [convId, setConvId] = useState("");
  const [concId, setConcId] = useState("");
  // per-plaza aspirante selection removed from UI; keep placeholder in case needed later

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, GenResult>>({}); // plaza._id -> result

  // Leer casos desde localStorage (misma clave que usa DownloadFA/FE)
  function readCasesFromStorage() {
    try {
      // 1) Intentar clave global (v1 del proyecto)
      const GLOBAL_KEY = 'inegi_cp_form_v2';
      const rawGlobal = localStorage.getItem(GLOBAL_KEY);
      if (rawGlobal) {
        try {
          const data = JSON.parse(rawGlobal);
          if (data && Array.isArray(data.casos) && data.casos.length > 0) return data;
        } catch {}
      }

      // 2) Fallback: leer el índice de formularios guardados y cargar el más reciente
      const INDEX_KEY = 'inegi_cp_index_v1';
      const rawIndex = localStorage.getItem(INDEX_KEY);
      if (!rawIndex) return null;
      const idx = JSON.parse(rawIndex);
      if (!Array.isArray(idx) || idx.length === 0) return null;

      // En el índice los items se agregan al final; tomar el último (más reciente)
      const last = idx[idx.length - 1];
      const token = last?.token;
      if (!token) return null;

      const tokenKey = `inegi_cp_from_v2:${token}`; // nota: el form actual usa "from" en la clave
      const rawToken = localStorage.getItem(tokenKey);
      if (!rawToken) return null;
      try {
        const data = JSON.parse(rawToken);
        if (data && Array.isArray(data.casos) && data.casos.length > 0) return data;
      } catch {}

      return null;
    } catch {
      return null;
    }
  }

  /* ----------------------------- Carga catálogos ----------------------------- */

  useEffect(() => {
    (async () => {
      try {
        const [conv, esp] = await Promise.all([
          api.listConvocatorias(),
          api.listEspecialistas(),
        ]);
        setConvocatorias(conv as any);
        setEspecialistas(esp as any);
      } catch (e: any) {
        setError(e?.message || "Error cargando catálogos.");
      }
    })();
  }, []);

  /* ------------------------------ Cambio de conv ----------------------------- */

  useEffect(() => {
    (async () => {
      setConcursos([]);
      setConcId("");
      setPlazas([]);
      if (!convId) return;
      try {
        const data = await api.listConcursosByConvocatoria(convId);
        setConcursos(data as any);
      } catch (e: any) {
        setError(e?.message || "Error cargando concursos.");
      }
    })();
  }, [convId]);

  /* ------------------------------- Cambio de conc ---------------------------- */

  useEffect(() => {
    (async () => {
  setPlazas([]);
  setAspirantes([]);
      if (!convId || !concId) return;
      
      try {
        const [plazasData, aspirantesData] = await Promise.all([
          api.listPlazas(convId, concId),
          api.listAspirantes(convId, concId),
        ]);
        
        setPlazas(plazasData as any);
        setAspirantes(aspirantesData);
      } catch (e: any) {
        console.error("Error cargando plazas/aspirantes:", e);
        setError(e?.message || "Error cargando plazas/aspirantes.");
      }
    })();
  }, [convId, concId]);

  /* ------------------------- Índice de especialistas ------------------------- */

  const especialistasById = useMemo(() => {
    const map: Record<string, Especialista> = {};
    for (const e of especialistas) {
      if (e?._id) map[e._id] = e;
    }
    return map;
  }, [especialistas]);

  /* (Per-plaza generate UI removed) */

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("¡Copiado!");
    } catch {
      const ok = window.confirm(`Copia el link manualmente:\n${text}`);
      if (ok) void 0;
    }
  };

  /* ---------------------- Función para procesar TODOS los folios ----------------------- */

  const handleProceedWithAllFolios = async () => {
    // Necesitamos los datos del encabezado de la convocatoria/concurso seleccionados
    if (!convId || !concId) {
      alert("Selecciona una convocatoria y concurso primero");
      return;
    }

    if (aspirantes.length === 0) {
      setError("No hay aspirantes disponibles");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      // Obtener datos para el prefill
      const conv = convocatorias.find((c) => c._id === convId);
      const conc = concursos.find((c) => c._id === concId);

      const convCode = conv?.codigo || conv?.nombre || "";
      const concCode = conc?.codigo || conc?.nombre || "";

      // Tomar la primera plaza como referencia para los datos comunes
      const primeraPlaza = plazas[0];
      if (!primeraPlaza) {
        setError("No hay plazas disponibles");
        return;
      }

      const plazaCodigo = getPlazaCodigo(primeraPlaza);
      const puesto = getPuesto(primeraPlaza);
      const unidadAdministrativa = getUnidad(primeraPlaza);
      const jefeNombre = getEspecialistaNombre(primeraPlaza, especialistasById);

      // Usar todos los folios disponibles
      const foliosArray = aspirantes.map(a => a.folio);

      const body: any = {
        convocatoriaId: convId,
        concursoId: concId,
        plazaId: plazaCodigo,
        ttlHours: 48,
        isBatch: true,
        folios: foliosArray,
        prefill: {
          convocatoria: convCode,
          concurso: concCode,
          plazaCodigo,
          puesto,
          unidadAdministrativa,
          folio: `LOTE (${foliosArray.length} folios)`,
          jefeNombre,
          radicacion: (primeraPlaza as any).radicacion || "",
        },
      };

  const res = await api.createLink(body);

  // Guardar los folios en el contexto global
  setSelectedFolios(foliosArray);

  // Guardar el resultado en la tabla de resultados para mostrar el link (no navegamos)
  setResults(prev => ({ ...prev, [BATCH_KEY]: res }));
      try {
        // También registrar en el índice local para que aparezca en Historial
        const INDEX_KEY = "inegi_cp_index_v1";
        const raw = localStorage.getItem(INDEX_KEY);
        const idx = raw ? (JSON.parse(raw) as any[]) : [];
        idx.push({
          token: res.token,
          // No hay examId/responsesUrl todavía para lote; guardamos metadatos
          nombreEspecialista: jefeNombre || "",
          concurso: concCode || "",
          folios: foliosArray,
          savedAt: new Date().toISOString(),
        });
        localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
      } catch {}
    } catch (e: any) {
      const serverMsg =
        e?.response?.data?.message ||
        e?.data?.message ||
        e?.message;
      setError(serverMsg || "No se pudo generar el link de lote.");
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------------ UI ----------------------------------- */

  return (
    <section className="w-full max-w-5xl bg-white rounded-3xl shadow-lg p-6 my-10 text-left">
      <h2 className="text-2xl font-bold mb-1">Generación de links por Jefe de Plaza</h2>
      <p className="text-sm text-gray-600 mb-6">
        Selecciona la <strong>convocatoria</strong> y el <strong>concurso</strong>. Luego, genera un link para cada plaza.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Convocatoria</label>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={convId}
            onChange={(e) => setConvId(e.target.value)}
          >
            <option value="">— Seleccionar —</option>
            {convocatorias.map((c) => (
              <option key={c._id} value={c._id}>
                {labelConvocatoria(c)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Concurso</label>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={concId}
            onChange={(e) => setConcId(e.target.value)}
            disabled={!convId}
          >
            <option value="">— Seleccionar —</option>
            {concursos.map((c) => (
              <option key={c._id} value={c._id}>
                {labelConcurso(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 rounded-xl bg-cyan-900 text-white shadow disabled:opacity-50"
            disabled
            title="Las plazas se listan automáticamente al elegir Convocatoria y Concurso"
          >
            Listar plazas
          </button>
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </div>

      {convId && concId && (
        <>
          {/* 🆕 Panel de generación en lote — ahora usa TODOS los folios disponibles */}
          {aspirantes.length > 0 && (
            <div className="mb-8 p-6 border-2 border-emerald-400 rounded-2xl bg-gradient-to-r from-emerald-50 to-cyan-50 shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-emerald-900 mb-1 flex items-center gap-2">
                    <span className="text-2xl">�</span>
                    Generación en Lote
                  </h3>
                  <p className="text-sm text-emerald-800 font-medium">
                    Llena el formulario <strong>una sola vez</strong> y genera documentos para todos los folios de la convocatoria.
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
                  BATCH MODE
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-4 pl-8">
                El sistema procesará automáticamente <strong>todos</strong> los folios disponibles para la convocatoria y concurso seleccionados.
              </p>

              {/* Tabla completa de plazas (igual que 'Generación Individual') colocada arriba */}
              <div className="mt-4 pl-8">
                <div className="overflow-x-auto shadow-md rounded-xl">
                  <table className="min-w-full text-left border-collapse">
                    <thead className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Plaza</th>
                        <th className="px-4 py-3 font-semibold">Puesto</th>
                        <th className="px-4 py-3 font-semibold">Unidad</th>
                        <th className="px-4 py-3 font-semibold">Jefe de plaza</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {plazas.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-4xl opacity-30">📭</span>
                                <p>No hay plazas para esta combinación.</p>
                              </div>
                            </td>
                          </tr>
                      )}

                      {plazas.map((p) => {
                        const codigo = getPlazaCodigo(p);
                        const puesto = getPuesto(p);
                        const unidad = getUnidad(p);
                        const espName = getEspecialistaNombre(p, especialistasById) || "—";

                        return (
                          <tr key={p._id} className="border-t border-gray-200 hover:bg-blue-50 transition-colors">
                                <td className="px-4 py-3 font-mono text-sm">{codigo || "—"}</td>
                                <td className="px-4 py-3 text-sm">{puesto || "—"}</td>
                                <td className="px-4 py-3 text-sm">{unidad || "—"}</td>
                                <td className="px-4 py-3 text-sm">{espName}</td>
                              </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center gap-4 pl-8">
                <div className="text-sm text-gray-600">
                  Total: <strong className="ml-1 text-emerald-700">{aspirantes.length}</strong> aspirantes disponibles
                </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleProceedWithAllFolios}
                      disabled={busy}
                      className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {busy ? 'Generando...' : 'Generar link'}
                    </button>
                  </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 mt-3 pl-8">{error}</p>
              )}

              
              {/* Mostrar link generado para el lote (igual que en la tabla inferior) */}
              {results[BATCH_KEY] && (
                <div className="mt-4 pl-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                    <a
                      className="text-blue-600 hover:text-blue-800 font-mono text-sm break-all underline decoration-2"
                      href={(results as any)[BATCH_KEY].url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {(results as any)[BATCH_KEY].url}
                    </a>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                      <button
                        className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg font-medium transition-colors"
                        onClick={() => copy((results as any)[BATCH_KEY].url)}
                        title="Copiar al portapapeles"
                      >
                        📋 Copiar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          
        </>
      )}
    </section>
  );
}