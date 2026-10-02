const BASE = import.meta.env.VITE_API || '/api';
let token = localStorage.getItem('fd_token');
export const setToken = (t) => { token = t; t ? localStorage.setItem('fd_token', t) : localStorage.removeItem('fd_token'); };
export async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}
