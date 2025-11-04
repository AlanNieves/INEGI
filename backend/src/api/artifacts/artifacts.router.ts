import { Router } from 'express';
import archiver from 'archiver';
import { generarFA } from '../../services/fa.service';
import { generarFE } from '../../services/fe.service';
import { generateResponsesPdf } from '../../services/pdfs';

const router = Router();

// POST /api/artifacts/generar-lote
// body: { casos: any[], folios: string[], header?: any }
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
    res.setHeader('Content-Disposition', `attachment; filename="ARTIFACTS_lote_${Date.now()}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err: any) => { console.error('Archiver error:', err); try { res.status(500).end(); } catch {} });
    archive.pipe(res as any);

    // For each folio, generate FA (pdf), FE (xlsx) and Respuestas (pdf)
    for (let i = 0; i < folios.length; i++) {
      const folio = String(folios[i] || `folio_${i+1}`);

      // Build casos with folio in encabezado for FA
      const todosLosCasos = casos.map((caso: any, index: number) => {
        const { encabezado, planteamiento } = caso;
        return {
          encabezado: {
            convocatoria: encabezado?.convocatoria || '',
            unidadAdministrativa: encabezado?.unidadAdministrativa || '',
            concurso: encabezado?.concurso || '',
            puesto: encabezado?.puesto || '',
            codigoPuesto: encabezado?.codigoPuesto || '',
            folio: folio,
            modalidad: encabezado?.modalidad || '',
            duracionMin: encabezado?.duracionMin || 0,
            nombreEspecialista: encabezado?.nombreEspecialista || '',
            puestoEspecialista: encabezado?.puestoEspecialista || ''
          },
          caso: {
            planteamiento: planteamiento || '',
            temasGuia: encabezado?.temasGuia || '',
            equipo: encabezado?.equipoAdicional || ''
          },
          criterios: [],
          casoNumero: index + 1,
          totalCasos: casos.length
        };
      });

      // FA
      try {
        const faArgs = { casos: todosLosCasos, encabezado: todosLosCasos[0].encabezado, caso: todosLosCasos[0].caso, criterios: [] };
        const pdfBuf = await generarFA(faArgs as any);
        const faName = `FA_${folio}.pdf`.replace(/\s+/g, '_');
        archive.append(pdfBuf, { name: `${folio}/${faName}` });
      } catch (err) {
        console.error(`Error generando FA para folio ${folio}:`, err);
        // continue to try generating other artifacts
        archive.append(Buffer.from(`Error generating FA for folio ${folio}: ${String(err)}`), { name: `${folio}/FA_error.txt` });
      }

      // FE
      try {
        const primerCaso = casos[0] || {};
        const encabezado = primerCaso.encabezado || {};
        const feArgs = {
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
          casos: casos.map((c: any) => ({ aspectos: c.aspectos || [] }))
        };
        const xlsxBuf = await generarFE(feArgs as any);
        const feName = `FE_${folio}.xlsx`.replace(/\s+/g, '_');
        archive.append(xlsxBuf, { name: `${folio}/${feName}` });
      } catch (err) {
        console.error(`Error generando FE para folio ${folio}:`, err);
        archive.append(Buffer.from(`Error generating FE for folio ${folio}: ${String(err)}`), { name: `${folio}/FE_error.txt` });
      }

      // Respuestas
      try {
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
        const resp = await generateResponsesPdf({ header: headerObj, answers });
        const respName = resp.filename || `Respuestas_${folio}.pdf`;
        archive.append(resp.data, { name: `${folio}/${respName}` });
      } catch (err) {
        console.error(`Error generando Respuestas para folio ${folio}:`, err);
        archive.append(Buffer.from(`Error generating Respuestas for folio ${folio}: ${String(err)}`), { name: `${folio}/Respuestas_error.txt` });
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('Error generando lote de artefactos:', err);
    res.status(500).json({ error: 'Error interno generando lote de artefactos' });
  }
});

export default router;
