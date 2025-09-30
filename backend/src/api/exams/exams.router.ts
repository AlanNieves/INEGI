// src/api/exams/exams.router.ts
import { Router } from "express";
import crypto from "crypto";
import Link from "../../models/Link";
import Exam from "../../models/Exam";
import { generateResponsesPdf } from "../../services/pdfs";
import { createExamSchema } from "../../schemas/exam.schema";

/** ===== Tipos que manda el front (no dependemos de normalize.ts) ===== */
type AspectoFront = { descripcion: string; puntaje: number };
type CasoFront = {
  encabezado?: any;
  temasGuia: string;           // texto largo
  planteamiento: string;       // texto largo
  equipoAdicional?: string;    // texto largo (opcional)
  aspectos: AspectoFront[];    // 1..10, cada uno 0..10
};
type EstructuraPayload = {
  convocatoria: string;
  unidadAdministrativa: string;
  concurso: string;
  puesto: string;
  codigoPuesto: string;
  modalidad: string;
  duracionMin: number;
  nombreEspecialista: string;
  puestoEspecialista?: string;
  fechaElaboracion: string;     // yyyy-mm-dd
  casos: CasoFront[];           // 1..3
};

/** ===== DTO para validar con Zod (tu exam.schema.ts) ===== */
type DTOAspecto = { nombre: string; ponderacion: number };
type DTOCaso = { nombre: string; aspectos: DTOAspecto[] };
type CreateExamDTO = {
  modalidad: string;
  duracionMin: number;
  temasGuia: string[];
  numeroCasos: number;
  casos: DTOCaso[];
};

const router = Router();

/** Utilidades locales */
const safeStr = (v: any) => (v == null ? "" : String(v));
const clamp010 = (n: any) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
};

/**
 * Normaliza el payload del front (puntajes 0..10) a DTO con ponderaciones 0..100 por caso.
 * - La suma de ponderaciones por caso queda EXACTAMENTE en 100.
 * - Si todos los puntajes de un caso son 0, se reparte 100 equitativamente.
 * - temasGuia[] sale del texto del Caso 1 (split por salto de línea, coma o punto y coma).
 */
function toCreateExamDTO(payload: EstructuraPayload): CreateExamDTO {
  const casosFront: CasoFront[] = Array.isArray(payload?.casos)
    ? payload.casos.slice(0, 3)
    : [];

  // temasGuia[] desde el texto del caso 1
  const temasArray = safeStr(casosFront[0]?.temasGuia || "")
    .split(/\r?\n|;|,/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  const casos: DTOCaso[] = casosFront.map((c, idx) => {
    const asp = Array.isArray(c.aspectos) ? c.aspectos.slice(0, 10) : [];
    const sum = asp.reduce((acc, a) => acc + clamp010(a?.puntaje), 0);

    const base: DTOAspecto[] = asp.map(a => ({
      nombre: safeStr(a?.descripcion),
      ponderacion: 0,
    }));

    if (sum > 0) {
      let total = 0;
      for (let i = 0; i < base.length; i++) {
        const val = Math.round((clamp010(asp[i].puntaje) / sum) * 100);
        base[i].ponderacion = val;
        total += val;
      }
      const diff = 100 - total;
      if (base.length > 0) base[base.length - 1].ponderacion += diff;
    } else if (base.length > 0) {
      // Todos 0 -> repartir 100 equitativamente
      const n = base.length;
      const q = Math.floor(100 / n);
      let total = 0;
      for (let i = 0; i < n; i++) {
        base[i].ponderacion = i === n - 1 ? 100 - total : q;
        total += base[i].ponderacion;
      }
    }

    return { nombre: `Caso ${idx + 1}`, aspectos: base };
  });

  return {
    modalidad: safeStr(payload?.modalidad),
    duracionMin: Math.max(1, Math.min(120, Number(payload?.duracionMin) || 1)),
    temasGuia: temasArray,
    numeroCasos: casos.length,
    casos,
  };
}

/** Busca link por token o hash (compatibilidad) */
async function findLinkByToken(token: string) {
  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex");
  let link = await Link.findOne({ tokenHash });
  if (!link) link = await Link.findOne({ token });
  return link;
}

/**
 * POST /api/exams/:token
 * - Valida el token/link
 * - Normaliza y valida con Zod el payload (puntuación total por caso = 100)
 * - Genera y guarda SOLO el PDF de respuestas (responsesPdf)
 * - Devuelve URL para descargar el PDF
 */
router.post("/:token", async (req, res) => {
  try {
    const token = safeStr(req.params.token);
    if (!token) return res.status(400).json({ error: "invalid" });

    const link = await findLinkByToken(token);
    if (!link) return res.status(400).json({ error: "invalid" });

    const now = new Date();
    if (link.expiraAt && now > link.expiraAt) {
      if (link.status !== "EXPIRED") {
        link.status = "EXPIRED";
        await link.save();
      }
      return res.status(400).json({ error: "expired" });
    }
    if (link.status === "USED" || link.usado === true) {
      return res.status(400).json({ error: "used" });
    }

    // Entrada del front
    const answers: EstructuraPayload = req.body?.answers;
    const consent = req.body?.consent ?? { accepted: false };

    // 1) Normalizar → DTO (ponderaciones suman 100 por caso)
    const dto = toCreateExamDTO(answers);

    // 2) Validar con Zod
    const parsed = createExamSchema.safeParse(dto);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation",
        details: parsed.error.flatten(),
      });
    }

    // 3) Generar PDF de respuestas (encabezado del link + textos del answers)
    const responsesPdf = await generateResponsesPdf({
      header: {
        convocatoria: link.header?.convocatoria ?? "",
        unidadAdministrativa: link.header?.unidadAdministrativa ?? "",
        concurso: link.header?.concurso ?? "",
        codigoPuesto: link.header?.codigoPuesto ?? link.header?.plazaCodigo ?? "",
        modalidad: answers?.modalidad ?? "",
        nombreEspecialista:
          link.header?.jefeNombre ??
          link.header?.nombreEspecialista ??
          answers?.nombreEspecialista ??
          "",
        duracionMin: answers?.duracionMin ?? "",
        fechaElaboracion: answers?.fechaElaboracion ?? "",
        puesto: link.header?.puesto ?? "",
      },
      answers,
    });

    // 4) Guardar examen (SOLO responsesPdf; NO FA/FE por ahora)
    const exam = await Exam.create({
      linkToken: link.token,
      convocatoriaId: link.convocatoriaId,
      concursoId: link.concursoId,
      plazaId: link.plazaId,
      especialistaId: link.especialistaId,
      header: link.header,
      answers,   // original del front (para auditoría y regenerar PDF)
      dto,       // opcional: el DTO validado (útil para reportes)
      artifacts: { responsesPdf },
      consent,
    });

    // 5) Marcar link como usado
    link.status = "USED";
    link.usado = true;
    (link as any).usadoAt = new Date();
    (link as any).submissionsCount = ((link as any).submissionsCount || 0) + 1;
    await link.save();

    // 6) URL de descarga (validada por token del link)
    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const responsesUrl = `${baseUrl}/api/exams/${exam._id}/responses.pdf?token=${encodeURIComponent(token)}`;

    return res.json({ ok: true, examId: String(exam._id), responsesUrl });
  } catch (err) {
    console.error("POST /api/exams/:token", err);
    return res.status(500).json({ error: "server-error" });
  }
});

/** GET /api/exams/:examId/responses.pdf?token=...  → Descarga segura del PDF */
router.get("/:examId/responses.pdf", async (req, res) => {
  try {
    const examId = safeStr(req.params.examId);
    const token  = safeStr(req.query.token);
    if (!examId || !token) return res.status(400).json({ error: "invalid" });

    const exam = await Exam.findById(examId).select("linkToken artifacts.responsesPdf");
    if (!exam) return res.status(404).json({ error: "not-found" });

    if (exam.linkToken !== token) return res.status(403).json({ error: "forbidden" });

    const art = (exam as any).artifacts?.responsesPdf;
    if (!art?.data) return res.status(404).json({ error: "no-artifact" });

    res.setHeader("Content-Type", art.contentType || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${art.filename || "respuestas.pdf"}"`);
    return res.send(art.data);
  } catch (err) {
    console.error("GET /api/exams/:examId/responses.pdf", err);
    return res.status(500).json({ error: "server-error" });
  }
});

export default router;
