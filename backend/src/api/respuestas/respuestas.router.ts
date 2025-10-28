import { Router } from 'express';
import archiver from 'archiver';
import { generateResponsesPdf } from '../../services/pdfs';

const router = Router();

router.post('/generar-lote', async (req, res, next) => {
  try {
    const { casos, folios, header } = req.body;
    if (!casos || !Array.isArray(casos) || casos.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un caso' });
    }
    if (!folios || !Array.isArray(folios) || folios.length === 0) {
      return res.status(400).json({ error: 'Se requiere una lista de folios' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="RESPUESTAS_lote_${Date.now()}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err: any) => { console.error('Archiver error:', err); try { res.status(500).end(); } catch {} });
    archive.pipe(res as any);

    for (let i = 0; i < folios.length; i++) {
      const folio = String(folios[i] || 'sin_folio');

      // Construir header/answers para generateResponsesPdf
      const headerObj = header || {};
      const answers = {
        convocatoria: headerObj.convocatoria || '',
        unidadAdministrativa: headerObj.unidadAdministrativa || '',
        concurso: headerObj.concurso || '',
        puesto: headerObj.puesto || '',
        codigoPuesto: headerObj.codigoPuesto || '',
        folio: folio,
        modalidad: headerObj.modalidad || '',
        duracionMin: headerObj.duracionMin || 0,
        nombreEspecialista: headerObj.nombreEspecialista || '',
        fechaElaboracion: headerObj.fechaElaboracion || '',
        casos: casos
      };

      const result = await generateResponsesPdf({ header: headerObj, answers });
      const filename = result.filename || `Respuestas_${folio}.pdf`;
      archive.append(result.data, { name: filename });
    }

    await archive.finalize();
  } catch (err) {
    console.error('Error generando lote Respuestas:', err);
    res.status(500).json({ error: 'Error interno generando lote Respuestas' });
  }
});

export default router;
