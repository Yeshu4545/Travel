import { apiUrl } from './constants';

const ACCESS_KEY = 'token';
const REFRESH_KEY = 'refreshToken';

export function saveTokens({ accessToken, token, refreshToken }) {
  const access = accessToken || token;
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(apiUrl('/api/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const data = await res.json();
  saveTokens(data);
  return data.accessToken || data.token;
}

export async function authFetch(path, options = {}) {
  let token = getAccessToken();
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(apiUrl(path), { ...options, headers });

  if (res.status === 401 && getRefreshToken()) {
    token = await refreshAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      res = await fetch(apiUrl(path), { ...options, headers });
    }
  }

  return res;
}

export async function authFetchJson(path, options = {}) {
  const res = await authFetch(path, options);
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        const hint =
          process.env.NODE_ENV === 'production'
            ? 'Production build cannot use the dev proxy. Use Vercel deploy or set API to EC2 with port 5000 open.'
            : 'Start the backend first: open a terminal, run "cd server" then "npm start", then restart "npm start" in client. Do not use "npm run build" for local testing.';
        throw new Error(`API returned HTML instead of JSON. ${hint}`);
      }
      throw new Error(text.slice(0, 180) || 'Invalid server response');
    }
  }
  return { res, data };
}

export function handleAuthResponse(data, onAuth) {
  saveTokens(data);
  const access = data.accessToken || data.token;
  if (access && onAuth) onAuth(access);
}
