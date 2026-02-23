import { Router } from 'express';

import { toHttpError } from '../errors';
import { notePayloadSchema } from '../schemas/note';
import { MegaNoteStorage } from '../storage';
import { NotePayload } from '../types';

const notesRouter = Router();
const storage = new MegaNoteStorage();

notesRouter.get('/:id', async (req, res) => {
  try {
    const passphrase = (req.headers['x-passphrase'] as string) || undefined;
    const note = await storage.readActiveNote(req.params.id, passphrase);
    if (!note) return res.status(404).json({ error: 'not_found' });
    res.json({ note, serverTime: Date.now() });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('note/get error', err);
    const httpErr = toHttpError(err, 'note_get_failed');
    res.status(httpErr.status).json({ error: httpErr.error });
  }
});

notesRouter.put('/:id', async (req, res) => {
  try {
    const parsed = notePayloadSchema.safeParse({ ...req.body, id: req.params.id });
    if (!parsed.success) return res.status(400).json({ error: 'invalid_payload' });
    const note = parsed.data as NotePayload;
    const passphrase = (req.headers['x-passphrase'] as string) || undefined;
    await storage.syncPush([note], passphrase);
    res.json({ ok: true, serverTime: Date.now() });
  } catch (err) {
    console.error('note/put error', err);
    const httpErr = toHttpError(err, 'note_put_failed');
    res.status(httpErr.status).json({ error: httpErr.error });
  }
});

notesRouter.delete('/:id', async (req, res) => {
  try {
    const now = Date.now();
    const passphrase = (req.headers['x-passphrase'] as string) || undefined;
    const note: NotePayload = { id: req.params.id, trashed: true, deleted: true, updatedAt: now };
    await storage.syncPush([note], passphrase);
    res.json({ ok: true, serverTime: now });
  } catch (err) {
    console.error('note/delete error', err);
    const httpErr = toHttpError(err, 'note_delete_failed');
    res.status(httpErr.status).json({ error: httpErr.error });
  }
});

export default notesRouter;
