import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export interface AspiranteData {
  _id?: string;
  convocatoriaId: string;
  concursoId: string;
  plazaId?: string;
  folio: string;
  aspiranteName: string;
  convocatoriaName?: string;
  concursoName?: string;
}

export interface AspiranteListItem {
  _id: string;
  folio: string;
  nombre: string;
  label: string;
}

export const aspirantesApi = {
  // Obtener aspirantes por convocatoria y concurso
  getByPlaza: async (convocatoriaId: string, concursoId: string): Promise<{ total: number; aspirantes: AspiranteListItem[] }> => {
    const response = await api.get('/aspirantes/by-plaza', {
      params: { convocatoriaId, concursoId }
    });
    return response.data;
  },

  // Obtener un aspirante por ID
  getById: async (id: string): Promise<AspiranteData> => {
    const response = await api.get(`/aspirantes/${id}`);
    return response.data;
  },

  // Crear nuevo aspirante
  create: async (data: AspiranteData): Promise<AspiranteData> => {
    const response = await api.post('/aspirantes', data);
    return response.data;
  },

  // Actualizar aspirante existente
  update: async (id: string, data: AspiranteData): Promise<AspiranteData> => {
    const response = await api.put(`/aspirantes/${id}`, data);
    return response.data;
  },

  // Eliminar aspirante
  delete: async (id: string): Promise<void> => {
    await api.delete(`/aspirantes/${id}`, {
      data: { confirmacion: 'DELETE' }
    });
  },
};
