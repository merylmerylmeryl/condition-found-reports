import type { Cfr, CfrPage, CfrQuery, NewCfr } from '../types';

// Thin typed wrapper so components never touch fetch/URLs directly.
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

// Empty filters are omitted so URLs stay short and match the API defaults.
function toParams(q: Omit<CfrQuery, 'page' | 'pageSize'> & Partial<CfrQuery>): URLSearchParams {
  const p = new URLSearchParams({ sort: q.sort, order: q.order });
  if (q.q) p.set('q', q.q);
  if (q.severity.length) p.set('severity', q.severity.join(','));
  if (q.status.length) p.set('status', q.status.join(','));
  if (q.page) p.set('page', String(q.page));
  if (q.pageSize) p.set('pageSize', String(q.pageSize));
  return p;
}

export const listCfrs = (query: CfrQuery, signal?: AbortSignal) =>
  request<CfrPage>(`/api/cfrs?${toParams(query)}`, { signal });

export const createCfr = (cfr: NewCfr) =>
  request<Cfr>('/api/cfrs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfr),
  });

// Exports everything matching the filters (paging is intentionally dropped), then hands
// the blob to the browser as a download. fetch (rather than a plain link) lets us show
// an error message if the server fails instead of navigating to a JSON error page.
export async function exportPdf(query: CfrQuery): Promise<void> {
  const { page: _page, pageSize: _pageSize, ...filters } = query;
  const res = await fetch(`/api/cfrs/export.pdf?${toParams(filters)}`);
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: 'condition-found-reports.pdf' });
  a.click();
  URL.revokeObjectURL(url);
}
