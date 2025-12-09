// src/api/concursos/concursos.router.ts
import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Concurso from '../../models/Concurso';
import { sanitizeString } from '../../middleware/validateRequest';

const router = Router();

/* ---------- GET - Listar todos los concursos ---------- */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { convocatoriaId } = req.query as { convocatoriaId?: string };

    let filter: any = {};
    if (convocatoriaId) {
      filter = {
        $or: [
          { convocatoriaId },
          { convId: convocatoriaId },
          { convocatoria_id: convocatoriaId },
          { convocatoria: convocatoriaId },
        ],
      };
    }

    const concursos = await Concurso.collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.set('Cache-Control', 'no-store');

    const out = concursos.map((conc: any) => ({
      _id: String(conc._id),
      concurso_id: String(conc.concurso_id || ''),
      convocatoria_id: String(conc.convocatoria_id || ''),
      convocatoria: String(conc.convocatoria || ''),
      nombre: Number(conc.nombre) || 0,
    }));

    return res.json(out);
  } catch (err) {
    next(err);
  }
});

/* ---------- GET /:id - Obtener un concurso por ID ---------- */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const concurso = await Concurso.findById(id).lean();

    if (!concurso) {
      return res.status(404).json({ message: 'Concurso no encontrado' });
    }

    return res.json({
      _id: String(concurso._id),
      concurso_id: String((concurso as any).concurso_id || ''),
      convocatoria_id: String((concurso as any).convocatoria_id || ''),
      convocatoria: String((concurso as any).convocatoria || ''),
      nombre: Number((concurso as any).nombre) || 0,
    });
  } catch (err) {
    next(err);
  }
});

/* ---------- POST - Crear nuevo concurso ---------- */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { concurso_id, convocatoria_id, convocatoria, nombre } = req.body;

    // Validaciones y sanitización
    const convocatoriaIdSanitized = sanitizeString(convocatoria_id);
    if (!convocatoriaIdSanitized) {
      return res.status(400).json({ message: 'La convocatoria es requerida' });
    }

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre (número) es requerido' });
    }

    const concursoIdSanitized = concurso_id ? sanitizeString(concurso_id) : '';
    const convocatoriaSanitized = convocatoria ? sanitizeString(convocatoria) : convocatoriaIdSanitized;

    const newConcurso = new Concurso({
      concurso_id: concursoIdSanitized,
      convocatoria_id: convocatoriaIdSanitized,
      convocatoria: convocatoriaSanitized,
      nombre: Number(nombre),
    });

    await newConcurso.save();

    return res.status(201).json({
      _id: String(newConcurso._id),
      concurso_id: newConcurso.concurso_id,
      convocatoria_id: newConcurso.convocatoria_id,
      convocatoria: newConcurso.convocatoria,
      nombre: newConcurso.nombre,
    });
  } catch (err: any) {
    console.error('Error al guardar concurso:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'El código de concurso ya existe' });
    }
    next(err);
  }
});

/* ---------- PUT /:id - Actualizar concurso ---------- */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { concurso_id, convocatoria_id, convocatoria, nombre } = req.body;

    // Validaciones y sanitización
    const convocatoriaIdSanitized = sanitizeString(convocatoria_id);
    if (!convocatoriaIdSanitized) {
      return res.status(400).json({ message: 'La convocatoria es requerida' });
    }

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre (número) es requerido' });
    }

    const concursoIdSanitized = concurso_id ? sanitizeString(concurso_id) : '';
    const convocatoriaSanitized = convocatoria ? sanitizeString(convocatoria) : convocatoriaIdSanitized;

    const updated = await Concurso.findByIdAndUpdate(
      id,
      {
        concurso_id: concursoIdSanitized,
        convocatoria_id: convocatoriaIdSanitized,
        convocatoria: convocatoriaSanitized,
        nombre: Number(nombre),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Concurso no encontrado' });
    }

    return res.json({
      _id: String(updated._id),
      concurso_id: (updated as any).concurso_id,
      convocatoria_id: (updated as any).convocatoria_id,
      convocatoria: (updated as any).convocatoria,
      nombre: (updated as any).nombre,
    });
  } catch (err) {
    next(err);
  }
});

/* ---------- DELETE /:id - Eliminar concurso ---------- */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { confirmacion } = req.body;

    // Validar confirmación
    if (confirmacion !== 'DELETE') {
      return res.status(400).json({ 
        message: 'Debe escribir DELETE para confirmar la eliminación' 
      });
    }

    // Primero obtener el concurso para conocer sus datos
    const concurso = await Concurso.findById(id).lean();
    if (!concurso) {
      return res.status(404).json({ message: 'Concurso no encontrado' });
    }

    // Verificar si hay plazas asociadas
    // Las plazas pueden referenciar al concurso por: concurso_id (string) o concurso (número)
    const Plaza = require('../../models/Plaza').default;
    
    const plazasCount = await Plaza.countDocuments({
      $or: [
        { concurso_id: id },
        { concurso_id: (concurso as any).concurso_id },
        { concurso: (concurso as any).nombre },
        { concurso: Number((concurso as any).nombre) }
      ]
    });

    if (plazasCount > 0) {
      return res.status(400).json({ 
        message: `No se puede eliminar. El concurso tiene ${plazasCount} plaza(s) asociada(s)` 
      });
    }

    await Concurso.findByIdAndDelete(id);

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
