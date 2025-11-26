// src/api/aspirantes/aspirantes.router.ts
import { Router } from "express";
import Aspirante from "../../models/Aspirante";
import Convocatoria from "../../models/Convocatoria";
import Concurso from "../../models/Concurso";

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

    console.log("🔍 [aspirantes/by-plaza] Parámetros recibidos:", {
      convocatoriaId,
      concursoId,
      plazaId
    });

    if (!convocatoriaId || !concursoId) {
      return res.status(400).json({ 
        message: "convocatoriaId y concursoId son requeridos" 
      });
    }

    // Buscar directamente por los IDs - forma más simple
    const query: any = {
      convocatoriaId: String(convocatoriaId),
      concursoId: String(concursoId)
    };

    console.log("🔍 [aspirantes/by-plaza] Query:", query);

    const aspirantes = await Aspirante.find(query)
      .select("_id folio aspiranteName convocatoriaId concursoId")
      .sort({ folio: 1 })
      .limit(200)
      .lean();

    console.log(`🔍 [aspirantes/by-plaza] Encontrados: ${aspirantes.length}`);
    if (aspirantes.length > 0) {
      console.log("🔍 [aspirantes/by-plaza] Primer resultado:", aspirantes[0]);
    }

    // Formatear respuesta
    const formattedAspirantes = aspirantes.map(asp => ({
      _id: String(asp._id),
      folio: asp.folio,
      aspiranteName: asp.aspiranteName,
      nombre: asp.aspiranteName,
      label: `${asp.folio} - ${asp.aspiranteName}`,
      convocatoriaId: asp.convocatoriaId,
      concursoId: asp.concursoId,
    }));

    return res.json({
      total: aspirantes.length,
      aspirantes: formattedAspirantes,
    });
  } catch (error: any) {
    console.error("[aspirantes/by-plaza] Error completo:", error);
    console.error("[aspirantes/by-plaza] Stack:", error.stack);
    return res.status(500).json({ 
      message: "Error al buscar aspirantes",
      error: error.message,
      details: error.stack
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

/**
 * POST /api/aspirantes
 * Crear nuevo aspirante
 */
router.post("/", async (req, res, next) => {
  try {
    const { 
      convocatoriaId, 
      concursoId, 
      plazaId,
      folio, 
      aspiranteName,
      convocatoriaName,
      concursoName 
    } = req.body;

    // Validaciones
    if (!folio || !folio.trim()) {
      return res.status(400).json({ message: "El folio es requerido" });
    }

    if (!aspiranteName || !aspiranteName.trim()) {
      return res.status(400).json({ message: "El nombre del aspirante es requerido" });
    }

    if (!convocatoriaId || !concursoId) {
      return res.status(400).json({ message: "Convocatoria y concurso son requeridos" });
    }

    // Verificar que el folio no exista
    const existingFolio = await Aspirante.findOne({ folio: folio.trim() });
    if (existingFolio) {
      return res.status(400).json({ message: "El folio ya existe" });
    }

    const newAspirante = new Aspirante({
      convocatoriaId,
      concursoId,
      plazaId: plazaId || undefined,
      folio: folio.trim(),
      aspiranteName: aspiranteName.trim(),
      aspiranteNameNorm: aspiranteName.trim().toLowerCase(),
      convocatoriaName: convocatoriaName?.trim() || convocatoriaId,
      concursoName: concursoName?.trim() || concursoId,
    });

    await newAspirante.save();

    return res.status(201).json({
      _id: String(newAspirante._id),
      convocatoriaId: newAspirante.convocatoriaId,
      concursoId: newAspirante.concursoId,
      plazaId: newAspirante.plazaId,
      folio: newAspirante.folio,
      aspiranteName: newAspirante.aspiranteName,
      convocatoriaName: newAspirante.convocatoriaName,
      concursoName: newAspirante.concursoName,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "El folio ya existe" });
    }
    console.error("[aspirantes] Error:", error.message);
    return res.status(500).json({ 
      message: "Error interno del servidor",
      error: error.message 
    });
  }
});

/**
 * PUT /api/aspirantes/:id
 * Actualizar aspirante existente
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      convocatoriaId, 
      concursoId, 
      plazaId,
      folio, 
      aspiranteName,
      convocatoriaName,
      concursoName 
    } = req.body;

    // Validaciones
    if (!folio || !folio.trim()) {
      return res.status(400).json({ message: "El folio es requerido" });
    }

    if (!aspiranteName || !aspiranteName.trim()) {
      return res.status(400).json({ message: "El nombre del aspirante es requerido" });
    }

    if (!convocatoriaId || !concursoId) {
      return res.status(400).json({ message: "Convocatoria y concurso son requeridos" });
    }

    // Verificar que el folio no exista en otro aspirante
    const existingFolio = await Aspirante.findOne({ 
      folio: folio.trim(),
      _id: { $ne: id }
    });
    
    if (existingFolio) {
      return res.status(400).json({ message: "El folio ya existe en otro aspirante" });
    }

    const updated = await Aspirante.findByIdAndUpdate(
      id,
      {
        convocatoriaId,
        concursoId,
        plazaId: plazaId || undefined,
        folio: folio.trim(),
        aspiranteName: aspiranteName.trim(),
        aspiranteNameNorm: aspiranteName.trim().toLowerCase(),
        convocatoriaName: convocatoriaName?.trim() || convocatoriaId,
        concursoName: concursoName?.trim() || concursoId,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Aspirante no encontrado" });
    }

    return res.json({
      _id: String(updated._id),
      convocatoriaId: updated.convocatoriaId,
      concursoId: updated.concursoId,
      plazaId: updated.plazaId,
      folio: updated.folio,
      aspiranteName: updated.aspiranteName,
      convocatoriaName: updated.convocatoriaName,
      concursoName: updated.concursoName,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "El folio ya existe" });
    }
    console.error("[aspirantes] Error:", error.message);
    return res.status(500).json({ 
      message: "Error interno del servidor",
      error: error.message 
    });
  }
});

/**
 * DELETE /api/aspirantes/:id
 * Eliminar aspirante
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { confirmacion } = req.body;

    // Validar confirmación
    if (confirmacion !== 'DELETE') {
      return res.status(400).json({ 
        message: 'Debe escribir DELETE para confirmar la eliminación' 
      });
    }

    const deleted = await Aspirante.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Aspirante no encontrado" });
    }

    return res.status(204).send();
  } catch (error: any) {
    console.error("[aspirantes] Error:", error.message);
    return res.status(500).json({ 
      message: "Error interno del servidor",
      error: error.message 
    });
  }
});

export default router;