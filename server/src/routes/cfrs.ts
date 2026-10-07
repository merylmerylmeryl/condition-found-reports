import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { writeCfrPdf } from '../pdf.js';

// Validate at the boundary with zod: the DB CHECKs are the last line of defense, but
// this gives clients readable 400s instead of opaque constraint errors.
export const severities = ['low', 'medium', 'high', 'critical'] as const;
export const statuses = ['open', 'in_progress', 'resolved', 'closed'] as const;

const createSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).default(''),
  location: z.string().trim().min(1).max(200),
  severity: z.enum(severities),
  status: z.enum(statuses).default('open'),
});

// API says `location`; the column is `ship_location` ("location" is vague in SQL).
// Aliasing in SELECT keeps that mapping in one place.
const COLUMNS = 'id, title, description, ship_location AS location, severity, status, created_at';

// Sort keys are mapped to SQL here and never interpolated from user input, so the
// ORDER BY can't be used for injection. Severity sorts by rank, not alphabetically
// ("critical" < "high" < "low" is useless to a user).
const SORT_SQL = {
  created_at: 'created_at',
  title: 'lower(title)',
  location: 'lower(ship_location)',
  status: 'status',
  severity: `CASE severity WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 WHEN 'critical' THEN 4 END`,
} as const;

// Filters are comma-separated in the URL (?severity=high,critical) and validated
// against the same enums as writes.
const csvEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',') : []))
    .pipe(z.array(z.enum(values)));

// Shared by the list and export endpoints, so a PDF always matches what the user filtered.
const filterSchema = z.object({
  q: z.string().trim().max(200).default(''),
  severity: csvEnum(severities),
  status: csvEnum(statuses),
  sort: z.enum(['created_at', 'title', 'location', 'severity', 'status']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const listSchema = filterSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

type Filters = z.infer<typeof filterSchema>;

// Builds WHERE/ORDER BY with $n placeholders; values are always bound parameters.
function buildQuery(f: Filters) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.q) {
    // Escape LIKE wildcards so a user typing "50%" searches for the literal text.
    params.push(`%${f.q.replace(/[\\%_]/g, '\\$&')}%`);
    const p = `$${params.length}`;
    where.push(`(title ILIKE ${p} OR description ILIKE ${p} OR ship_location ILIKE ${p})`);
  }
  if (f.severity.length) {
    params.push(f.severity);
    where.push(`severity = ANY($${params.length})`);
  }
  if (f.status.length) {
    params.push(f.status);
    where.push(`status = ANY($${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  // created_at + id tiebreakers keep ordering (and therefore paging) deterministic.
  const orderSql = `ORDER BY ${SORT_SQL[f.sort]} ${f.order === 'asc' ? 'ASC' : 'DESC'}, created_at DESC, id`;
  return { whereSql, orderSql, params };
}

export const cfrsRouter = Router();

cfrsRouter.post('/', async (req, res, next) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_failed', details: parsed.error.flatten().fieldErrors });
    return;
  }
  const c = parsed.data;
  try {
    // Parameterized query ($n placeholders) -> no SQL injection.
    // created_at is intentionally not accepted from the client; the DB assigns it.
    const { rows } = await pool.query(
      `INSERT INTO cfrs (id, title, description, ship_location, severity, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUMNS}`,
      [c.id, c.title, c.description, c.location, c.severity, c.status],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // 23505 = unique_violation: that client-generated id already exists.
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'id_already_exists' });
      return;
    }
    next(err);
  }
});

cfrsRouter.get('/', async (req, res, next) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_failed', details: parsed.error.flatten().fieldErrors });
    return;
  }
  const { page, pageSize, ...filters } = parsed.data;
  const { whereSql, orderSql, params } = buildQuery(filters);
  try {
    // The total comes from a separate COUNT with the same WHERE, so the UI can render
    // "page X of Y" for the filtered set. (OFFSET paging is fine at this scale; keyset
    // paging would be the upgrade for very large tables.)
    const [count, list] = await Promise.all([
      pool.query<{ total: string }>(`SELECT count(*) AS total FROM cfrs ${whereSql}`, params),
      pool.query(
        `SELECT ${COLUMNS} FROM cfrs ${whereSql} ${orderSql}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, (page - 1) * pageSize],
      ),
    ]);
    // count(*) is a bigint, which pg returns as a string.
    res.json({ items: list.rows, total: Number(count.rows[0].total), page, pageSize });
  } catch (err) {
    next(err);
  }
});

// Declared before any "/:id" route would be, so "export.pdf" is never read as an id.
// Exports ALL rows matching the filters (not just the visible page), capped to bound
// memory/response time. The PDF is generated on the server so it is identical for every
// client and the browser doesn't have to download the whole dataset to build it.
const EXPORT_LIMIT = 5000;

cfrsRouter.get('/export.pdf', async (req, res, next) => {
  const parsed = filterSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'validation_failed', details: parsed.error.flatten().fieldErrors });
    return;
  }
  const { whereSql, orderSql, params } = buildQuery(parsed.data);
  try {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS} FROM cfrs ${whereSql} ${orderSql} LIMIT ${EXPORT_LIMIT}`,
      params,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="condition-found-reports.pdf"');
    writeCfrPdf(rows, res);
  } catch (err) {
    next(err);
  }
});
