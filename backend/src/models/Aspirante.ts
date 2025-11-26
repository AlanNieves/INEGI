import { Schema, Types, model } from "mongoose";

const AspiranteSchema = new Schema(
  {
    convocatoriaId: { type: String, required: true, index: true },
    concursoId: { type: String, required: true, index: true },
    plazaId: { type: Types.ObjectId, ref: "Plaza", index: true }, // 🆕 Relación explícita
    folio: { type: String, required: true, unique: true, trim: true },
    aspiranteName: { type: String, required: true, trim: true },
    aspiranteNameNorm: { type: String, trim: true },
    concursoName: { type: String, trim: true },
    convocatoriaName: { type: String, trim: true },
  },
  { timestamps: true }
);

// Índice compuesto para acelerar búsqueda por convocatoria+concurso
AspiranteSchema.index({ convocatoriaId: 1, concursoId: 1 });

export type Aspirante = {
  _id: string;
  convocatoriaId: string;
  concursoId: string;
  plazaId?: string; // 🆕 Opcional para compatibilidad con datos existentes
  folio: string;
  aspiranteName: string;
  aspiranteNameNorm?: string;
  concursoName?: string;
  convocatoriaName?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export default model<Aspirante>("Aspirante", AspiranteSchema, "Aspirantes");