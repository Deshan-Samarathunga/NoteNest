import { Platform } from 'react-native';

import { getServerBaseUrl, getSessionHeaders } from './http';
import { AttachmentMeta } from './types';

function extensionFromMime(mime?: string | null) {
  if (!mime) return '';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('heic')) return '.heic';
  return '';
}

export async function uploadAttachmentFromUri(uri: string, mimeType?: string | null): Promise<AttachmentMeta> {
  const form = new FormData();
  const name = `attachment-${Date.now()}${extensionFromMime(mimeType)}`;

  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    form.append('file', blob, name);
  } else {
    form.append(
      'file',
      {
        uri,
        name,
        type: mimeType || 'application/octet-stream',
      } as any
    );
  }

  const base = getServerBaseUrl();
  const res = await fetch(`${base}/attachments`, {
    method: 'POST',
    headers: getSessionHeaders(),
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Attachment upload failed ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { attachment: AttachmentMeta };
  return json.attachment;
}
