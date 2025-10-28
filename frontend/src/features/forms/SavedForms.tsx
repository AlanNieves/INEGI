import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { downloadZip } from "../../utils/downloadHelpers";

/** Claves de almacenamiento (ojo: "from" es el que ya usa tu form) */
const FORM_KEY = (token: string) => `inegi_cp_from_v2:${token}`;
const INDEX_KEY = "inegi_cp_index_v1";

type IndexItem = {
  token: string;
  examId?: string;
  responsesUrl?: string;
  nombreEspecialista?: string;
  concurso?: string;
  savedAt: string; // ISO
};

type Encabezado = {
  convocatoria: string;
  unidadAdministrativa: string;
  concurso: string;
  puesto: string;
  codigoPuesto: string;
  modalidad: string;
  duracionMin: number;
  nombreEspecialista?: string;
  puestoEspecialista?: string;
  fechaElaboracion: string;
};
type Aspecto = { descripcion: string; puntaje: number };
type Caso = {
  encabezado: Encabezado;
  temasGuia: string;
  planteamiento: string;
  equipoAdicional?: string;
  aspectos: Aspecto[];
};
type Estructura = Encabezado & { casos: Caso[] };

function readIndex(): IndexItem[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeIndex(items: IndexItem[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(items));
}

function readFormByToken(token: string): Estructura | null {
  try {
    const raw = localStorage.getItem(FORM_KEY(token));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.casos || !Array.isArray(data.casos) || data.casos.length === 0) return null;
    return data as Estructura;
  } catch {
    return null;
  }
}

export default function SavedForms() {
  const [items, setItems] = useState<IndexItem[]>([]);
  const [busyToken, setBusyToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(readIndex());
  }, []);

  const rows = useMemo(() => {
    return items
      .map((it) => {
        const form = readFormByToken(it.token);
        return {
          ...it,
          form,
          ok: !!form && Array.isArray(form.casos) && form.casos.length > 0,
        };
      })
      // más reciente arriba
      .sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
  }, [items]);

  const handleDelete = (token: string) => {
    const next = items.filter((x) => x.token !== token);
    writeIndex(next);
    setItems(next);
  };

  const handleFA = async (token: string) => {
    setError(null);
    const form = readFormByToken(token);
    if (!form) {
      setError("No encontré el formulario en este navegador.");
      return;
    }
    try {
      setBusyToken(token);
      const payload = {
        pagesPerCase: 2,
        casos: form.casos.map((c) => ({
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
        throw new Error(`FA — ${res.status} ${res.statusText} — ${errText}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FA_${form.concurso || "formulario"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "No se pudo generar FA.");
    } finally {
      setBusyToken(null);
    }
  };

  const handleFE = async (token: string) => {
    setError(null);
    const form = readFormByToken(token);
    if (!form) {
      setError("No encontré el formulario en este navegador.");
      return;
    }
    try {
      setBusyToken(token);
      const payload = {
        casos: form.casos.map((c) => ({
          encabezado: c.encabezado,
          planteamiento: c.planteamiento,
          aspectos: c.aspectos, // Incluir aspectos para FE
        })),
      };
      const res = await fetch("/api/fe/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        const errText = ct.includes("application/json") ? JSON.stringify(await res.json()) : await res.text();
        throw new Error(`FE — ${res.status} ${res.statusText} — ${errText}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FE_${form.concurso || "formulario"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "No se pudo generar FE.");
    } finally {
      setBusyToken(null);
    }
  };

  const handleRespuestas = async (token: string) => {
    setError(null);
    const form = readFormByToken(token);
    if (!form) {
      setError("No encontré el formulario en este navegador.");
      return;
    }

    // Buscar el item en el índice para obtener examId y responsesUrl
    const indexItem = items.find(item => item.token === token);
    if (!indexItem?.examId || !indexItem?.responsesUrl) {
      setError("No se encontró información de descarga para este formulario.");
      return;
    }

    try {
      setBusyToken(token);
      const res = await fetch(indexItem.responsesUrl);
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("application/pdf")) {
        const errText = ct.includes("application/json") ? JSON.stringify(await res.json()) : await res.text();
        throw new Error(`Respuestas — ${res.status} ${res.statusText} — ${errText}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Respuestas_${form.concurso || "formulario"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "No se pudo descargar el PDF de Respuestas.");
    } finally {
      setBusyToken(null);
    }
  };

  const handleArtefacts = async (token: string) => {
    setError(null);
    const form = readFormByToken(token);
    if (!form) {
      setError("No encontré el formulario en este navegador.");
      return;
    }

    try {
      setBusyToken(token);

      // Preferir folios guardados en el índice (si existen)
      const indexItem = items.find(it => it.token === token) as any | undefined;
      let folios: string[] = [];
      if (indexItem && Array.isArray(indexItem.folios) && indexItem.folios.length > 0) {
        folios = indexItem.folios.map((f: any) => String(f));
      } else {
        // Construir lista de folios desde los casos (si hay varios)
        folios = (form.casos || []).map((c: any) => c?.encabezado?.folio).filter((f: any) => !!f);
      }

      // Si los folios son placeholders tipo "LOTE (N folios)" o no existen,
      // intentar recuperar la lista real de folios desde el prefill del link
      // o desde el catálogo de aspirantes usando convocatoria/concurso.
      const looksLikeLote = (arr: string[]) => arr.length === 0 || arr.some(s => typeof s === 'string' && s.toUpperCase().includes('LOTE'));

      if (looksLikeLote(folios)) {
        try {
          // Intentar prefill (puede contener info de folios o datos para buscar aspirantes)
          const prefill = await api.prefillExam((rows.find(it => it.token === token) || {}).token || token);

          // prefill puede traer campos útiles
          const maybeFolios = (prefill as any)?.header?.folios || (prefill as any)?.folios || (prefill as any)?.header?.folioList;
          if (Array.isArray(maybeFolios) && maybeFolios.length > 0) {
            folios = maybeFolios.map((f: any) => String(f));
          } else {
            // Si no hay folios explícitos, intentar obtener aspirantes por convocatoria/concurso
            const conv = (prefill as any)?.header?.convocatoria || form.convocatoria || form.casos?.[0]?.encabezado?.convocatoria;
            const conc = (prefill as any)?.header?.concurso || form.concurso || form.casos?.[0]?.encabezado?.concurso;
            if (conv && conc) {
              try {
                const aspirantes = await api.listAspirantes(conv, conc);
                if (Array.isArray(aspirantes) && aspirantes.length > 0) {
                  folios = aspirantes.map((a: any) => a.folio).filter((f: any) => !!f);
                }
              } catch {}
            }
          }
        } catch (err) {
          // no crítico, seguimos y mostraremos error si no tenemos folios
        }
      }

      if (folios.length === 0) {
        setError("No encontré folios válidos en el formulario para generar artefactos. Si este formulario fue creado como lote, genera el ZIP desde el panel de Lote.");
        return;
      }

      const header = {
        convocatoria: (form as any).convocatoria || "",
        concurso: (form as any).concurso || "",
        unidadAdministrativa: (form as any).unidadAdministrativa || "",
        puesto: (form as any).puesto || "",
      };

      const payload = { casos: form.casos, folios, header };
      const blob = await api.generarArtefactosLote(payload as any);
      const ts = Date.now();
      await downloadZip(blob, `ARTIFACTS_${token}_${ts}.zip`);
    } catch (e: any) {
      setError(e?.message || "No se pudieron generar los artefactos.");
    } finally {
      setBusyToken(null);
    }
  };

  if (rows.length === 0) {
    return (
      <section className="w-full max-w-5xl mt-8">
        <h2 className="text-xl font-semibold text-cyan-900">Formularios generados</h2>
        <p className="text-sm text-gray-600 mt-1">Aún no hay envíos registrados en este navegador.</p>
      </section>
    );
  }

  return (
    <section className="w-full max-w-5xl mt-8">
      <h2 className="text-xl font-semibold text-cyan-900">Formularios generados</h2>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      <div className="mt-3 divide-y rounded-2xl border border-cyan-100 bg-white/60 overflow-hidden">
        {rows.map((r) => (
          <div key={r.token} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-medium text-cyan-900">
                Formulario — {r.nombreEspecialista || r.form?.nombreEspecialista || "Especialista"}
              </div>
              <div className="text-sm text-gray-600">
                {r.concurso || r.form?.concurso || "Concurso"} · {new Date(r.savedAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFA(r.token)}
                disabled={!r.ok || busyToken === r.token}
                className="px-3 py-2 rounded-xl border border-cyan-300 text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"
                title="Descargar FA"
              >
                FA
              </button>
              <button
                onClick={() => handleFE(r.token)}
                disabled={!r.ok || busyToken === r.token}
                className="px-3 py-2 rounded-xl border border-cyan-300 text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"
                title="Descargar FE"
              >
                FE
              </button>
              <button
                onClick={() => handleArtefacts(r.token)}
                disabled={!r.ok || busyToken === r.token}
                className="px-3 py-2 rounded-xl border border-cyan-300 text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"
                title="Descargar artefactos (ZIP)"
              >
                Artefactos
              </button>
              <button
                onClick={() => handleRespuestas(r.token)}
                disabled={busyToken === r.token}
                className="px-3 py-2 rounded-xl border border-cyan-300 text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"
                title="Descargar PDF de Respuestas"
              >
                Respuestas
              </button>
              <button
                onClick={() => handleDelete(r.token)}
                className="px-3 py-2 rounded-xl border border-red-300 text-red-700 hover:bg-red-50"
                title="Quitar de la lista"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Nota: la lista se guarda en este navegador; no borro el formulario interno al eliminar la entrada (solo quito del índice).
      </p>
    </section>
  );
}
