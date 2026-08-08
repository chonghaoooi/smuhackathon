# Running Portfolio Therapist

## 1. Open a terminal in the project folder

```bash
cd C:\Users\Poly\Desktop\hi
```

## 2. Start both servers at once

```bash
pnpm dev
```

This launches the backend (port 4000) and frontend (port 3000) together.

## 3. Open the app

Go to `http://localhost:3000` in your browser.

## 4. Log in

Use one of the seeded accounts:

| Username | Password | Notes |
|---|---|---|
| `therapistdemo` | `therapistdemo123` | Has real trades — good for the actual demo |
| `freshtherapist` | `freshtherapist123` | Zero trades — shows the "not enough data" state |
| `KevanDaGoat67` | `KevanDaGoat67` | Admin account |

## 5. Go to Portfolio Therapist

Click **Portfolio Therapist** in the left sidebar (between Portfolio and Trading History), or navigate directly to `http://localhost:3000/team/therapist`.

## Stopping it

`Ctrl+C` in the terminal running `pnpm dev`.

---

## First-time setup

If `pnpm` isn't recognized in a fresh terminal, install it once with:

```bash
npm install -g pnpm
```

If it's the very first time on a machine, install dependencies before running `pnpm dev`:

```bash
pnpm install
```

## Enabling real AI narration (optional)

By default, the Roast/Serious explanations use a deterministic fallback sentence built from the
detected findings — no external API needed. To get real AI-generated roast/serious text instead:

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Add it to `server/.env`:
   ```
   GEMINI_API_KEY=your-key-here
   GEMINI_MODEL=gemini-2.5-flash
   ```
3. **Restart the backend** — `.env` is only read once at process startup, so editing it while
   `pnpm dev` is already running has no effect until you stop and restart it.
