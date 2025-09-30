// MOVER ESTE ARCHIVO AL BACKEND: backend/src/pdf/respuestas.ts
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";

type Aspecto = { descripcion: string; puntaje: number };
type Enc = {
  convocatoria: string; unidadAdministrativa: string; concurso: string;
  puesto: string; codigoPuesto: string; modalidad: string; duracionMin: number;
  nombreEspecialista: string; puestoEspecialista?: string; fechaElaboracion: string;
};
type Caso = { encabezado: Enc; temasGuia: string; planteamiento: string; equipoAdicional?: string; aspectos: Aspecto[]; };
type Respuestas = { casos: Caso[] };

const tplPath = path.join(process.cwd(), "templates", "respuestas.hbs");
const template = Handlebars.compile(fs.readFileSync(tplPath, "utf8"));

export async function buildRespuestasPDF(payload: Respuestas): Promise<Uint8Array> {
  const caso = payload.casos[0];
  const enc = caso.encabezado;
  const total = (caso.aspectos || []).reduce((a, b) => a + (Number(b.puntaje) || 0), 0);

  const html = template({
    enc,
    codigo: enc.codigoPuesto,
    temasGuia: caso.temasGuia || "N/A",
    planteamiento: caso.planteamiento || "N/A",
    equipoAdicional: caso.equipoAdicional || "Ninguno",
    aspectos: caso.aspectos || [],
    total,
  });

  // En tu versión de tipos, usa boolean:
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdf = await page.pdf({
    format: "Letter",
    printBackground: true,
    margin: { top: "14mm", right: "16mm", bottom: "14mm", left: "16mm" },
  });

  await browser.close();
  return pdf; // Uint8Array
}
