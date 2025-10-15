import { Schema, model } from "mongoose";

const AspiranteSchema = new Schema(
  {
    // En tu BD es hash-40, no ObjectId
    _id: { type: String, required: true },

    // FK a convocatoria
    convocatoriaId: { type: Schema.Types.Mixed },
    
    // FK a concurso
    concursoId: { type: Schema.Types.Mixed },

    // Folio del aspirante
    folio: { type: String, required: true },

    // Nombres del aspirante
    aspiranteName: { type: String },
    aspiranteNameNorm: { type: String },

    // Nombre del concurso
    concursoName: { type: String },

    // Nombre de la convocatoria
    convocatoriaName: { type: String },
  },
  {
    versionKey: false,
    strict: false, // tolera variaciones reales de la colección
    timestamps: false,
  }
);

export type Aspirante = {
  _id: string;
  convocatoriaId: string;
  concursoId: string;
  folio: string;
  aspiranteName?: string;
  aspiranteNameNorm?: string;
  concursoName?: string;
  convocatoriaName?: string;
};

export default model("Aspirante", AspiranteSchema, "aspirantes");