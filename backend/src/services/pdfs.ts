// backend/src/services/pdfs.ts
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";

// Registrar helpers de Handlebars
Handlebars.registerHelper('add', function(a: number, b: number) {
  return a + b;
});

Handlebars.registerHelper('range', function(start: number, end: number) {
  const result = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
});

type Aspecto = { descripcion: string; puntaje: number };
type Encabezado = {
  convocatoria: string;
  unidadAdministrativa: string;
  concurso: string;
  puesto?: string;
  codigoPuesto: string;
  folio?: string;
  modalidad: string;
  duracionMin: number | string;
  nombreEspecialista: string;
  puestoEspecialista?: string;
  fechaElaboracion: string; // YYYY-MM-DD
};

type CasoFront = {
  encabezado?: Encabezado;
  temasGuia: string;
  planteamiento: string;
  equipoAdicional?: string;
  aspectos: Aspecto[];
};

type AnswersPayload = {
  convocatoria: string;
  unidadAdministrativa: string;
  concurso: string;
  puesto: string;
  codigoPuesto: string;
  folio?: string;
  modalidad: string;
  duracionMin: number;
  nombreEspecialista: string;
  puestoEspecialista?: string;
  fechaElaboracion: string;
  casos: CasoFront[];
};

type GenerateArgs = {
  header: {
    convocatoria: string;
    unidadAdministrativa: string;
    concurso: string;
    codigoPuesto: string;
    folio?: string;
    modalidad: string;
    nombreEspecialista: string;
    duracionMin: number | string;
    fechaElaboracion: string;
    puesto?: string;
  };
  answers: AnswersPayload;
  logoSrc?: string; // override opcional
};

/** === Template inline de respaldo (por si no existe el archivo .hbs) === */
const FALLBACK_TEMPLATE = String.raw`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Estructura para Evaluación de Casos Prácticos SPC</title>
  <style>
    @page {
      size: Letter;
      margin: 0.5in;
    }
    
    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      line-height: 1.1;
      color: #000;
      background: #fff;
    }

    /* Header superior con logo a la izquierda */
    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
      font-size: 9px;
      font-weight: bold;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .logo-container {
      width: 50px;
      flex-shrink: 0;
    }

    .logo-container .inegi-logo-svg,
    .logo-container img {
      width: 100%;
      height: auto;
      max-height: 40px;
    }

    .service-text {
      font-size: 9px;
      font-weight: bold;
    }

    .header-right {
      text-align: right;
      font-size: 8px;
      line-height: 1.2;
    }

    /* Títulos centrales */
    .main-title {
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      margin: 8px 0 4px 0;
      letter-spacing: 0.3px;
    }

    .case-title {
      text-align: center;
      font-size: 9px;
      font-weight: bold;
      margin-bottom: 8px;
    }

    /* Tabla de información */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      border: 1px solid #000;
    }

    .info-table td {
      border: 1px solid #000;
      padding: 4px 6px;
      font-size: 8px;
      vertical-align: middle;
      height: 18px;
    }

    .info-table .label {
      font-weight: bold;
      background-color: #f8f8f8;
      width: 100px;
    }

    .info-table .value {
      background-color: #fff;
    }

    /* Secciones */
    .section {
      margin: 8px 0;
      border: 1px solid #000;
    }

    .section-header {
      background-color: #f8f8f8;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 9px;
      text-align: center;
      border-bottom: 1px solid #000;
    }

    .section-content {
      padding: 8px;
      min-height: 40px;
      font-size: 8px;
      line-height: 1.3;
    }

    .section-content.large {
      min-height: 80px;
    }

    /* Tabla de aspectos a evaluar - FORMATO ORIGINAL */
    .aspects-section {
      margin: 8px 0;
      border: 1px solid #000;
    }

    .aspects-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
    }

    .aspects-table th,
    .aspects-table td {
      border: 1px solid #000;
      padding: 4px;
      font-size: 8px;
      vertical-align: middle;
    }

    .aspects-table th {
      background-color: #f8f8f8;
      font-weight: bold;
      text-align: center;
    }

    .aspects-table .row-number {
      width: 25px;
      text-align: center;
      font-weight: bold;
    }

    .aspects-table .description {
      text-align: left;
      padding-left: 6px;
      border-right: none;
    }

    .aspects-table .score-header {
      width: 80px;
      text-align: center;
      font-size: 7px;
    }

    .aspects-table .score-cell {
      width: 80px;
      text-align: center;
      border-left: 1px solid #000;
    }

    /* Líneas horizontales para escribir */
    .line-fill {
      border-bottom: 1px solid #000;
      height: 20px;
      width: 100%;
    }

    .total-row {
      font-weight: bold;
      background-color: #f8f8f8;
    }

    /* Área de firma */
    .signature-area {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .signature-left {
      flex: 1;
    }

    .signature-label {
      font-size: 7px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .signature-line {
      border-top: 1px solid #000;
      width: 250px;
      margin-bottom: 3px;
    }

    .signature-name {
      font-size: 8px;
    }

    .date-section {
      text-align: right;
      font-size: 7px;
    }

    .page-number {
      text-align: center;
      font-size: 8px;
      margin-top: 15px;
    }

    .page-break { 
      page-break-before: always; 
    }
  </style>
</head>
<body>
  {{#each casos}}
  <div class="{{#if @index}}page-break{{/if}}">
    
    <!-- Header con logo a la izquierda -->
    <div class="top-header">
      <div class="header-left">
        <div class="logo-container">
          {{#if ../logoInline}}
            {{{../logoInline}}}
          {{else}}
            <img src="{{../logoSrc}}" alt="INEGI" />
          {{/if}}
        </div>
        <div class="service-text">SERVICIO PROFESIONAL DE CARRERA</div>
      </div>
      <div class="header-right">
        <div>{{enc.convocatoria}}</div>
        <div>{{enc.concurso}}</div>
        <div>{{enc.codigoPuesto}}</div>
      </div>
    </div>

    <!-- Títulos -->
    <div class="main-title">ESTRUCTURA PARA EVALUACIÓN DE CASOS PRÁCTICOS SPC</div>
    <div class="case-title">CASO PRÁCTICO {{add @index 1}}</div>

    <!-- Tabla de información -->
    <table class="info-table">
      <tr>
        <td class="label">Convocatoria:</td>
        <td class="value">{{enc.convocatoria}}</td>
        <td class="label">Unidad Administrativa:</td>
        <td class="value">{{enc.unidadAdministrativa}}</td>
      </tr>
      <tr>
        <td class="label">Concurso:</td>
        <td class="value">{{enc.concurso}}</td>
        <td class="label">Puesto:</td>
        <td class="value">Subdirección de Servicios Generales</td>
      </tr>
      <tr>
        <td class="label">Código:</td>
        <td class="value">{{enc.codigoPuesto}}</td>
        <td class="label">Dirección General de Informática:</td>
        <td class="value">Dirección General de Informática</td>
      </tr>
      <tr>
        <td class="label">Modalidad:</td>
        <td class="value">{{enc.modalidad}}</td>
        <td class="label"></td>
        <td class="value"></td>
      </tr>
    </table>

    <!-- I. Temas de la guía de estudio -->
    <div class="section">
      <div class="section-header">I. TEMAS DE LA GUÍA DE ESTUDIO</div>
      <div class="section-content">
        {{temasGuia}}
      </div>
    </div>

    <!-- II. Planteamiento del caso práctico -->
    <div class="section">
      <div class="section-header">II. PLANTEAMIENTO DEL CASO PRÁCTICO</div>
      <div class="section-content large">
        {{planteamiento}}
      </div>
    </div>

    <!-- III. Equipo adicional requerido -->
    <div class="section">
      <div class="section-header">III. EQUIPO ADICIONAL REQUERIDO PARA LA APLICACIÓN</div>
      <div class="section-content">
        {{equipoAdicional}}
      </div>
    </div>

    <!-- IV. Aspectos a evaluar - FORMATO ORIGINAL -->
    <div class="aspects-section">
      <div class="section-header">IV. ASPECTOS A EVALUAR</div>
      <table class="aspects-table">
        <thead>
          <tr>
            <th class="row-number"></th>
            <th class="description"></th>
            <th class="score-header">PUNTAJE POR<br/>CRITERIO A EVALUAR</th>
          </tr>
        </thead>
        <tbody>
          {{#each aspectos}}
          <tr>
            <td class="row-number">{{add @index 1}}</td>
            <td class="description">{{descripcion}}</td>
            <td class="score-cell">{{#if puntaje}}{{puntaje}}{{/if}}</td>
          </tr>
          {{/each}}
          
          {{#unless aspectos}}
          {{#range 1 11}}
          <tr>
            <td class="row-number">{{this}}</td>
            <td class="description"><div class="line-fill"></div></td>
            <td class="score-cell"></td>
          </tr>
          {{/range}}
          {{/unless}}
          
          <tr class="total-row">
            <td colspan="2" style="text-align: right; padding-right: 10px; font-weight: bold;">TOTAL</td>
            <td class="score-cell" style="font-weight: bold;">{{#if total}}{{total}}{{else}}0{{/if}}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Área de firma -->
    <div class="signature-area">
      <div class="signature-left">
        <div class="signature-label">NOMBRE, PUESTO Y FIRMA DE LA PERSONA ESPECIALISTA</div>
        <div class="signature-line"></div>
        <div class="signature-name">{{enc.nombreEspecialista}}</div>
      </div>
      <div class="date-section">
        <div style="font-weight: bold;">FECHA DE ELABORACIÓN</div>
        <div style="margin-top: 10px;">{{enc.fechaElaboracion}}</div>
      </div>
    </div>

    <!-- Número de página -->
    <div class="page-number">1 de 6</div>
    
  </div>
  {{/each}}
</body>
</html>`;

/** Intenta resolver el archivo de template desde varias ubicaciones comunes. */
function resolveTemplatePath(): string | null {
  const candidates = [
    path.join(process.cwd(), "templates", "respuestas.hbs"),      // backend/templates/...
    path.join(process.cwd(), "src", "templates", "respuestas.hbs"), // backend/src/templates/...
    path.join(__dirname, "../../templates/respuestas.hbs"),       // relativo desde src/services
    path.join(__dirname, "../templates/respuestas.hbs"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Busca el SVG del logo en assets (varias variantes de nombre, sin importar mayús/minús)
function tryReadLogoInline(): string | null {
  const dirs = [
    path.join(process.cwd(), "src", "assets"),
    path.join(__dirname, "..", "assets"),
  ];
  const names = [
    "Logo_INEGI_a.svg", "Logo_INEGI.svg", "Logo_INEGI_A.svg",
    "logo_inegi.svg", "LOGO_INEGI.svg"
  ];

  // 1) Intento por nombres explícitos
  for (const dir of dirs) {
    for (const name of names) {
      const p = path.join(dir, name);
      if (!fs.existsSync(p)) continue;
      try {
        let raw = fs.readFileSync(p, "utf8");

        // Asegurar xmlns en <svg>
        if (!/xmlns=/.test(raw)) {
          raw = raw.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        // Quitar width/height fijos para permitir escalado por CSS
        raw = raw.replace(/\s(width|height)="[^"]*"/gi, "");

        // Agregar una clase para estilado específico
        if (!/class=/.test(raw)) {
          raw = raw.replace("<svg", '<svg class="inegi-logo-svg"');
        } else {
          raw = raw.replace(/class="([^"]*)"/, 'class="$1 inegi-logo-svg"');
        }

        return raw;
      } catch { /* ignore and continue */ }
    }
  }

  // 2) Escaneo flexible: cualquier .svg que contenga "logo" o "inegi"
  const svgRegex = /(logo|inegi).*\.svg$/i;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      const f = files.find(x => svgRegex.test(x));
      if (!f) continue;
      let raw = fs.readFileSync(path.join(dir, f), "utf8");
      if (!/xmlns=/.test(raw)) raw = raw.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      raw = raw.replace(/\s(width|height)="[^"]*"/gi, "");
      if (!/class=/.test(raw)) raw = raw.replace("<svg", '<svg class="inegi-logo-svg"');
      else raw = raw.replace(/class="([^"]*)"/, 'class="$1 inegi-logo-svg"');
      return raw;
    } catch { /* ignore */ }
  }

  return null;
}




export async function generateResponsesPdf(args: GenerateArgs): Promise<{
  filename: string;
  contentType: string;
  data: Buffer;
}> {
  const { header, answers } = args;

  // 1) Preparar datos por caso (encabezado consolidado)
  const casos = (answers.casos ?? []).map((c) => {
    const enc: Encabezado = {
      convocatoria:
        header.convocatoria || answers.convocatoria || c.encabezado?.convocatoria || "",
      unidadAdministrativa:
        header.unidadAdministrativa || answers.unidadAdministrativa || c.encabezado?.unidadAdministrativa || "",
      concurso:
        header.concurso || answers.concurso || c.encabezado?.concurso || "",
      puesto:
        header.puesto || answers.puesto || c.encabezado?.puesto || "",
      codigoPuesto:
        header.codigoPuesto || answers.codigoPuesto || c.encabezado?.codigoPuesto || "",
      folio:
        header.folio || answers.folio || c.encabezado?.folio || "",
      modalidad:
        header.modalidad || answers.modalidad || c.encabezado?.modalidad || "",
      duracionMin:
        header.duracionMin || answers.duracionMin || c.encabezado?.duracionMin || "",
      nombreEspecialista:
        header.nombreEspecialista || answers.nombreEspecialista || c.encabezado?.nombreEspecialista || "",
      puestoEspecialista:
        answers.puestoEspecialista || c.encabezado?.puestoEspecialista || "",
      fechaElaboracion:
        header.fechaElaboracion || answers.fechaElaboracion || c.encabezado?.fechaElaboracion || "",
    };

    const aspectos = Array.isArray(c.aspectos) ? c.aspectos : [];
    const total = aspectos.reduce((acc, a) => acc + (Number(a.puntaje) || 0), 0);

    return {
      enc,
      temasGuia: c.temasGuia || "N/A",
      planteamiento: c.planteamiento || "N/A",
      equipoAdicional: c.equipoAdicional || "Ninguno",
      aspectos,
      total,
    };
  });

  // 2) Cargar template (archivo o fallback inline)
  const tplPath = resolveTemplatePath();
  const tplSource = tplPath ? fs.readFileSync(tplPath, "utf8") : FALLBACK_TEMPLATE;
  const template = Handlebars.compile(tplSource);

  // 3) Logo (inline primero; si no, fallback a URL)
  const logoInline = tryReadLogoInline();
  const logoSrc =
    args.logoSrc ||
    process.env.PDF_LOGO_URL ||
    "http://localhost:4000/inegi_logo.png"; // asegúrate de servirlo en /public

  // 4) HTML final
  const html = template({ casos, logoSrc, logoInline });

  // 5) Render PDF (opciones más tolerantes en entornos restringidos)
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBytes = await page.pdf({
    format: "Letter",
    printBackground: true,
    margin: { top: "16mm", right: "12.7mm", bottom: "18mm", left: "12.7mm" },
    preferCSSPageSize: true,
  });

  await browser.close();

  // 6) Artefacto final
  const filenameSafe = `Respuestas_Caso_Practico_${(answers.concurso || header.concurso || "caso")}.replace(/[^\w\-]+/g, "_")`;

  return {
    filename: `${filenameSafe}.pdf`,
    contentType: "application/pdf",
    data: Buffer.from(pdfBytes),
  };
}