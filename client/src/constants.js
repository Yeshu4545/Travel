// Local dev (npm start): leave empty — requests use package.json proxy → EC2
// Production build: use full backend URL
export const API_BASE_URL =
  process.env.NODE_ENV === 'production' ? 'http://65.2.168.202:5000' : '';

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
