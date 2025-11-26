import { Schema, model } from "mongoose";

const ConcursoSchema = new Schema(
  {
    concurso_id: { type: String, index: true },
    convocatoria_id: { type: String, index: true },
    convocatoria: { type: String, index: true },
    nombre: { type: Number },
  },
  {
    versionKey: false,
    strict: false,
    timestamps: false,
  }
);

export default model("Concurso", ConcursoSchema);
