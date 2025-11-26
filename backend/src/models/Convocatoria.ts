import { Schema, model } from "mongoose";

const ConvocatoriaSchema = new Schema(
  {
    // En tu BD es hash-40, no ObjectId
    _id: { type: String, required: true },
    nombre: { type: String, required: true },
  },
  {
    versionKey: false,
    strict: false, // tolera variaciones reales de la colección
    timestamps: false,
  }
);

export default model("Convocatoria", ConvocatoriaSchema);
