import api from './api';

export async function getEducationalMaterials(section, signal) {
  const { data } = await api.get('/education', {
    params: section ? { section } : undefined,
    signal,
  });
  return data.data.materials;
}
