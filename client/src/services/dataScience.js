import api from './api';

export async function getDataScienceModules(signal) {
  const { data } = await api.get('/data-science/modules', { signal });
  return data.data.modules;
}

export async function createDataScienceModule() {
  const { data } = await api.post('/data-science/modules');
  return data.data.module;
}

export async function updateDataScienceModule(moduleId, title) {
  const { data } = await api.patch(`/data-science/modules/${moduleId}`, { title });
  return data.data.module;
}

export async function deleteDataScienceModule(moduleId) {
  await api.delete(`/data-science/modules/${moduleId}`);
}

export async function uploadDataScienceMaterial(moduleId, title, file) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('file', file);
  const { data } = await api.post(`/data-science/modules/${moduleId}/materials`, formData);
  return data.data.material;
}

export async function updateDataScienceMaterial(materialId, title) {
  const { data } = await api.patch(`/data-science/materials/${materialId}`, { title });
  return data.data.material;
}

export async function deleteDataScienceMaterial(materialId) {
  await api.delete(`/data-science/materials/${materialId}`);
}

export async function fetchDataScienceFile(moduleId, materialId, preview = false) {
  const kind = preview ? 'preview' : 'file';
  const { data } = await api.get(
    `/data-science/modules/${moduleId}/materials/${materialId}/${kind}`,
    { responseType: 'blob' },
  );
  return data;
}
