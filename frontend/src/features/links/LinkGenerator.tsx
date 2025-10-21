// src/features/links/LinkGenerator.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const { setSelectedFolios } = useFolios();
  
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [especialistas, setEspecialistas] = useState<Especialista[]>([]);
  const [aspirantes, setAspirantes] = useState<Aspirante[]>([]);

  const [convId, setConvId] = useState("");
  const [concId, setConcId] = useState("");
  const [selectedAspirantes, setSelectedAspirantes] = useState<Record<string, string>>({}); // plazaId -> aspiranteId
  
  // 🆕 Estado para multi-select de folios
  const [selectedFoliosForBatch, setSelectedFoliosForBatch] = useState<Set<string>>(new Set());

  const [busy, setBusy] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, GenResult>>({}); // plaza._id -> result

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
      setSelectedAspirantes({}); // Limpiar selecciones anteriores
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

  /* -------------------------------- Generar link ----------------------------- */

  const handleGenerate = async (plaza: Plaza) => {
    setError(null);
    
    // Validar que se haya seleccionado un aspirante
    const selectedAspiranteId = selectedAspirantes[plaza._id];
    if (!selectedAspiranteId) {
      setError("Debes seleccionar un aspirante/folio para esta plaza.");
      return;
    }
    
    const selectedAspirante = aspirantes.find(a => a._id === selectedAspiranteId);
    if (!selectedAspirante) {
      setError("Aspirante seleccionado no encontrado.");
      return;
    }

    setBusy(true);
    setBusyRow(plaza._id);

    try {
      // Códigos humanos de los selects
      const conv = convocatorias.find((c) => c._id === convId);
      const conc = concursos.find((c) => c._id === concId);

      const convCode = conv?.codigo || conv?.nombre || "";
      const concCode = conc?.codigo || conc?.nombre || "";

      const plazaCodigo = getPlazaCodigo(plaza);
      const puesto = getPuesto(plaza);
      const unidadAdministrativa = getUnidad(plaza);

      // Tomar especialista real desde la plaza + catálogo
      
      const jefeNombre = getEspecialistaNombre(plaza, especialistasById);

      if (!convId || !concId || !plazaCodigo) {
        setError("Faltan datos mínimos (convocatoria, concurso o código de plaza).");
        return;
      }

      const body: any = {
        convocatoriaId: convId, // _id/hash del select (tal como viene del catálogo)
        concursoId: concId,     // _id/hash del select
        plazaId: plazaCodigo,   // código robusto de la plaza
        aspiranteId: selectedAspirante._id, // 🆕 ID del aspirante seleccionado
        ttlHours: 48,
        prefill: {
          convocatoria: convCode,
          concurso: concCode,
          plazaCodigo,
          puesto,
          unidadAdministrativa,
          folio: selectedAspirante.folio, // 🆕 Folio del aspirante seleccionado
          jefeNombre,
          radicacion: (plaza as any).radicacion || "",
        },
      };

      // No enviamos especialistaId, el backend creará el especialista con el jefeNombre
      // que está incluido en el prefill

      const res = await api.createLink(body);
      setResults((prev) => ({ ...prev, [plaza._id]: res }));
    } catch (e: any) {
      const serverMsg =
        e?.response?.data?.message ||
        e?.data?.message ||
        e?.message;
      setError(serverMsg || "No se pudo generar el link.");
    } finally {
      setBusy(false);
      setBusyRow(null);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("¡Copiado!");
    } catch {
      const ok = window.confirm(`Copia el link manualmente:\n${text}`);
      if (ok) void 0;
    }
  };

  /* ---------------------- 🆕 Funciones de multi-select ----------------------- */

  const handleToggleFolio = (_aspiranteId: string, folio: string) => {
    setSelectedFoliosForBatch(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folio)) {
        newSet.delete(folio);
      } else {
        newSet.add(folio);
      }
      return newSet;
    });
  };

  // 🆕 Toggle inteligente: selecciona todos o deselecciona todos según el estado actual
  const handleToggleAllFolios = () => {
    const allFolios = aspirantes.map(a => a.folio);
    const allSelected = allFolios.every(folio => selectedFoliosForBatch.has(folio));
    
    if (allSelected) {
      // Si todos están seleccionados, deseleccionar todos
      setSelectedFoliosForBatch(new Set());
    } else {
      // Si no todos están seleccionados, seleccionar todos
      setSelectedFoliosForBatch(new Set(allFolios));
    }
  };

  const handleProceedWithSelectedFolios = async () => {
    if (selectedFoliosForBatch.size === 0) {
      alert("Selecciona al menos un folio para continuar");
      return;
    }

    // Necesitamos los datos del encabezado de la convocatoria/concurso seleccionados
    if (!convId || !concId) {
      alert("Selecciona una convocatoria y concurso primero");
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

      // Crear el link con los folios en el prefill
      const foliosArray = Array.from(selectedFoliosForBatch);
      const body: any = {
        convocatoriaId: convId,
        concursoId: concId,
        plazaId: plazaCodigo,
        ttlHours: 48,
        isBatch: true, // 🆕 Marcar como link de lote
        folios: foliosArray, // 🆕 Enviar los folios seleccionados
        prefill: {
          convocatoria: convCode,
          concurso: concCode,
          plazaCodigo,
          puesto,
          unidadAdministrativa,
          folio: `LOTE (${foliosArray.length} folios)`, // Indicador de lote
          jefeNombre,
          radicacion: (primeraPlaza as any).radicacion || "",
        },
      };

      const res = await api.createLink(body);
      
      // Guardar los folios en el contexto global
      setSelectedFolios(foliosArray);
      
      // Navegar al formulario con el token generado
      navigate(`/form/${res.token}`);
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
          {/* 🆕 Panel de selección múltiple de FOLIOS (independiente de plazas) */}
          {aspirantes.length > 0 && (
            <div className="mb-8 p-6 border-2 border-emerald-400 rounded-2xl bg-gradient-to-r from-emerald-50 to-cyan-50 shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-emerald-900 mb-1 flex items-center gap-2">
                    <span className="text-2xl">�</span>
                    Generación en Lote
                  </h3>
                  <p className="text-sm text-emerald-800 font-medium">
                    Llena el formulario <strong>una sola vez</strong> y genera documentos para múltiples folios
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
                  BATCH MODE
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-4 pl-8">
                Selecciona los folios de aspirantes que deseas procesar. El sistema creará un link especial que generará documentos para todos los folios seleccionados.
              </p>
              
              <div className="flex gap-3 mb-4 pl-8">
                <button
                  onClick={handleToggleAllFolios}
                  className={`px-5 py-2.5 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg ${
                    aspirantes.length > 0 && aspirantes.every(a => selectedFoliosForBatch.has(a.folio))
                      ? 'bg-gray-600 hover:bg-gray-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {aspirantes.length > 0 && aspirantes.every(a => selectedFoliosForBatch.has(a.folio))
                    ? `☐ Deseleccionar todos (${aspirantes.length})`
                    : `☑️ Seleccionar todos (${aspirantes.length})`
                  }
                </button>
                <div className="text-sm text-gray-600 flex items-center">
                  Total: <strong className="ml-1 text-emerald-700">{aspirantes.length}</strong> aspirantes disponibles
                </div>
              </div>

              {/* Lista de folios con checkboxes */}
              <div className="bg-white p-5 rounded-xl border-2 border-gray-200 shadow-sm max-h-80 overflow-y-auto mb-5 ml-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {aspirantes.map((asp) => (
                    <label
                      key={asp._id}
                      className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all border ${
                        selectedFoliosForBatch.has(asp.folio)
                          ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFoliosForBatch.has(asp.folio)}
                        onChange={() => handleToggleFolio(asp._id, asp.folio)}
                        className="w-4 h-4 cursor-pointer accent-emerald-600"
                      />
                      <span className={`text-sm ${selectedFoliosForBatch.has(asp.folio) ? 'font-semibold text-emerald-900' : 'text-gray-700'}`}>
                        {asp.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedFoliosForBatch.size > 0 && (
                <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 p-5 rounded-xl shadow-lg ml-8">
                  <div className="flex items-center justify-between">
                    <div className="text-white">
                      <p className="text-sm font-medium opacity-90 mb-1">
                        Listo para procesar
                      </p>
                      <p className="text-2xl font-bold">
                        ✅ {selectedFoliosForBatch.size} folio{selectedFoliosForBatch.size !== 1 ? 's' : ''} seleccionado{selectedFoliosForBatch.size !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={handleProceedWithSelectedFolios}
                      className="px-8 py-4 bg-white text-emerald-700 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl text-lg"
                    >
                      Continuar →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Separador visual */}
          {aspirantes.length > 0 && (
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 text-gray-500 font-medium">ó genera links individuales</span>
              </div>
            </div>
          )}

          {/* Tabla de Plazas (para generar links individuales) */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-2xl">🔗</span>
              Generación Individual por Plaza
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Genera links individuales para cada aspirante. Cada link permitirá llenar el formulario para un solo folio.
            </p>
          </div>

        <div className="overflow-x-auto shadow-md rounded-xl">
          <table className="min-w-full text-left border-collapse">
            <thead className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold">Plaza</th>
                <th className="px-4 py-3 font-semibold">Puesto</th>
                <th className="px-4 py-3 font-semibold">Unidad</th>
                <th className="px-4 py-3 font-semibold">Aspirante/Folio</th>
                <th className="px-4 py-3 font-semibold">Jefe de plaza</th>
                <th className="px-4 py-3 font-semibold">Acción</th>
                <th className="px-4 py-3 font-semibold">Link</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {plazas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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

                const result = results[p._id];

                return (
                  <tr key={p._id} className="border-t border-gray-200 hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm">{codigo || "—"}</td>
                    <td className="px-4 py-3 text-sm">{puesto || "—"}</td>
                    <td className="px-4 py-3 text-sm">{unidad || "—"}</td>
                    <td className="px-4 py-3">
                      {aspirantes.length > 0 ? (
                        <select
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                          value={selectedAspirantes[p._id] || ""}
                          onChange={(e) => setSelectedAspirantes(prev => ({
                            ...prev,
                            [p._id]: e.target.value
                          }))}
                        >
                          <option value="">Seleccionar aspirante...</option>
                          {aspirantes.map(asp => (
                            <option key={asp._id} value={asp._id}>
                              {asp.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-400 text-sm italic">Sin aspirantes</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{espName}</td>
                    <td className="px-4 py-3">
                      <button
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-sm"
                        onClick={() => handleGenerate(p)}
                        disabled={busy || busyRow === p._id || !selectedAspirantes[p._id]}
                        title={!selectedAspirantes[p._id] ? "Selecciona un aspirante primero" : "Generar link con validez de 48 horas"}
                      >
                        {busyRow === p._id ? "⏳ Generando..." : "Generar link"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {result ? (
                        <div className="flex items-center gap-2">
                          <a
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm break-all underline decoration-2"
                            href={result.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver link →
                          </a>
                          <button
                            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg font-medium transition-colors"
                            onClick={() => copy(result.url)}
                            title="Copiar al portapapeles"
                          >
                            📋 Copiar
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">Sin generar</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}