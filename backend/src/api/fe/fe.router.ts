import { Router } from 'express';
import { generarFE } from '../../services/fe.service';

const router = Router();

router.post('/generar', async (req, res, next) => {
  try {
    const { casos } = req.body;
    
    // Debug: Ver qué datos están llegando exactamente
    console.log('\n=== DEBUG FE ENDPOINT ===');
    console.log('Datos recibidos en el endpoint:');
    console.log(`Número total de casos: ${casos ? casos.length : 'undefined'}`);
    
    if (casos && Array.isArray(casos)) {
      casos.forEach((caso, index) => {
        console.log(`\nCaso ${index + 1}:`);
        console.log(`- Tiene encabezado: ${!!caso.encabezado}`);
        console.log(`- Aspectos: ${caso.aspectos ? caso.aspectos.length : 'undefined'}`);
        if (caso.aspectos) {
          caso.aspectos.forEach((aspecto, aspIndex) => {
            console.log(`  Aspecto ${aspIndex + 1}: "${aspecto.descripcion}" (${aspecto.puntaje}%)`);
          });
        }
      });
    }
    console.log('========================\n');
    
    if (!casos || !Array.isArray(casos) || casos.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un caso' });
    }

    // Tomar el primer caso para obtener el encabezado (común para todos los casos)
    const primerCaso = casos[0];
    const { encabezado } = primerCaso;

    if (!encabezado) {
      return res.status(400).json({ error: 'Faltan datos del encabezado' });
    }

    // Obtener folio directamente del encabezado (viene desde el frontend via prefill)
    const folio = encabezado?.folio || '';
    console.log(`Folio obtenido del encabezado FE: ${folio}`);

    // Validar que todos los casos tengan aspectos
    for (let i = 0; i < casos.length; i++) {
      const caso = casos[i];
      if (!caso.aspectos || !Array.isArray(caso.aspectos) || caso.aspectos.length === 0) {
        return res.status(400).json({ error: `El caso ${i + 1} no tiene aspectos a evaluar` });
      }
    }

    // Transformar los casos para el nuevo formato
    const casosParaFE = casos.map(caso => ({
      aspectos: caso.aspectos
    }));

    const feArgs = {
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
      casos: casosParaFE
    };

    const excelBuffer = await generarFE(feArgs);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="FE_${encabezado.concurso || 'formulario'}.xlsx"`);
    return res.send(excelBuffer);
  } catch (err) {
    console.error('Error generando FE:', err);
    next(err);
  }
});

export default router;
