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

// Actualiza la ruta para usar process.cwd() y asegurar ruta absoluta
const LOGO_PATH = path.join(process.cwd(), 'src', 'assets', 'Logo_INEGI_a.svg');
const svgContent = fs.readFileSync(LOGO_PATH, 'utf8');
const logoInline = svgContent
  .replace(/\n/g, ' ') // quitar saltos de línea
  .replace(/<!--.*?-->/g, '') // quitar comentarios
  .replace(/<\?xml.*?\?>/, '') // quitar declaración XML
  .replace(/<!DOCTYPE.*?>/, '') // quitar DOCTYPE
  .replace(/xmlns:xlink=".*?"/, '') // quitar namespace xlink
  .replace(/version="1.0"/, '') // quitar versión
  .replace(/width=".*?"/, 'width="220"') // fijar ancho
  .replace(/height=".*?"/, 'height="66"') // fijar alto
  .replace('<svg', '<svg class="inegi-logo-svg"'); // añadir clase



export async function buildRespuestasPDF(payload: Respuestas): Promise<Uint8Array> {
  const caso = payload.casos[0];
  const enc = caso.encabezado;
  const total = (caso.aspectos || []).reduce((a, b) => a + (Number(b.puntaje) || 0), 0);

  const html = template({
    casos: [{
      enc,
      temasGuia: caso.temasGuia || "N/A",
      planteamiento: caso.planteamiento || "N/A",
      equipoAdicional: caso.equipoAdicional || "Ninguno",
      aspectos: caso.aspectos || [],
      total
    }],
    logoInline
  });

  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox'] 
  });
  
  const page = await browser.newPage();

  await page.setViewport({
    width: 1200,
    height: 1600,
    deviceScaleFactor: 2,
  })
  await page.setContent(html, { 
    waitUntil: ['load', 'networkidle0']
  });

  // Asegurarse que el SVG se renderice
  await page.waitForSelector('.inegi-logo-svg', { timeout: 5000 });

  const pdf = await page.pdf({
    format: "Letter",
    printBackground: true,
    margin: { top: "14mm", right: "16mm", bottom: "14mm", left: "16mm" },
  });

  await browser.close();
  return pdf; // Uint8Array
}
