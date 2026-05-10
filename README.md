# NoteNest

NoteNest is now organized as a two-app monorepo:

- `apps/mobile`: Flutter mobile app for Android and iOS.
- `apps/web`: Next.js web app with API routes that front MEGA cloud storage.

The Next.js API keeps MEGA credentials server-side and exposes the same sync contract to both clients.

## Quick Start

```bash
copy .env.example apps\web\.env.local
npm.cmd install
npm.cmd run web:dev
```

For mobile:

```bash
cd apps/mobile
flutter pub get
flutter run
```

See `docs/setup.md` and `docs/api.md` for configuration and API details.
