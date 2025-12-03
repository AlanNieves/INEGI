// src/features/links/LinkGenerator.tsx
import { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import { api } from "../../lib/api";
import { useFolios } from "../../contexts/FoliosContext";
import GlassDropdown from "./components/GlassDropdown";

/* ---------------------------- Tipos (flexibles) ---------------------------- */

type Convocatoria = {
  _id: string;
  nombre: string;
};

type Concurso = {
  _id: string;
  concurso_id: string;
  convocatoria_id: string;
  convocatoria: string;
  nombre: number;
};

type Plaza = {
  _id: string;
  convocatoriaId?: string;
  concursoId?: string;
  codigoPlaza?: string;
  codigo?: string;
  plaza?: string;
  code?: string;
  clave?: string;
  puesto?: string;
  puestoNombre?: string;
  unidadAdministrativa?: string;
  unidad_adm?: string;
  radicacion?: string;
  especialistaId?: string;
  especialista_id?: string;
  especialistaNombre?: string;
};

type Especialista = {
  _id: string;
  nombre: string;
  correo?: string;
  puesto?: string;
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
    (id ? map[id]?.nombre : "") ||
    ""
  );
}
function labelConcurso(c: Concurso) {
  return String(c.nombre) || c._id;
}
function labelConvocatoria(c: Convocatoria) {
  return c.nombre || c._id;
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, GenResult>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownHeight, setDropdownHeight] = useState(0);

  // Ref para evitar que se guarde doble en el historial (debido a React.StrictMode)
  const hasBeenSavedToHistory = useRef(false);

  // Cuando el dropdown está abierto, mide su alto
  useLayoutEffect(() => {
    function updateHeight() {
      if (dropdownOpen && dropdownRef.current) {
        setDropdownHeight(dropdownRef.current.offsetHeight);
      } else {
        setDropdownHeight(0);
      }
    }
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [dropdownOpen]);

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

  useEffect(() => {
    (async () => {
      setPlazas([]);
      setAspirantes([]);
      if (!convId || !concId) return;
      
      // Cargando datos
      
      try {
        const [plazasData, aspirantesData] = await Promise.all([
          api.listPlazas(convId, concId),
          api.listAspirantes(convId, concId),
        ]);
        
        setPlazas(plazasData as any);
        setAspirantes(aspirantesData);
      } catch (e: any) {
        console.error('❌ LinkGenerator - Error cargando datos:', e);
        setError(e?.message || "Error cargando plazas/aspirantes.");
      }
    })();
  }, [convId, concId]);

  const especialistasById = useMemo(() => {
    const map: Record<string, Especialista> = {};
    for (const e of especialistas) {
      if (e?._id) map[e._id] = e;
    }
    return map;
  }, [especialistas]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("¡Copiado!");
    } catch {
      const ok = window.confirm(`Copia el link manualmente:\n${text}`);
      if (ok) void 0;
    }
  };

  const handleProceedWithAllFolios = async () => {
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
      const conv = convocatorias.find((c) => c._id === convId);
      const conc = concursos.find((c) => c._id === concId);
      const convCode = conv?.nombre || "";
      const concCode = String(conc?.nombre || "");
      const primeraPlaza = plazas[0];
      if (!primeraPlaza) {
        setError("No hay plazas disponibles");
        return;
      }
      const plazaCodigo = getPlazaCodigo(primeraPlaza);
      const puesto = getPuesto(primeraPlaza);
      const unidadAdministrativa = getUnidad(primeraPlaza);
      const jefeNombre = getEspecialistaNombre(primeraPlaza, especialistasById);
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
      setSelectedFolios(foliosArray);
      setResults(prev => ({ ...prev, [BATCH_KEY]: res }));

      // Guardar en el historial SOLO si no se ha guardado antes (evita duplicados por StrictMode)
      if (!hasBeenSavedToHistory.current) {
        hasBeenSavedToHistory.current = true;
        try {
          const INDEX_KEY = "inegi_cp_index_v1";
          const raw = localStorage.getItem(INDEX_KEY);
          const idx = raw ? (JSON.parse(raw) as any[]) : [];
          // Verificar si ya existe este token para evitar duplicados
          const existingIndex = idx.findIndex((item: any) => item.token === res.token);
          if (existingIndex === -1) {
            // Solo agregar si no existe
            idx.push({
              token: res.token,
              nombreEspecialista: jefeNombre || "",
              concurso: concCode || "",
              folios: foliosArray,
              savedAt: new Date().toISOString(),
            });
            localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
          }
        } catch {}
      }
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

  return (
    <section
      className="w-full max-w-5xl mx-auto my-10 p-8 rounded-3xl shadow-xl glass-panel"
      style={{
        transition: "margin-bottom 0.6s cubic-bezier(.4,2,.6,1)",
        marginBottom: dropdownHeight ? dropdownHeight + 240 : 0, // <-- Aumenta aquí (prueba 240)
      }}
    >
      <h2 className="text-2xl font-bold mb-1 text-cyan-100">Generación de links por Jefe de Plaza</h2>
      <p className="text-sm text-cyan-300 mb-6">
        Selecciona la <strong>convocatoria</strong> y el <strong>concurso</strong>. Luego, genera un link para cada plaza.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
        <div ref={dropdownRef}>
          <GlassDropdown
            label="Convocatoria"
            value={convId}
            options={[
              { value: "", label: "— Seleccionar —" },
              ...convocatorias.map((c) => ({
                value: c._id,
                label: labelConvocatoria(c),
              })),
            ]}
            onChange={setConvId}
            onOpenChange={setDropdownOpen}
          />
        </div>
        <GlassDropdown
          label="Concurso"
          value={concId}
          options={[
            { value: "", label: "— Seleccionar —" },
            ...concursos.map((c) => ({
              value: c._id,
              label: labelConcurso(c),
            })),
          ]}
          onChange={setConcId}
          disabled={!convId}
          onOpenChange={setDropdownOpen} // PASA EL HANDLER
        />
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 rounded-xl bg-cyan-900 text-cyan-100 shadow disabled:opacity-50"
            disabled
            title="Las plazas se listan automáticamente al elegir Convocatoria y Concurso"
          >
            Listar plazas
          </button>
          {error && <span className="text-cyan-300 text-sm">{error}</span>}
        </div>
      </div>

      {convId && concId && (
        <>
          <div className="glass-table-container open">
            <div className="mb-8 p-6 glass-table">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-cyan-100 mb-2">
                  Plazas Disponibles
                </h3>
                <p className="text-sm text-cyan-200">
                  Información de las plazas y jefes de plaza para la generación del link.
                </p>
              </div>

              <div className="mt-4">
                <div className="overflow-x-auto shadow-md rounded-xl">
                  <table className="min-w-full text-left border-collapse">
                    <thead className="bg-gradient-to-r from-cyan-800 to-cyan-600 text-cyan-100 text-sm">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Plaza</th>
                        <th className="px-4 py-3 font-semibold">Puesto</th>
                        <th className="px-4 py-3 font-semibold">Unidad</th>
                        <th className="px-4 py-3 font-semibold">Jefe de plaza</th>
                      </tr>
                    </thead>
                    <tbody className="bg-[#0a1624]/60">
                      {plazas.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-cyan-400">
                            <div className="flex flex-col items-center gap-2">
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
                          <tr key={p._id} className="border-t border-cyan-900/40 hover:bg-cyan-900/20 transition-colors">
                            <td className="px-4 py-3 font-mono text-sm text-cyan-100">{codigo || "—"}</td>
                            <td className="px-4 py-3 text-sm text-cyan-100">{puesto || "—"}</td>
                            <td className="px-4 py-3 text-sm text-cyan-100">{unidad || "—"}</td>
                            <td className="px-4 py-3 text-sm text-cyan-100">{espName}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-cyan-300">
                  Total: <strong className="ml-1 text-cyan-100">{aspirantes.length}</strong> aspirantes disponibles
                </div>
                <button
                  onClick={handleProceedWithAllFolios}
                  disabled={busy || aspirantes.length === 0}
                  className="px-6 py-3 bg-cyan-700 text-cyan-100 font-semibold rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed shadow"
                >
                  {busy ? 'Generando...' : 'Generar link'}
                </button>
              </div>

              {error && (
                <p className="text-sm text-cyan-300 mt-3">{error}</p>
              )}

              {results[BATCH_KEY] && (
                <div className="mt-4 p-4 bg-cyan-900/20 rounded-lg border border-cyan-700/30">
                  <p className="text-xs text-cyan-300 mb-2">Link generado:</p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <a
                      className="text-cyan-300 hover:text-cyan-100 font-mono text-sm break-all underline decoration-2"
                      href={(results as any)[BATCH_KEY].url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {(results as any)[BATCH_KEY].url}
                    </a>
                    <button
                      className="text-xs px-4 py-2 bg-cyan-900 hover:bg-cyan-800 border border-cyan-700 rounded-lg font-medium transition-colors text-cyan-100 whitespace-nowrap"
                      onClick={() => copy((results as any)[BATCH_KEY].url)}
                      title="Copiar al portapapeles"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      <style>{`
        .darkmode-linkgen {
          background: linear-gradient(120deg, #0a1624 0%, #0a223f 100%);
          color: #e6eef9;
          border-radius: 24px;
          box-shadow: 0 8px 40px rgba(14,165,233,0.10), 0 1px 0 rgba(255,255,255,0.02);
        }
        .darkmode-linkgen h2 {
          color: #bfe0ff;
          text-shadow: 0 2px 16px #3b82f6cc;
        }
        .glass-panel {
          background: rgba(18, 28, 48, 0.72);
          border: 1.5px solid rgba(80, 180, 255, 0.09);
          box-shadow: 0 8px 40px rgba(14,165,233,0.10), 0 1px 0 rgba(255,255,255,0.02);
          backdrop-filter: blur(18px) saturate(120%);
          -webkit-backdrop-filter: blur(18px) saturate(120%);
          border-radius: 24px;
          transition: box-shadow 0.2s;
        }
        .btn-glass {
          background: rgba(30, 40, 60, 0.85);
          color: #e6eef9;
          border: 1.5px solid rgba(80, 180, 255, 0.13);
          border-radius: 12px;
          padding: 10px 22px;
          font-weight: 600;
          transition: background 0.18s, border 0.18s;
        }
        .btn-glass:hover {
          background: rgba(40, 60, 90, 0.92);
          border-color: #3b82f6;
        }
        .glass-table-container {
          overflow: visible;
          max-height: 0;
          opacity: 0;
          transform: translateY(-16px) scaleY(0.98);
          transition: max-height 0.7s cubic-bezier(.4,2,.6,1), opacity 0.5s, transform 0.5s;
        }
        .glass-table-container.open {
          max-height: 1200px;
          opacity: 1;
          transform: translateY(0) scaleY(1);
        }
        .glass-table {
          background: rgba(18, 28, 48, 0.68);
          border: 1.5px solid rgba(80, 180, 255, 0.09);
          box-shadow: 0 4px 32px rgba(14,165,233,0.08);
          backdrop-filter: blur(16px) saturate(120%);
          -webkit-backdrop-filter: blur(16px) saturate(120%);
          border-radius: 20px;
        }
      `}</style>
    </section>
  );
}