# NoteNest API

All app data is stored in MEGA through Next.js API routes under `/api`. Clients authenticate with a bearer token from `/api/auth/login`.

## Auth

- `POST /api/auth/login`
- Body: `{ "username": "admin", "password": "change-me" }`
- Response: `{ "token": "...", "expiresIn": 7200 }`

## Sync

- `GET /api/sync/pull?since=<timestamp>`
- Response: `{ "notes": NotePayload[], "labels": Label[], "serverTime": number }`

- `POST /api/sync/push`
- Body: `{ "notes": NotePayload[] }`
- Response: `{ "serverTime": number }`

## Notes

- `GET /api/notes/:id`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`

Deletes are soft deletes and are represented as note payloads with `deleted: true`.

## Labels

- `GET /api/labels`
- `POST /api/labels` with `{ "name": "Work" }`
- `PUT /api/labels/:id` with `{ "name": "Personal" }`
- `DELETE /api/labels/:id`

## Attachments

- `POST /api/attachments` multipart form field `file`
- `GET /api/attachments/:id`

Attachments are uploaded to MEGA and referenced by notes through `attachments`.
