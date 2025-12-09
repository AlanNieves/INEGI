import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export interface PlazaData {
  _id?: string;
  convocatoria: string;
  concurso_id: string;
  concurso: number;
  codigo: string;
  puesto: string;
  unidad_adm: string;
  radicacion?: string;
  especialista_id: string;
  especialista?: {
    _id: string;
    nombre: string;
    correo: string;
    puesto: string;
  } | null;
}

export interface Convocatoria {
  _id: string;
  codigo?: string;
  nombre?: string;
  activa?: boolean;
  hash?: string;
  convocatoria?: string;
  code?: string;
}

export interface Concurso {
  _id: string;
  concurso_id: string;
  convocatoria_id: string;
  convocatoria: string;
  nombre: number;
}

export interface Especialista {
  _id: string;
  nombre: string;
  correo: string;
  puesto: string;
}

export const plazasApi = {
  // Obtener todas las plazas con información completa
  getAll: async (): Promise<PlazaData[]> => {
    const response = await api.get('/plazas');
    return response.data;
  },

  // Obtener una plaza por ID
  getById: async (id: string): Promise<PlazaData> => {
    const response = await api.get(`/plazas/${id}`);
    return response.data;
  },

  // Crear nueva plaza
  create: async (data: PlazaData): Promise<PlazaData> => {
    const response = await api.post('/plazas', data);
    return response.data;
  },

  // Actualizar plaza existente
  update: async (id: string, data: PlazaData): Promise<PlazaData> => {
    const response = await api.put(`/plazas/${id}`, data);
    return response.data;
  },

  // Eliminar plaza
  delete: async (id: string): Promise<void> => {
    await api.delete(`/plazas/${id}`, {
      data: { confirmacion: 'DELETE' }
    });
  },

  // Obtener catálogos para los selectores
  getCatalogos: async () => {
    const [convocatorias, concursos, especialistas] = await Promise.all([
      api.get<Convocatoria[]>('/catalog/convocatorias'),
      api.get<Concurso[]>('/catalog/concursos'),
      api.get<Especialista[]>('/catalog/especialistas'),
    ]);

    return {
      convocatorias: convocatorias.data,
      concursos: concursos.data,
      especialistas: especialistas.data,
    };
  },
};
