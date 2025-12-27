import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

import { MegaNoteStorage } from '../storage';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const attachmentsRouter = Router();
const storage = new MegaNoteStorage();

function mimeFromName(name: string) {
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.heic')) return 'image/heic';
  return 'application/octet-stream';
}

attachmentsRouter.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file_missing' });
    const id = uuidv4();
    await storage.uploadAttachment(id, req.file.buffer, req.file.mimetype);
    const createdAt = Date.now();
    const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const uri = `${baseUrl}/attachments/${id}`;
    res.json({
      attachment: {
        id,
        uri,
        mimeType: req.file.mimetype,
        createdAt,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('attachments upload error', err);
    res.status(500).json({ error: 'upload_failed' });
  }
});

attachmentsRouter.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await storage.downloadAttachment(id);
    if (!result) return res.status(404).json({ error: 'not_found' });
    res.contentType(mimeFromName(result.name));
    res.send(result.buffer);
  } catch (err) {
    console.error('attachments download error', err);
    res.status(500).json({ error: 'download_failed' });
  }
});

export default attachmentsRouter;
