# Cashbux Market Sim

Offline LAN stock market simulator for school investing events.

## Quick start

1. Run `setup.bat`
2. Run `start-server.bat`
3. Open the printed `http://LOCAL-IP:3000` address on devices connected to the same LAN

## Event day checklist

1. Run `setup.bat` once on the host laptop.
2. Start the app with `start-server.bat`.
3. Share the printed LAN URL with players.
4. Use the admin login seeded as `admin` / `admin123`.

## Included

- SQLite-backed backend with JWT auth and Socket.IO
- React + TypeScript frontend
- Admin and team dashboards
- Seed data, snapshots, exports, and Windows batch scripts

## Notes

- The first run wizard appears when no teams or companies exist.
- Event mode adds confirmations and safer admin actions.
- This scaffold already compiles cleanly; the next increment is filling out the remaining admin workflows and richer dashboards.
