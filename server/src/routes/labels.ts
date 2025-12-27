import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { MegaNoteStorage } from '../storage';

const labelsRouter = Router();
const storage = new MegaNoteStorage();

labelsRouter.get('/', async (_req, res) => {
  try {
    const passphrase = (res.req.headers['x-passphrase'] as string) || undefined;
    const labels = await storage.getLabels(passphrase);
    res.json({ labels, serverTime: Date.now() });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('labels/list error', err);
    res.status(500).json({ error: 'labels_list_failed' });
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
    res.status(500).json({ error: 'labels_create_failed' });
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
    res.status(500).json({ error: 'labels_update_failed' });
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
    res.status(500).json({ error: 'labels_delete_failed' });
  }
});

export default labelsRouter;
