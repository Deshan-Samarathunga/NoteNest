import { Router } from 'express';

import { MegaNoteStorage } from '../storage';
import { NotePayload } from '../types';

const syncRouter = Router();
const storage = new MegaNoteStorage();

syncRouter.get('/pull', async (req, res) => {
  try {
    const since = Number(req.query.since ?? 0);
    const result = await storage.syncPull(Number.isNaN(since) ? 0 : since);
    const labels = await storage.getLabels();
    res.json({ ...result, labels });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('sync/pull error', err);
    res.status(500).json({ error: 'pull_failed' });
  }
});

syncRouter.post('/push', async (req, res) => {
  try {
    const notes = (req.body?.notes ?? []) as NotePayload[];
    if (!Array.isArray(notes)) {
      return res.status(400).json({ error: 'invalid_payload' });
    }
    const result = await storage.syncPush(notes);
    res.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('sync/push error', err);
    res.status(500).json({ error: 'push_failed' });
  }
});

export default syncRouter;
