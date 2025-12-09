// src/api/plazas/plazas.router.ts
import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import Plaza from '../../models/Plaza';
import { validateQueryStrings, sanitizeString } from '../../middleware/validateRequest';

const router = Router();
const isOid = (v?: string) => !!v && Types.ObjectId.isValid(v);
const toOid = (v: string) => new Types.ObjectId(v);

/* ---------- GET - Listar plazas con filtros ---------- */
router.get('/', validateQueryStrings('convocatoriaId', 'concursoId'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { convocatoriaId, concursoId } = req.query as {
      convocatoriaId?: string;
      concursoId?: string;
    };

    // Validar tipos para prevenir NoSQL injection
    if (typeof convocatoriaId !== 'string' || typeof concursoId !== 'string') {
      return res.status(400).json({ 
        message: 'Parámetros inválidos' 
      });
    }

    // Validar que los parámetros requeridos estén presentes
    if (!convocatoriaId || !concursoId) {
      return res.status(400).json({ 
        message: 'Se requieren convocatoriaId y concursoId para filtrar plazas' 
      });
    }

    // Debug omitido en producción

    // Buscar el concurso para obtener sus variantes
    const Concurso = (await import('../../models/Concurso')).default;
    let concursoDoc = null;
    try {
      // Usar collection.findOne() para evitar cast a ObjectId
      concursoDoc = await Concurso.collection.findOne({
        $or: [
          { _id: concursoId } as any,
          { concurso_id: concursoId }
        ]
      } as any);
    } catch (err) {
      // Error silenciado en desarrollo
    }

    // Buscar la convocatoria para obtener sus variantes
    const Convocatoria = (await import('../../models/Convocatoria')).default;
    let convocatoriaDoc = null;
    try {
      // Usar collection.findOne() para evitar cast a ObjectId
      convocatoriaDoc = await Convocatoria.collection.findOne({
        $or: [
          { _id: convocatoriaId } as any,
          { nombre: convocatoriaId }
        ]
      } as any);
    } catch (err) {
      // Error silenciado en desarrollo
    }

    // Construir arrays de posibles valores
    const possibleConvocatoriaIds = [convocatoriaId];
    if (convocatoriaDoc) {
      if (convocatoriaDoc._id && String(convocatoriaDoc._id) !== convocatoriaId) {
        possibleConvocatoriaIds.push(String(convocatoriaDoc._id));
      }
      if (convocatoriaDoc.nombre && convocatoriaDoc.nombre !== convocatoriaId) {
        possibleConvocatoriaIds.push(convocatoriaDoc.nombre);
      }
    }

    const possibleConcursoIds = [concursoId];
    let concursoNumber: any = concursoId;
    if (concursoDoc) {
      if (concursoDoc._id && String(concursoDoc._id) !== concursoId) {
        possibleConcursoIds.push(String(concursoDoc._id));
      }
      if (concursoDoc.concurso_id && concursoDoc.concurso_id !== concursoId) {
        possibleConcursoIds.push(concursoDoc.concurso_id);
      }
      if (concursoDoc.nombre) {
        concursoNumber = concursoDoc.nombre;
        if (String(concursoDoc.nombre) !== concursoId) {
          possibleConcursoIds.push(String(concursoDoc.nombre));
        }
      }
    }

    // Convertir concursoNumber a número si es posible
    if (typeof concursoNumber === 'string' && !isNaN(Number(concursoNumber))) {
      concursoNumber = Number(concursoNumber);
    }

    // Filtro flexible: busca por todas las posibles variantes
    const filter: any = {
      $and: [
        {
          $or: [
            { convocatoria: { $in: possibleConvocatoriaIds } },
            { convocatoria_id: { $in: possibleConvocatoriaIds } }
          ]
        },
        {
          $or: [
            { concurso_id: { $in: possibleConcursoIds } },
            { concurso: concursoNumber },
            { concurso: { $in: possibleConcursoIds } }
          ]
        }
      ]
    };

    // Usar aggregate para hacer lookup con especialistas
    const pipeline: any[] = [
      { $match: filter },
      
      // Agregar campo para intentar conversión segura de especialista_id
      {
        $addFields: {
          especialista_oid: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$especialista_id", null] },
                  { $ne: ["$especialista_id", ""] },
                  { $eq: [{ $strLenCP: "$especialista_id" }, 24] } // Validar longitud de ObjectId
                ]
              },
              then: {
                $convert: {
                  input: "$especialista_id",
                  to: "objectId",
                  onError: null,  // Si falla, retorna null en lugar de error
                  onNull: null
                }
              },
              else: null
            }
          }
        }
      },
      
      // Lookup con especialistas
      {
        $lookup: {
          from: "especialistas",
          localField: "especialista_oid",
          foreignField: "_id",
          as: "especialista_info"
        }
      },
      
      {
        $unwind: {
          path: "$especialista_info",
          preserveNullAndEmptyArrays: true
        }
      },
      
      { $sort: { _id: -1 } }
    ];

    let rows;
    try {
      rows = await Plaza.collection.aggregate(pipeline).toArray();
    } catch (aggErr: any) {
      // Si el error es por conversión de ObjectId, intentar sin lookup
      if (aggErr.message?.includes('$toObjectId') || aggErr.message?.includes('InvalidId')) {
        rows = await Plaza.collection.find(filter).sort({ _id: -1 }).toArray();
      } else {
        return res.status(500).json({ message: 'Error al buscar plazas', error: aggErr.message });
      }
    }

    res.set('Cache-Control', 'no-store');

    // Normalizar usando los nombres reales del modelo Plaza
    const out = rows.map((r: any) => ({
      _id: String(r._id),
      convocatoria: String(r.convocatoria || ''),
      concurso_id: String(r.concurso_id || ''),
      concurso: Number(r.concurso) || 0,
      codigo: r.codigo || '',
      puesto: r.puesto || '',
      unidad_adm: r.unidad_adm || '',
      radicacion: r.radicacion || '',
      especialista_id: String(r.especialista_id || ''),
      // Información del especialista desde el lookup
      especialista: r.especialista_info ? {
        _id: String(r.especialista_info._id),
        nombre: r.especialista_info.nombre || '',
        correo: r.especialista_info.correo || '',
        puesto: r.especialista_info.puesto || ''
      } : null
    }));

    return res.json(out);
  } catch (err) {
    next(err);
  }
});

/* ---------- Crear nueva plaza ---------- */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      convocatoria,
      concurso_id,
      concurso,
      codigo,
      puesto,
      unidad_adm,
      radicacion,
      especialista_id,
    } = req.body;

    // Validaciones y sanitización
    const convocatoriaSanitized = sanitizeString(convocatoria);
    if (!convocatoriaSanitized) {
      return res.status(400).json({ message: 'Convocatoria es requerida' });
    }

    const concursoIdSanitized = sanitizeString(concurso_id);
    if (!concursoIdSanitized) {
      return res.status(400).json({ message: 'Concurso es requerido' });
    }

    if (!concurso) {
      return res.status(400).json({ message: 'Número de concurso es requerido' });
    }

    const codigoSanitized = sanitizeString(codigo);
    const puestoSanitized = sanitizeString(puesto);
    const unidadAdmSanitized = sanitizeString(unidad_adm);
    
    if (!codigoSanitized || !puestoSanitized || !unidadAdmSanitized) {
      return res.status(400).json({ message: 'Código, puesto y unidad administrativa son requeridos' });
    }

    const radicacionSanitized = radicacion ? sanitizeString(radicacion) : '';
    const especialistaIdSanitized = especialista_id ? sanitizeString(especialista_id) : '';

    const newPlaza = new Plaza({
      convocatoria: convocatoriaSanitized,
      concurso_id: concursoIdSanitized,
      concurso: Number(concurso),
      codigo: codigoSanitized,
      puesto: puestoSanitized,
      unidad_adm: unidadAdmSanitized,
      radicacion: radicacionSanitized,
      especialista_id: especialistaIdSanitized,
    });

    await newPlaza.save();

    return res.status(201).json({
      _id: String(newPlaza._id),
      convocatoria: newPlaza.convocatoria,
      concurso_id: newPlaza.concurso_id,
      concurso: newPlaza.concurso,
      codigo: newPlaza.codigo,
      puesto: newPlaza.puesto,
      unidad_adm: newPlaza.unidad_adm,
      radicacion: newPlaza.radicacion,
      especialista_id: newPlaza.especialista_id,
    });
  } catch (err: any) {
    console.error('Error en POST /plazas:', err);
    next(err);
  }
});

/* ---------- Actualizar plaza ---------- */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      convocatoria,
      concurso_id,
      concurso,
      codigo,
      puesto,
      unidad_adm,
      radicacion,
      especialista_id,
    } = req.body;

    if (!isOid(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    // Validaciones y sanitización
    const convocatoriaSanitized = sanitizeString(convocatoria);
    if (!convocatoriaSanitized) {
      return res.status(400).json({ message: 'Convocatoria es requerida' });
    }

    const concursoIdSanitized = sanitizeString(concurso_id);
    if (!concursoIdSanitized) {
      return res.status(400).json({ message: 'Concurso es requerido' });
    }

    if (!concurso) {
      return res.status(400).json({ message: 'Número de concurso es requerido' });
    }

    const codigoSanitized = sanitizeString(codigo);
    const puestoSanitized = sanitizeString(puesto);
    const unidadAdmSanitized = sanitizeString(unidad_adm);
    
    if (!codigoSanitized || !puestoSanitized || !unidadAdmSanitized) {
      return res.status(400).json({ message: 'Código, puesto y unidad administrativa son requeridos' });
    }

    const radicacionSanitized = radicacion ? sanitizeString(radicacion) : '';
    const especialistaIdSanitized = especialista_id ? sanitizeString(especialista_id) : '';

    const updated = await Plaza.findByIdAndUpdate(
      toOid(id),
      {
        convocatoria: convocatoriaSanitized,
        concurso_id: concursoIdSanitized,
        concurso: Number(concurso),
        codigo: codigoSanitized,
        puesto: puestoSanitized,
        unidad_adm: unidadAdmSanitized,
        radicacion: radicacionSanitized,
        especialista_id: especialistaIdSanitized,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Plaza no encontrada' });
    }

    return res.json({
      _id: String(updated._id),
      convocatoria: updated.convocatoria,
      concurso_id: updated.concurso_id,
      concurso: updated.concurso,
      codigo: updated.codigo,
      puesto: updated.puesto,
      unidad_adm: updated.unidad_adm,
      radicacion: updated.radicacion,
      especialista_id: updated.especialista_id,
    });
  } catch (err: any) {
    next(err);
  }
});

/* ---------- Eliminar plaza ---------- */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { confirmacion } = req.body;

    if (!isOid(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    // Validar confirmación
    if (confirmacion !== 'DELETE') {
      return res.status(400).json({ 
        message: 'Debe escribir DELETE para confirmar la eliminación' 
      });
    }

    const deleted = await Plaza.findByIdAndDelete(toOid(id));

    if (!deleted) {
      return res.status(404).json({ message: 'Plaza no encontrada' });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;