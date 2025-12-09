// src/api/especialistas/especialistas.router.ts
import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import Especialista from '../../models/Especialista';
import { sanitizeString } from '../../middleware/validateRequest';

const router = Router();
const isOid = (v?: string) => !!v && Types.ObjectId.isValid(v);
const toOid = (v: string) => new Types.ObjectId(v);

/* ---------- GET - Listar todos los especialistas ---------- */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const especialistas = await Especialista
      .find({ nombre: { $exists: true, $ne: '' } })
      .lean();

    res.set('Cache-Control', 'no-store');

    const out = especialistas.map((esp: any) => ({
      _id: String(esp._id),
      nombre: esp.nombre || '',
      correo: esp.correo || '',
      puesto: esp.puesto || '',
    }));

    return res.json(out);
  } catch (err) {
    next(err);
  }
});

/* ---------- GET /:id - Obtener un especialista por ID ---------- */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!isOid(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const especialista = await Especialista.findById(toOid(id)).lean();

    if (!especialista) {
      return res.status(404).json({ message: 'Especialista no encontrado' });
    }

    return res.json({
      _id: String(especialista._id),
      nombre: especialista.nombre,
      correo: especialista.correo,
      puesto: especialista.puesto,
    });
  } catch (err) {
    next(err);
  }
});

/* ---------- POST - Crear nuevo especialista ---------- */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, correo, puesto } = req.body;

    // Validaciones y sanitización
    const nombreSanitized = sanitizeString(nombre);
    if (!nombreSanitized) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    // Validar correo si se proporciona
    const correoSanitized = correo ? sanitizeString(correo) : undefined;
    if (correoSanitized) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correoSanitized)) {
        return res.status(400).json({ message: 'Correo inválido' });
      }
    }

    const puestoSanitized = puesto ? sanitizeString(puesto) : undefined;

    const newEspecialista = new Especialista({
      nombre: nombreSanitized,
      correo: correoSanitized,
      puesto: puestoSanitized,
    });

    await newEspecialista.save();

    return res.status(201).json({
      _id: String(newEspecialista._id),
      nombre: newEspecialista.nombre,
      correo: newEspecialista.correo,
      puesto: newEspecialista.puesto,
    });
  } catch (err) {
    next(err);
  }
});

/* ---------- PUT /:id - Actualizar especialista ---------- */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { nombre, correo, puesto } = req.body;

    if (!isOid(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    // Validaciones y sanitización
    const nombreSanitized = sanitizeString(nombre);
    if (!nombreSanitized) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    // Validar correo si se proporciona
    const correoSanitized = correo ? sanitizeString(correo) : undefined;
    if (correoSanitized) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correoSanitized)) {
        return res.status(400).json({ message: 'Correo inválido' });
      }
    }

    const puestoSanitized = puesto ? sanitizeString(puesto) : undefined;

    const updated = await Especialista.findByIdAndUpdate(
      toOid(id),
      {
        nombre: nombreSanitized,
        correo: correoSanitized,
        puesto: puestoSanitized,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Especialista no encontrado' });
    }

    return res.json({
      _id: String(updated._id),
      nombre: updated.nombre,
      correo: updated.correo,
      puesto: updated.puesto,
    });
  } catch (err) {
    next(err);
  }
});

/* ---------- DELETE /:id - Eliminar especialista ---------- */
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

    // Verificar si hay plazas asignadas a este especialista
    const Plaza = require('../../models/Plaza').default;
    
    // Las plazas referencian al especialista con el campo especialista_id (string)
    const plazasCount = await Plaza.countDocuments({ 
      especialista_id: id 
    });

    if (plazasCount > 0) {
      return res.status(400).json({ 
        message: `No se puede eliminar. El especialista tiene ${plazasCount} plaza(s) asignada(s)` 
      });
    }

    const deleted = await Especialista.findByIdAndDelete(toOid(id));

    if (!deleted) {
      return res.status(404).json({ message: 'Especialista no encontrado' });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
