import { Schema, model } from 'mongoose';

const EspecialistaSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    correo: { type: String, trim: true },
    puesto: { type: String, trim: true }
  },
  { timestamps: false }
);

export type Especialista = {
  _id: string;
  nombre: string;
  correo?: string;
  puesto?: string;
};

export default model<Especialista>('Especialista', EspecialistaSchema);
