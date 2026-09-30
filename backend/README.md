# Campus Queue Manager — Backend

Vision2Web Hackathon scaffold. Node.js + Express + MySQL + Socket.io.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your DB credentials
mysql -u root -p < src/models/schema.sql
npm run seed            # populates demo users, services, and a live-looking queue
npm run dev
```

Server runs on `http://localhost:5000` (or whatever PORT you set).

## Demo logins (after running `npm run seed`)

All passwords: `demo1234`

- `admin@demo.cqm` — admin
- `staff1@demo.cqm` — staff, watches Certificate Counter (3 students already waiting)
- `staff2@demo.cqm` — staff, watches Help Desk (2 students already waiting)
- `aditi@demo.cqm`, `rohan@demo.cqm`, etc. — students, some already mid-queue

Lab Equipment Booking has empty live queue but historical completed/skipped
tokens, so the admin stats chart isn't blank either.

## What's already wired up

- **Auth**: JWT-based, roles are `student` / `staff` / `admin` (`/api/auth/register`, `/api/auth/login`)
- **Student flow**: browse services, join a queue, watch live position + estimated wait, cancel
- **Staff flow**: call next token, mark complete, pause/resume a queue
- **Admin flow**: create new services
- **Live updates**: Socket.io broadcasts queue changes to everyone watching a service — this is your live-demo moment
- **Novel features already built in**:
  - `waitTimePredictor.js` — estimates wait time from queue position × rolling average service time, and the average self-updates (exponential moving average) as real service completions come in
  - `autoSkipNoShows()` — runs every 30s, auto-skips tokens that were called but never claimed within the grace window (`NO_SHOW_GRACE_SECONDS` in `.env`)
  - `staffController.getServiceStats` — powers an analytics dashboard: total tokens, completions, no-show rate, hourly breakdown

## Socket.io events (frontend side)

```js
socket.emit('watchService', serviceId);       // subscribe to a queue's live updates
socket.on('queueUpdate', ({ waiting }) => {}); // full waiting list, re-render position
socket.on('tokenCalled', ({ tokenId }) => {}); // flash/notify when a token is called
socket.on('tokenSkipped', ({ tokenId }) => {});
```

## What's NOT built yet (your job)

- QR-code join flow (generate a QR per service pointing to a join URL; any QR lib + a scanner page works)

## Suggested demo script

1. Two "student" browser tabs join the same service queue → token numbers appear
2. Staff panel calls next → both tabs update live, called student's tile highlights
3. Let one token sit uncalled past the grace window → watch it auto-skip in real time
4. Switch to the analytics tab → show today's stats populating as you've just generated data
