import { Router } from 'express';
import { z } from 'zod';

import { MegaNoteStorage } from '../storage';
import { NotePayload } from '../types';

const notesRouter = Router();
const storage = new MegaNoteStorage();

const noteSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  type: z.enum(['TEXT', 'CHECKLIST']).optional(),
  checklist: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        checked: z.boolean(),
        sortOrder: z.number(),
      })
    )
    .optional(),
  labels: z.array(z.string()).optional(),
  color: z.number().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  trashed: z.boolean().optional(),
  reminderAt: z.number().nullable().optional(),
  notificationId: z.string().nullable().optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        uri: z.string(),
        mimeType: z.string().nullable().optional(),
        createdAt: z.number(),
      })
    )
    .optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number(),
  deleted: z.boolean().optional(),
});

notesRouter.get('/:id', async (req, res) => {
  try {
    const passphrase = (req.headers['x-passphrase'] as string) || undefined;
    const note = await storage.readNote(req.params.id, passphrase);
    if (!note) return res.status(404).json({ error: 'not_found' });
    res.json({ note, serverTime: Date.now() });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('note/get error', err);
    res.status(500).json({ error: 'note_get_failed' });
  }
});

notesRouter.put('/:id', async (req, res) => {
  try {
    const parsed = noteSchema.safeParse({ ...req.body, id: req.params.id });
    if (!parsed.success) return res.status(400).json({ error: 'invalid_payload' });
    const note = parsed.data as NotePayload;
    const passphrase = (req.headers['x-passphrase'] as string) || undefined;
    await storage.syncPush([note], passphrase);
    res.json({ ok: true, serverTime: Date.now() });
  } catch (err) {
    console.error('note/put error', err);
    res.status(500).json({ error: 'note_put_failed' });
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
    res.status(500).json({ error: 'note_delete_failed' });
  }
});

export default notesRouter;
