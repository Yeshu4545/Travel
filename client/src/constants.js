const EC2_API = 'http://65.2.168.202:5000';

/**
 * development + npm start → '' (CRA proxy → local or REACT_APP_PROXY_TARGET)
 * production build / Vercel HTTPS → EC2 or '' (Vercel rewrites)
 */
export function getApiBaseUrl() {
  if (process.env.NODE_ENV === 'production') {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      return '';
    }
    return EC2_API;
  }

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '';
    }
  }

  return EC2_API;
}

export function apiUrl(path) {
  return `${getApiBaseUrl()}${path}`;
}
