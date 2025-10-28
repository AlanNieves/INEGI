import { Router } from 'express';
import archiver from 'archiver';
import { generarFA } from '../../services/fa.service';

const router = Router();

router.post('/generar', async (req, res, next) => {
  try {
    const { casos } = req.body;
    
    if (!casos || !Array.isArray(casos) || casos.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un caso' });
    }

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
          folio: encabezado.folio || '',
          modalidad: encabezado.modalidad || '',
          duracionMin: encabezado.duracionMin || 0,
          nombreEspecialista: encabezado.nombreEspecialista || '',
          puestoEspecialista: encabezado.puestoEspecialista || ''
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

// Generar lote: un PDF por folio y devolver ZIP
router.post('/generar-lote', async (req, res, next) => {
  try {
    const { casos, folios } = req.body;
    if (!casos || !Array.isArray(casos) || casos.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un caso' });
    }
    if (!folios || !Array.isArray(folios) || folios.length === 0) {
      return res.status(400).json({ error: 'Se requiere una lista de folios' });
    }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="FA_lote_${Date.now()}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err: any) => { console.error('Archiver error:', err); try { res.status(500).end(); } catch {} });
    archive.pipe(res as any);

    // Para cada folio, generar un PDF con los mismos casos pero con folio en encabezado
    for (let i = 0; i < folios.length; i++) {
      const folio = String(folios[i] || 'sin_folio');
      const todosLosCasos = casos.map((caso: any, index: number) => {
        const { encabezado, planteamiento } = caso;
        return {
          encabezado: {
            convocatoria: encabezado.convocatoria || '',
            unidadAdministrativa: encabezado.unidadAdministrativa || '',
            concurso: encabezado.concurso || '',
            puesto: encabezado.puesto || '',
            codigoPuesto: encabezado.codigoPuesto || '',
            folio: folio,
            modalidad: encabezado.modalidad || '',
            duracionMin: encabezado.duracionMin || 0,
            nombreEspecialista: encabezado.nombreEspecialista || '',
            puestoEspecialista: encabezado.puestoEspecialista || ''
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

      const faArgs = {
        casos: todosLosCasos,
        encabezado: todosLosCasos[0].encabezado,
        caso: todosLosCasos[0].caso,
        criterios: []
      };

      const pdfBuffer = await generarFA(faArgs);
      const filename = `FA_${folio || 'casos'}.pdf`.replace(/\s+/g, '_');
      archive.append(pdfBuffer, { name: filename });
    }

    await archive.finalize();
  } catch (err) {
    console.error('Error generando lote FA:', err);
    res.status(500).json({ error: 'Error interno generando lote FA' });
  }
});

export default router;

