/**
 * Base URL del backend.
 *
 * Para agregar más entornos, añade el hostname al mapa.
 * Cualquier host que no esté listado cae en `production`.
 */
const API_URLS = {
  local: 'http://localhost:3001/api',
  production: 'https://spa-pink-nine.vercel.app/api'
} as const;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '']);

function pickApiBaseUrl(): string {
  const host = (typeof window !== 'undefined' && window.location?.hostname) || '';
  return LOCAL_HOSTS.has(host) ? API_URLS.local : API_URLS.production;
}

export const API_BASE_URL = pickApiBaseUrl();
