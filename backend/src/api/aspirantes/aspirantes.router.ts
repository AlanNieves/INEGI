// src/api/aspirantes/aspirantes.router.ts
import { Router } from "express";
import Aspirante from "../../models/Aspirante";

const router = Router();

/**
 * GET /api/aspirantes/_debug/ping
 * Debug endpoint para verificar conexión
 */
router.get("/_debug/ping", async (req, res) => {
  try {
    const count = await Aspirante.countDocuments();
    const sample = await Aspirante.findOne().lean();
    
    return res.json({
      ok: true,
      totalAspirantes: count,
      sampleAspirante: sample,
      collectionName: Aspirante.collection.name,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/aspirantes/by-plaza
 * Obtiene aspirantes filtrados por convocatoriaId, concursoId 
 * Query params:
 * - convocatoriaId: ID de la convocatoria
 * - concursoId: ID del concurso
 * - plazaId: (opcional) ID de la plaza para filtros adicionales
 */
router.get("/by-plaza", async (req, res, next) => {
  try {
    const { convocatoriaId, concursoId, plazaId } = req.query;

    console.log("🔍 [DEBUG] aspirantes/by-plaza params:", {
      convocatoriaId,
      concursoId,
      plazaId,
      query: req.query
    });

    if (!convocatoriaId || !concursoId) {
      return res.status(400).json({ 
        message: "convocatoriaId y concursoId son requeridos" 
      });
    }

    // Primero, necesitamos obtener los nombres/códigos de la convocatoria y concurso
    // porque el frontend envía IDs pero la tabla aspirantes puede tener IDs diferentes
    
    // Importar los modelos necesarios
    const Convocatoria = require("../../models/Convocatoria").default;
    const Concurso = require("../../models/Concurso").default;
    
    // Buscar convocatoria y concurso para obtener sus códigos/nombres
    const [convocatoria, concurso] = await Promise.all([
      Convocatoria.findById(String(convocatoriaId)).select("_id codigo nombre convocatoria").lean(),
      Concurso.findById(String(concursoId)).select("_id codigo nombre concurso").lean(),
    ]);
    
    console.log("🔍 [DEBUG] convocatoria encontrada:", { 
      _id: convocatoria?._id, 
      codigo: convocatoria?.codigo,
      nombre: convocatoria?.nombre,
      convocatoria: convocatoria?.convocatoria 
    });
    console.log("🔍 [DEBUG] concurso encontrado:", { 
      _id: concurso?._id, 
      nombre: concurso?.nombre, 
      codigo: concurso?.codigo,
      concurso: concurso?.concurso 
    });
    
    // Preparar códigos para buscar en aspirantes - probar múltiples campos
    const convocatoriaCodigo = convocatoria?.codigo || convocatoria?.nombre || convocatoria?.convocatoria || String(convocatoriaId);
    const concursoCodigo = concurso?.nombre || concurso?.codigo || concurso?.concurso || String(concursoId);
    
    console.log("🔍 [DEBUG] buscando aspirantes con códigos:", { convocatoriaCodigo, concursoCodigo });

    // Buscar aspirantes por nombres/códigos con múltiples combinaciones
    const query: any = {
      $or: [
        // Buscar por códigos/nombres exactos
        {
          convocatoriaName: convocatoriaCodigo,
          concursoName: String(concursoCodigo),
        },
        // Buscar por IDs exactos (backup)
        {
          convocatoriaId: String(convocatoriaId),
          concursoId: String(concursoId),
        },
        // Buscar con nombres alternativos si existen
        {
          convocatoriaName: convocatoria?.nombre || convocatoria?.convocatoria,
          concursoName: String(concursoCodigo),
        },
        // Buscar con cualquier variación de códigos
        {
          convocatoriaName: { $in: ["004/2024", convocatoriaCodigo, String(convocatoriaId)] },
          concursoName: { $in: [String(concursoCodigo), "109001"] },
        }
      ]
    };

    console.log("🔍 [DEBUG] query de búsqueda:", JSON.stringify(query, null, 2));

    const aspirantes = await Aspirante.find(query)
    .select("_id folio aspiranteName aspiranteNameNorm convocatoriaName concursoName convocatoriaId concursoId")
    .sort({ aspiranteName: 1 })
    .limit(100) // Limitar a 100 para evitar sobrecarga
    .lean();

    console.log("🔍 [DEBUG] aspirantes encontrados:", aspirantes.length);
    console.log("🔍 [DEBUG] primer aspirante:", aspirantes[0]);

    // Formatear respuesta para el frontend
    const formattedAspirantes = aspirantes.map(asp => ({
      _id: asp._id,
      folio: asp.folio,
      nombre: asp.aspiranteName,
      label: `${asp.folio} - ${asp.aspiranteName}`, // Para mostrar en el dropdown
    }));

    return res.json({
      total: aspirantes.length,
      aspirantes: formattedAspirantes,
    });
  } catch (error: any) {
    console.error("[aspirantes] Error:", error.message);
    return res.status(500).json({ 
      message: "Error interno del servidor",
      error: error.message 
    });
  }
});

/**
 * GET /api/aspirantes/:id
 * Obtiene un aspirante específico por ID
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const aspirante = await Aspirante.findById(id).lean();
    
    if (!aspirante) {
      return res.status(404).json({ message: "Aspirante no encontrado" });
    }

    return res.json(aspirante);
  } catch (error: any) {
    console.error("[aspirantes] Error:", error.message);
    return res.status(500).json({ 
      message: "Error interno del servidor",
      error: error.message 
    });
  }
});

export default router;