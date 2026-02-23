import { Router } from 'express';

import { toHttpError } from '../errors';
import { MegaNoteStorage } from '../storage';
import { notesPayloadSchema } from '../schemas/note';

const syncRouter = Router();
const storage = new MegaNoteStorage();

syncRouter.get('/pull', async (req, res) => {
  try {
    const since = Number(req.query.since ?? 0);
    const passphrase = (req.headers['x-passphrase'] as string) || undefined;
    const result = await storage.syncPull(Number.isNaN(since) ? 0 : since, passphrase);
    const labels = await storage.getLabels(passphrase);
    res.json({ ...result, labels });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('sync/pull error', err);
    const httpErr = toHttpError(err, 'pull_failed');
    res.status(httpErr.status).json({ error: httpErr.error });
  }
});

syncRouter.post('/push', async (req, res) => {
  try {
    const parsedNotes = notesPayloadSchema.safeParse(req.body?.notes);
    const passphrase = (req.headers['x-passphrase'] as string) || undefined;
    if (!parsedNotes.success) {
      return res.status(400).json({ error: 'invalid_payload' });
    }
    const notes = parsedNotes.data;
    const result = await storage.syncPush(notes, passphrase);
    res.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('sync/push error', err);
    const httpErr = toHttpError(err, 'push_failed');
    res.status(httpErr.status).json({ error: httpErr.error });
  }
});

export default syncRouter;
