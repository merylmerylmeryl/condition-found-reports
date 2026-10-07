// Mirrors the API contract. Duplicated rather than shared via a package: for two
// small apps that's cheaper than a monorepo workspace; revisit if the types grow.
export const severities = ['low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof severities)[number];
export const statuses = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type Status = (typeof statuses)[number];

export interface Cfr {
  id: string;
  title: string;
  description: string;
  location: string;
  severity: Severity;
  status: Status;
  created_at: string; // ISO 8601, assigned by the server
}

// What the client sends: no created_at (server-owned), but it does supply the id.
export type NewCfr = Omit<Cfr, 'created_at' | 'status'>;


export const sortKeys = ['created_at', 'title', 'location', 'severity', 'status'] as const;
export type SortKey = (typeof sortKeys)[number];

// Everything the user can change in the list view. One object = one source of truth
// that maps 1:1 onto the API's query string.
export interface CfrQuery {
  q: string;
  severity: Severity[];
  status: Status[];
  sort: SortKey;
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface CfrPage {
  items: Cfr[];
  total: number;
  page: number;
  pageSize: number;
}
