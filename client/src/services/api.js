import axios from 'axios';
import { normalizeApiBaseUrl } from './apiBaseUrl';

const api = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_URL),
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

export default api;
