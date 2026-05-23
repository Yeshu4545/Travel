const EC2_API = 'http://65.2.168.202:5000';

/** Public frontend for share links (never localhost — others must open this). */
const DEFAULT_PUBLIC_APP = 'https://travel-bice-six.vercel.app';

export function getPublicAppUrl() {
  const fromEnv = process.env.REACT_APP_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const { hostname, origin, pathname } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const base = origin + (pathname === '/' ? '' : pathname.replace(/\/$/, ''));
      return base.replace(/\/$/, '');
    }
  }

  return DEFAULT_PUBLIC_APP;
}

export function buildShareLink(sharePathOrToken) {
  const base = getPublicAppUrl();
  const fragment = sharePathOrToken.startsWith('#')
    ? sharePathOrToken
    : sharePathOrToken.startsWith('share/')
      ? `#${sharePathOrToken}`
      : `#share/${sharePathOrToken}`;
  const path = fragment.startsWith('#') ? `/${fragment}` : fragment;
  return `${base.replace(/\/$/, '')}${path}`;
}

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
