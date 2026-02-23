import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { toHttpError } from '../errors';
import { MegaNoteStorage } from '../storage';

const labelsRouter = Router();
const storage = new MegaNoteStorage();

labelsRouter.get('/', async (req, res) => {
  try {
    const passphrase = (req.headers['x-passphrase'] as string) || undefined;
    const labels = await storage.getLabels(passphrase);
    res.json({ labels, serverTime: Date.now() });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('labels/list error', err);
    const httpErr = toHttpError(err, 'labels_list_failed');
    res.status(httpErr.status).json({ error: httpErr.error });
  }
});

labelsRouter.post('/', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'invalid_name' });
    const label = { id: uuidv4(), name, updatedAt: Date.now() };
    const passphrase = (req.headers['x-passphrase'] as string) || undefined;
    await storage.upsertLabel(label, passphrase);
    res.json({ label, serverTime: Date.now() });
  } catch (err) {
    console.error('labels/create error', err);
    const httpErr = toHttpError(err, 'labels_create_failed');
    res.status(httpErr.status).json({ error: httpErr.error });
  }
});

labelsRouter.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'invalid_name' });
    const label = { id, name, updatedAt: Date.now() };
    const passphrase = (req.headers['x-passphrase'] as string) || undefined;
    await storage.upsertLabel(label, passphrase);
    res.json({ label, serverTime: Date.now() });
  } catch (err) {
    console.error('labels/update error', err);
    const httpErr = toHttpError(err, 'labels_update_failed');
    res.status(httpErr.status).json({ error: httpErr.error });
  }
});

labelsRouter.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const passphrase = (req.headers['x-passphrase'] as string) || undefined;
    await storage.deleteLabel(id, passphrase);
    res.json({ ok: true, serverTime: Date.now() });
  } catch (err) {
    console.error('labels/delete error', err);
    const httpErr = toHttpError(err, 'labels_delete_failed');
    res.status(httpErr.status).json({ error: httpErr.error });
  }
});

export default labelsRouter;
