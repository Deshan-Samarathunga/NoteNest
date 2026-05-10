# NoteNest Setup

## Environment

Create `apps/web/.env.local` with:

```env
MEGA_EMAIL=
MEGA_PASSWORD=
MEGA_FOLDER_NAME=NoteNest
SESSION_SECRET=replace-with-a-long-random-secret
AUTH_USERNAME=admin
AUTH_PASSWORD=change-me
ENABLE_ENCRYPTION=false
PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

The web app and API run together in `apps/web`. MEGA credentials must only be configured on the server.

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
