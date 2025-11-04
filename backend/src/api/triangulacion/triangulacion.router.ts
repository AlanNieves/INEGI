import { Router } from "express";
import { requireRole } from "../../middleware/requireRol";
import { mapSubmission } from "../../services/mappers/submissionToFAFE";
import { generarFA } from "../../services/fa.service";
import { generarFE } from "../../services/fe.service";

const r = Router();
r.use(requireRole("triangulacion"));

// 1) Copia de respuestas para preview
r.get("/submissions/:id/preview", async (req, res, next) => {
  try {
    const m = await mapSubmission(req.params.id);
    res.json({
      encabezado: m.encabezado,
      caso: m.caso,
      criterios: m.criterios,
      respuestasOriginales: m.raw,
    });
  } catch (e) { next(e); }
});

// 2) FA (PDF) con campos en blanco
r.get("/submissions/:id/fa", async (req, res, next) => {
  try {
    const m = await mapSubmission(req.params.id);
    const pdf = await generarFA({
      encabezado: m.encabezado,
      caso: m.caso,
      criterios: m.criterios,
    });
    const fname = `FA_${m.encabezado.convocatoria}_${m.encabezado.codigoPuesto}.pdf`.replace(/\s+/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(pdf);
  } catch (e) { next(e); }
});

// 3) FE (Excel)
r.get("/submissions/:id/fe", async (req, res, next) => {
  try {
    const m = await mapSubmission(req.params.id);
    
    // Convertir las filas al nuevo formato de casos
    const casosParaFE = [{
      aspectos: m.filas.map(fila => ({
        descripcion: fila.aspecto,
        puntaje: fila.puntajeMax
      }))
    }];
    
    const xlsx = await generarFE({ 
      encabezado: m.encabezado, 
      casos: casosParaFE 
    });
    
    const fname = `FE_${m.encabezado.convocatoria}_${m.encabezado.codigoPuesto}.xlsx`.replace(/\s+/g, "_");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(xlsx);
  } catch (e) { next(e); }
});

export default r;
