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

export function handleAuthResponse(data, onAuth) {
  saveTokens(data);
  const access = data.accessToken || data.token;
  if (access && onAuth) onAuth(access);
}
