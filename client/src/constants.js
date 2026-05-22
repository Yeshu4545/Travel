const EC2_API = 'http://65.2.168.202:5000';

/** HTTPS (Vercel): same-origin /api via vercel.json proxy. HTTP (local): direct EC2. */
export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return '';
  }
  return EC2_API;
}

export function apiUrl(path) {
  return `${getApiBaseUrl()}${path}`;
}
