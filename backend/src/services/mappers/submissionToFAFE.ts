// src/services/mappers/submissionToFAFE.ts
import { getSubmissionById } from "../submissions/submissions.repo" // tu repo actual

export async function mapSubmission(submissionId: string) {
  const sub = await getSubmissionById(submissionId); // incluye encabezado + respuestas
  if (!sub) throw new Error("Submission no encontrada");

  const encabezado = {
    convocatoria: sub.convocatoria,
    unidadAdministrativa: sub.unidadAdministrativa,
    concurso: sub.concurso,
    puesto: sub.concurso, // Usar concurso como puesto ya que no hay campo puesto específico
    codigoPuesto: sub.codigoPuesto,
    modalidad: sub.modalidad,
    duracionMin: sub.duracionMin,
    nombreEspecialista: sub.especialistaNombre,
    puestoEspecialista: sub.especialistaPuesto ?? undefined,
  };

  const caso = {
    planteamiento: sub.caso?.planteamiento ?? "",
    temasGuia: sub.caso?.temasGuia ?? "",
    equipo: sub.caso?.equipo ?? "",
  };

 const criterios = (sub.criterios ?? []).map(c => ({
    descripcion: c.descripcion, puntaje: c.puntaje
  }));
  
  const filas = (sub.criterios ?? []).map(c => ({
    aspecto: c.descripcion, puntajeMax: c.puntaje,
    puntajeOtorgado: c.puntajeOtorgado ?? null,
    comentario: c.comentario ?? null
  }));

  return { encabezado, caso, criterios, filas, raw: sub };
}
