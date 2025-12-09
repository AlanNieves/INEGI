import { Schema, Types, model } from "mongoose";

const PlazaSchema = new Schema(
  {
    concurso_id: { type: String, required: true, index: true },
    convocatoria: { type: String, required: true, index: true },
    concurso: { type: Number, required: true },
    codigo: { type: String, required: true, trim: true },
    puesto: { type: String, required: true, trim: true },
    unidad_adm: { type: String, required: true, trim: true },
    radicacion: { type: String, trim: true },
    especialista_id: { type: String, index: true },
  },
  { 
    timestamps: false,
    strict: false 
  }
);

// Índice compuesto para acelerar búsqueda por convocatoria+concurso
PlazaSchema.index({ convocatoria: 1, concurso: 1 });

export type Plaza = {
  _id: string;
  concurso_id: string;
  convocatoria: string;
  concurso: number;
  codigo: string;
  puesto: string;
  unidad_adm: string;
  radicacion?: string;
  especialista_id?: string;
};

export default model<Plaza>("Plaza", PlazaSchema);
