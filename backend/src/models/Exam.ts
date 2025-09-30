// src/models/Exam.ts
import { Schema, model, InferSchemaType } from "mongoose";

const PdfArtifactSchema = new Schema({
  filename: { type: String, default: "documento.pdf" },
  contentType: { type: String, default: "application/pdf" },
  data: { type: Buffer, required: true },
}, { _id: false });

const ExamSchema = new Schema({
  linkToken: { type: String, index: true, required: true },
  convocatoriaId: Schema.Types.Mixed,
  concursoId: Schema.Types.Mixed,
  plazaId: Schema.Types.Mixed,
  especialistaId: Schema.Types.Mixed,
  header: Schema.Types.Mixed,
  answers: Schema.Types.Mixed,
  consent: Schema.Types.Mixed,

  artifacts: {
    responsesPdf: { type: PdfArtifactSchema, required: true },
    faPdf: { type: PdfArtifactSchema, required: false },
    fePdf: { type: PdfArtifactSchema, required: false },
  },
}, { timestamps: true });

export type ExamDoc = InferSchemaType<typeof ExamSchema>;
export default model("Exam", ExamSchema);
