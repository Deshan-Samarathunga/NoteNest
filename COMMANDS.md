# NoteNest Helpful Commands

## Server
- Install & dev: `cd server && npm install && npm run dev`
- Build: `cd server && npm run build`
- Start built server: `cd server && npm start`

## Client (Expo)
- Install & start (default LAN): `cd client && npm install && npx expo start --clear`
- Start with tunnel (avoids adb reverse): `cd client && npx expo start --tunnel`
- Web only: `cd client && npx expo start --web`

## Device connectivity
- (If you need adb) Install platform tools on Ubuntu/Debian:
  - `sudo apt update && sudo apt install android-sdk-platform-tools-common adb`
- Restart adb: `adb kill-server && sudo adb start-server`

## Environment
- Copy server env: `cd server && cp .env.example .env` then fill values.
