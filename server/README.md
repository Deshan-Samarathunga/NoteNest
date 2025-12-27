# NoteNest Server

Node/Express API that fronts MEGA storage for the NoteNest client.

## Setup
1) Copy `.env.example` to `.env` and fill:
   - `MEGA_EMAIL`, `MEGA_PASSWORD`, `MEGA_FOLDER_NAME`
   - `PORT` (default 4000)
   - `SESSION_SECRET` (JWT signing)
   - `AUTH_USERNAME`, `AUTH_PASSWORD` (demo auth)
   - `ENABLE_ENCRYPTION` (set to `true` when you wire passphrase-handling end-to-end)
2) Install deps: `npm install`
3) Dev server: `npm run dev`
4) Build: `npm run build`

## Routes
- `POST /auth/login` → `{token, expiresIn}`
- `GET /sync/pull?since=<ts>` → changed notes/labels + serverTime
- `POST /sync/push` → upserts notes (last-write-wins by `updatedAt`)
- `GET /notes/:id`, `PUT /notes/:id`, `DELETE /notes/:id` → single-note access (soft delete)
- `GET/POST/PUT/DELETE /labels` → label CRUD
- `POST /attachments` → upload file, returns metadata; `GET /attachments/:id` → download

Notes, labels, and attachments are stored in MEGA under your configured folder. Encryption hooks live in `src/cryptoHelper.ts`; turn on via `ENABLE_ENCRYPTION=true` once the client passes a session passphrase.
