# NoteNest Setup

## Environment

Create `apps/web/.env.local` with:

```env
MEGA_FOLDER_NAME=NoteNest
SESSION_SECRET=replace-with-a-long-random-secret
ENABLE_ENCRYPTION=false
PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

The web app and API run together in `apps/web`. You sign in with your **real
mega.nz email and password** on the login screen — there is no separate app login
and no MEGA account configured on the server. Each user's notes are stored in the
`MEGA_FOLDER_NAME` folder inside their own MEGA Drive.

`SESSION_SECRET` both signs session tokens and encrypts the MEGA credentials
carried inside them, so keep it long, random, and secret.

## Web

```bash
npm.cmd install
npm.cmd run web:dev
```

Open `http://localhost:3000`.

## Mobile

```bash
cd apps/mobile
flutter pub get
flutter run
```

Set the API base URL in mobile settings. Android emulators usually need `http://10.0.2.2:3000/api`; iOS simulators can use `http://localhost:3000/api`; physical devices need the computer LAN IP.
