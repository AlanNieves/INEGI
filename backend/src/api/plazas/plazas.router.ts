// src/api/plazas/plazas.router.ts
import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import Plaza from '../../models/Plaza';

const router = Router();
const isOid = (v?: string) => !!v && Types.ObjectId.isValid(v);
const toOid = (v: string) => new Types.ObjectId(v);

/* ---------- GET - Listar plazas con filtros ---------- */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { convocatoriaId, concursoId } = req.query as {
      convocatoriaId?: string;
      concursoId?: string;
    };

    console.log('🔍 GET /plazas - Parámetros recibidos:', { convocatoriaId, concursoId });

    // Validar que los parámetros requeridos estén presentes
    if (!convocatoriaId || !concursoId) {
      console.log('❌ Error: Faltan parámetros requeridos');
      return res.status(400).json({ 
        message: 'Se requieren convocatoriaId y concursoId para filtrar plazas' 
      });
    }

    // Debug: Contar total de plazas en la BD
    const totalPlazas = await Plaza.countDocuments();
    console.log(`📊 Total de plazas en BD: ${totalPlazas}`);
    
    // Debug: Obtener algunas plazas de ejemplo para verificar estructura
    const samplePlazas = await Plaza.collection.find().limit(3).toArray();
    console.log('📋 Ejemplos de plazas en BD:', JSON.stringify(samplePlazas.map(p => ({
      _id: p._id,
      convocatoria: p.convocatoria,
      concurso_id: p.concurso_id,
      concurso: p.concurso,
      codigo: p.codigo
    })), null, 2));

    // Construir filtro MÁS FLEXIBLE: buscar por convocatoria Y concurso_id
    // El concursoId puede ser el _id del concurso O el valor del campo concurso_id
    const Concurso = (await import('../../models/Concurso')).default;
    
    // Buscar el concurso de forma flexible (por _id o por concurso_id)
    let concursoDoc = null;
    try {
      if (isOid(concursoId)) {
        concursoDoc = await Concurso.findById(concursoId).lean();
      }
      if (!concursoDoc) {
        concursoDoc = await Concurso.findOne({ concurso_id: concursoId }).lean();
      }
    } catch (err) {
      console.log('⚠️ Error buscando concurso, continuando con búsqueda simple:', err);
    }
    
    console.log('📋 Concurso encontrado:', concursoDoc);
    
    // Construir array de posibles valores de concurso_id para búsqueda flexible
    const possibleConcursoIds = [concursoId];
    
    if (concursoDoc) {
      // Agregar el _id del concurso
      if (concursoDoc._id) {
        possibleConcursoIds.push(String(concursoDoc._id));
      }
      // Agregar el concurso_id del documento
      if (concursoDoc.concurso_id && concursoDoc.concurso_id !== concursoId) {
        possibleConcursoIds.push(concursoDoc.concurso_id);
      }
    }
    
    const filter: any = {
      convocatoria: convocatoriaId,
      concurso_id: { $in: possibleConcursoIds }
    };

    console.log('🔎 Filtro aplicado:', filter);

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

    console.log('Ejecutando pipeline de agregación...');
    let rows;
    try {
      rows = await Plaza.collection.aggregate(pipeline).toArray();
    } catch (aggErr: any) {
      console.error('Error en aggregation pipeline:', aggErr);
      // Si el error es por conversión de ObjectId, intentar sin lookup
      if (aggErr.message?.includes('$toObjectId') || aggErr.message?.includes('InvalidId')) {
        console.log('Error en conversión de ObjectId, usando consulta simple sin lookup');
        rows = await Plaza.collection.find(filter).sort({ _id: -1 }).toArray();
      } else {
        return res.status(500).json({ message: 'Error al buscar plazas', error: aggErr.message });
      }
    }

    console.log(`Plazas encontradas: ${rows.length}`);
    if (rows.length > 0) {
      console.log('Primera plaza:', JSON.stringify(rows[0], null, 2));
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
    console.log('POST /plazas - Datos recibidos:', req.body);
    
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

    // Validaciones
    if (!convocatoria) {
      console.log('Error: Convocatoria faltante');
      return res.status(400).json({ message: 'Convocatoria es requerida' });
    }

    if (!concurso_id) {
      console.log('Error: Concurso ID faltante');
      return res.status(400).json({ message: 'Concurso es requerido' });
    }

    if (!concurso) {
      console.log('Error: Número de concurso faltante');
      return res.status(400).json({ message: 'Número de concurso es requerido' });
    }

    if (!codigo || !puesto || !unidad_adm) {
      console.log('Error: Campos obligatorios faltantes', { codigo, puesto, unidad_adm });
      return res.status(400).json({ message: 'Código, puesto y unidad administrativa son requeridos' });
    }

    const newPlaza = new Plaza({
      convocatoria,
      concurso_id,
      concurso: Number(concurso),
      codigo,
      puesto,
      unidad_adm,
      radicacion: radicacion || '',
      especialista_id: especialista_id || '',
    });

    console.log('Guardando plaza:', newPlaza.toObject());
    await newPlaza.save();
    console.log('Plaza guardada exitosamente:', newPlaza._id);

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

    // Validaciones
    if (!convocatoria) {
      return res.status(400).json({ message: 'Convocatoria es requerida' });
    }

    if (!concurso_id) {
      return res.status(400).json({ message: 'Concurso es requerido' });
    }

    if (!concurso) {
      return res.status(400).json({ message: 'Número de concurso es requerido' });
    }

    if (!codigo || !puesto || !unidad_adm) {
      return res.status(400).json({ message: 'Código, puesto y unidad administrativa son requeridos' });
    }

    const updated = await Plaza.findByIdAndUpdate(
      toOid(id),
      {
        convocatoria,
        concurso_id,
        concurso: Number(concurso),
        codigo,
        puesto,
        unidad_adm,
        radicacion: radicacion || '',
        especialista_id: especialista_id || '',
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