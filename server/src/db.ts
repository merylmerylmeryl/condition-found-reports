import pg from 'pg';

// A Pool (not a single Client) so concurrent requests each get a connection and
// connections are reused. Config comes only from the environment.
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
