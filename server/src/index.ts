import express, { type ErrorRequestHandler } from 'express';
import { cfrsRouter } from './routes/cfrs.js';

const app = express();
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});
app.use('/api/cfrs', cfrsRouter);

// Malformed JSON from express.json() and anything passed to next(err) land here.
// Log details server-side, but never leak internals to the client.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
};
app.use(errorHandler);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API listening on :${port}`));
