// Mirrors the API contract. Duplicated rather than shared via a package: for two
// small apps that's cheaper than a monorepo workspace; revisit if the types grow.
export const severities = ['low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof severities)[number];
export type Status = 'open' | 'in_progress' | 'resolved' | 'closed';

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
