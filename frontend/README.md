# Campus Queue Manager — Frontend

React + Vite + Tailwind + Socket.io-client. Departure-board visual style:
navy background, amber accent reserved for "happening now," monospace
numerals for tokens.

## Setup

```bash
npm install
cp .env.example .env   # point at your running backend
npm run dev
```

Runs on `http://localhost:5173`.

## Pages

- `/login` — login/register, picks student/staff/admin role
- `/join` (student) — browse active services, join a queue
- `/board/:serviceId?token=<id>` — the live board: your position, estimated
  wait, and the full waiting list updating in real time via Socket.io. This
  is the page to have open on a phone during the demo.
- `/staff` (staff/admin) — call next, mark complete, pause/resume
- `/admin` (admin) — create new services, view today's stats + hourly volume
  chart (no-show rate is surfaced here — that's your innovation feature made
  visible to judges)

## Not built yet

- QR code generation/scanning for the "remote join" flow — a QR pointing to
  `/join?service=<id>` plus any QR lib (e.g. `qrcode.react`) covers the
  generation side; scanning can just be the phone camera app, no in-app
  scanner needed for a hackathon demo
- Seed script on the backend for pre-loaded demo data
