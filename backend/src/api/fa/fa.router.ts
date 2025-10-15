import { Router } from 'express';
import { generarFA } from '../../services/fa.service';

const router = Router();

router.post('/generar', async (req, res, next) => {
  try {
    const { casos } = req.body;
    
    if (!casos || !Array.isArray(casos) || casos.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un caso' });
    }

    // Obtener folio directamente del encabezado (viene desde el frontend via prefill)
    const primerCaso = casos[0];
    const { encabezado } = primerCaso;
    const folio = encabezado?.folio || '';
    
    console.log(`=== DEBUG FOLIO FA ===`);
    console.log(`Encabezado completo:`, encabezado);
    console.log(`Folio obtenido del encabezado: "${folio}"`);
    console.log(`Nombre especialista: "${encabezado?.nombreEspecialista}"`);
    console.log(`========================`);

    // Generar FA con todos los casos (2 páginas por caso)
    const todosLosCasos = casos.map((caso, index) => {
      const { encabezado, planteamiento } = caso;

      if (!encabezado || !planteamiento) {
        throw new Error(`Faltan datos en el caso ${index + 1}`);
      }

      return {
        encabezado: {
          convocatoria: encabezado.convocatoria || '',
          unidadAdministrativa: encabezado.unidadAdministrativa || '',
          concurso: encabezado.concurso || '',
          puesto: encabezado.puesto || '',
          codigoPuesto: encabezado.codigoPuesto || '',
          modalidad: encabezado.modalidad || '',
          duracionMin: encabezado.duracionMin || 0,
          nombreEspecialista: encabezado.nombreEspecialista || '',
          puestoEspecialista: encabezado.puestoEspecialista || '',
          folio: folio // Usar el folio obtenido
        },
        caso: {
          planteamiento: planteamiento || '',
          temasGuia: encabezado.temasGuia || '',
          equipo: encabezado.equipoAdicional || ''
        },
        criterios: [],
        casoNumero: index + 1,
        totalCasos: casos.length
      };
    });

    // Generar un PDF que contenga todos los casos
    const faArgs = {
      casos: todosLosCasos,
      encabezado: todosLosCasos[0].encabezado, // Para compatibilidad
      caso: todosLosCasos[0].caso, // Para compatibilidad
      criterios: []
    };

    const pdfBuffer = await generarFA(faArgs);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="FA_${todosLosCasos[0].encabezado.concurso || 'casos'}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando FA:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
