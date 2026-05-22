export const API_BASE_URL = 'http://65.2.168.202:5000';

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
