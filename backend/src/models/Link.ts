// src/models/Link.ts
import { Schema, model, InferSchemaType } from "mongoose";

const LinkSchema = new Schema({
  token: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, index: true },
  header: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ["ISSUED", "EXPIRED", "USED"], default: "ISSUED" },
  expiraAt: { type: Date, required: true },

  // existentes:
  usado: { type: Boolean, default: false },

  // ⇩⇩⇩ NUEVOS (para que no marque error TS) ⇩⇩⇩
  usadoAt: { type: Date },                    // cuándo se consumió
  submissionsCount: { type: Number, default: 0 },

  // ids relacionados (si ya los tienes, omite)
  convocatoriaId: { type: Schema.Types.Mixed },
  concursoId: { type: Schema.Types.Mixed },
  plazaId: { type: Schema.Types.Mixed },
  especialistaId: { type: Schema.Types.Mixed },
  aspiranteId: { type: Schema.Types.Mixed }, // 🆕 ID del aspirante seleccionado
}, { timestamps: true });

export type LinkDoc = InferSchemaType<typeof LinkSchema>;
export default model("Link", LinkSchema);
