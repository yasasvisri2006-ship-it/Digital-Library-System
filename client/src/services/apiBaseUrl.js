const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';

export function normalizeApiBaseUrl(configuredBaseUrl) {
  const baseUrl = (configuredBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
  return /\/api$/i.test(baseUrl) ? baseUrl : `${baseUrl}/api`;
}
