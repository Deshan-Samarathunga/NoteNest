import { z } from 'zod';

const checklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  checked: z.boolean(),
  sortOrder: z.number().int().nonnegative()
});

const attachmentSchema = z.object({
  id: z.string().min(1),
  uri: z.string().min(1),
  mimeType: z.string().nullable().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().nonnegative().optional(),
  createdAt: z.number().finite()
});

export const notePayloadSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    type: z.enum(['TEXT', 'CHECKLIST']).optional(),
    checklist: z.array(checklistItemSchema).optional(),
    labels: z.array(z.string().min(1)).optional(),
    color: z.number().finite().optional(),
    pinned: z.boolean().optional(),
    archived: z.boolean().optional(),
    trashed: z.boolean().optional(),
    reminderAt: z.number().finite().nullable().optional(),
    notificationId: z.string().nullable().optional(),
    attachments: z.array(attachmentSchema).optional(),
    createdAt: z.number().finite().optional(),
    updatedAt: z.number().finite(),
    deleted: z.boolean().optional()
  })
  .strict();

export const notesPushSchema = z.object({
  notes: z.array(notePayloadSchema)
});
