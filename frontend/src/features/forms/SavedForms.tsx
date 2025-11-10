import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

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

      // Usar fetch directo para poder inspeccionar mejor la respuesta y el content-type
      const res = await fetch("/api/artifacts/generar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        const errText = ct.includes("application/json") ? JSON.stringify(await res.json()) : await res.text();
        throw new Error(`Artefactos — ${res.status} ${res.statusText} — ${errText}`);
      }

      // Esperamos un blob ZIP
      const blob = await res.blob();
      const ts = Date.now();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ARTIFACTS_${token}_${ts}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "No se pudieron generar los artefactos.");
    } finally {
      setBusyToken(null);
    }
  };

  if (rows.length === 0) {
    return (
      <section className="w-full max-w-5xl mt-8 darkmode-savedforms">
        <h2 className="text-xl font-semibold text-slate-100">Formularios generados</h2>
        <p className="text-sm text-slate-300 mt-1">Aún no hay envíos registrados en este navegador.</p>
        <style>{darkmodeStyles}</style>
      </section>
    );
  }

  return (
    <section
      className="w-full max-w-5xl mx-auto my-10 p-8 rounded-3xl shadow-xl glass-panel"
    >
      <h2 className="text-xl font-semibold text-slate-100">Formularios generados</h2>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

      <div className="mt-3 divide-y rounded-2xl border border-slate-900 bg-[#0a101a]/80 overflow-hidden shadow-xl">
        {rows.map((r) => (
          <div key={r.token} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-[#0a1a2f]/80 to-[#0a223f]/70 hover:from-[#0e223a]/90 hover:to-[#0a2a4f]/80 transition">
            <div>
              <div className="font-medium text-slate-100">
                Formulario — {r.nombreEspecialista || r.form?.nombreEspecialista || "Especialista"}
              </div>
              <div className="text-sm text-slate-300">
                {r.concurso || r.form?.concurso || "Concurso"} · {new Date(r.savedAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.href = `/form/${r.token}?edit=true`}
                disabled={!r.ok}
                className="px-3 py-2 rounded-xl border border-blue-400 text-blue-100 bg-blue-900/30 hover:bg-blue-800/60 shadow transition disabled:opacity-50"
                title="Editar formulario"
              >
                Editar
              </button>
              <button
                onClick={() => handleArtefacts(r.token)}
                disabled={!r.ok || busyToken === r.token}
                className="px-3 py-2 rounded-xl border border-slate-400 text-slate-100 bg-slate-900/30 hover:bg-slate-800/60 shadow transition disabled:opacity-50"
                title="Descargar formularios (ZIP)"
              >
                Descargar Formularios
              </button>
              <button
                onClick={() => handleDelete(r.token)}
                className="px-3 py-2 rounded-xl border border-red-400 text-red-200 bg-red-900/30 hover:bg-red-800/60 shadow transition"
                title="Quitar de la lista"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <style>{darkmodeStyles}</style>
    </section>
  );
}

const darkmodeStyles = `
.darkmode-savedforms {
  background: linear-gradient(120deg, #0a1624 0%, #0a223f 100%);
  color: #e6eef9;
  border-radius: 24px;
  box-shadow: 0 8px 40px rgba(14,165,233,0.10), 0 1px 0 rgba(255,255,255,0.02);
  padding-bottom: 32px;
}
.darkmode-savedforms h2 {
  color: #cbd5e1;
  text-shadow: 0 2px 16px #64748bcc;
}
.darkmode-savedforms .divide-y > * + * {
  border-top: 1px solid rgba(59,130,246,0.10);
}
`;
