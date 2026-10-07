import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';

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

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

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
  try {
    // id as a tiebreaker keeps ordering (and thus pagination) deterministic.
    const { rows } = await pool.query(
      `SELECT ${COLUMNS} FROM cfrs ORDER BY created_at DESC, id LIMIT $1 OFFSET $2`,
      [parsed.data.limit, parsed.data.offset],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
