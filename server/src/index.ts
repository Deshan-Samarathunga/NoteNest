import 'dotenv/config';
import cors from 'cors';
import express from 'express';

import syncRouter from './routes/sync';
import labelsRouter from './routes/labels';
import attachmentsRouter from './routes/attachments';
import authRouter from './routes/auth';
import notesRouter from './routes/notes';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: Date.now() });
});

app.use('/sync', syncRouter);
app.use('/labels', labelsRouter);
app.use('/attachments', attachmentsRouter);
app.use('/auth', authRouter);
app.use('/notes', notesRouter);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`NoteNest server listening on http://localhost:${PORT}`);
});
