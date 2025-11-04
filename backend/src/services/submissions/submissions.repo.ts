// src/services/submissions/submissions.repo.ts
import { Types, connection   } from "mongoose";

interface Submission {
  _id: Types.ObjectId;
  convocatoria: string;
  unidadAdministrativa: string;
  concurso: string;
  codigoPuesto: string;
  modalidad: string;
  duracionMin: number;
  especialistaNombre: string;
  especialistaPuesto?: string;
  caso?: {
    planteamiento: string;
    temasGuia: string;
    equipo: string;
  };
  criterios?: Array<{
    descripcion: string;
    puntaje: number;
    puntajeOtorgado?: number;
    comentario?: string;
  }>;
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  try {
    const db = connection.db; // <- de mongoose
    if (!db) throw new Error("Mongo no inicializado");
    // Si tu _id es ObjectId:
    const _id = new Types.ObjectId(id);
    const doc = await db.collection("submissions").findOne({ _id }) as Submission | null;
    return doc;
  } catch (err) {
    console.error("Error fetching submission:", err);
    return null;
  }
}