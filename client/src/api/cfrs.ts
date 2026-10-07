import type { Cfr, NewCfr } from '../types';

// Thin typed wrapper so components never touch fetch/URLs directly.
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export const listCfrs = () => request<Cfr[]>('/api/cfrs');

export const createCfr = (cfr: NewCfr) =>
  request<Cfr>('/api/cfrs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfr),
  });
