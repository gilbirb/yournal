# yournal

Calendar-based daily journaling. Pick a day, write an entry, see at a glance
which days you've filled in.

API-first by design: the frontend never touches the database, only the REST
API. A React Native app can be added later against the same endpoints.

## Stack

| Layer    | Choice                                  |
| -------- | --------------------------------------- |
| Frontend | React + Vite, react-day-picker          |
| Backend  | Node + Express 5 (ESM)                  |
| Database | Postgres via Supabase                   |
| Auth     | Supabase tokens, `Authorization: Bearer`|
| Hosting  | Vercel (web) + Railway (server)         |

## Layout

```
sql/schema.sql        run this in the Supabase SQL editor
server/
  src/index.js        express app, middleware, route mounting
  src/db.js           supabase client (secret key, server-only)
  src/middleware/     requireAuth -> req.userId
  src/routes/         REST endpoints
  src/lib/            pure functions: validation, date keys
web/
  src/api/            fetch wrapper + one function per endpoint
  src/lib/            pure helpers (date formatting, etc.)
  src/components/     calendar, editor
```

Rules that keep the mobile app cheap to add later:

- All data access goes through the REST API. No direct DB calls from the client.
- Business logic lives in plain functions under `lib/`, not inside components.
- The API returns raw data. No pre-formatted display strings.

## Setup

**1. Database.** Create a Supabase project, then run `sql/schema.sql` in the SQL
editor. It creates the `entries` table, the uniqueness constraint, the
`updated_at` trigger, and grants access to `service_role`.

That grant is required if the project was created with *"Automatically expose
new tables"* off — without it every query fails with
`permission denied for table entries`.

**2. A user to develop against.** `entries.user_id` has a foreign key to
`auth.users`, so an invented UUID will be rejected. In the dashboard:
Authentication → Users → Add user. Copy its UUID into `DEV_USER_ID`.

**3. Server.**

```bash
cd server
npm install
cp .env.example .env   # then fill it in
npm run dev            # http://localhost:3000
curl localhost:3000/health
```

**4. Web.**

```bash
cd web
npm install
npm run dev            # http://localhost:5173
```

### Environment (`server/.env`)

| Variable                   | Notes                                        |
| -------------------------- | -------------------------------------------- |
| `SUPABASE_URL`             | Project URL only — no `/rest/v1` path        |
| `SUPABASE_SECRET_KEY`      | `sb_secret_...`. Server-only, bypasses RLS   |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...`, for the browser client |
| `SUPABASE_JWKS_URL`        | For verifying tokens                         |
| `PORT`                     | Default 3000                                 |
| `CORS_ORIGIN`              | `http://localhost:5173` in dev               |
| `DEV_USER_ID`              | Dev only — see below                         |

`.env` is gitignored. `.env.example` is the committed template.

Only `npm run dev` loads `.env` (via `node --env-file`). `npm start` doesn't,
because in production Railway injects real environment variables and there is
no file to read.

## Auth

`requireAuth` sets `req.userId` and every route reads it from there — never
from the query string or body, or anyone could read anyone's journal by
editing a URL.

Until the frontend sends real tokens, a request with no `Authorization` header
is treated as `DEV_USER_ID`. **Leave that variable unset in production**, where
a missing token then correctly returns 401. Swapping to real auth means
changing where `req.userId` comes from, and nothing else.

## API

All routes require `Authorization: Bearer <token>` (or the dev fallback).
Dates are `YYYY-MM-DD`; a malformed or non-existent date returns 400.

| Method | Path                       | Returns                              |
| ------ | -------------------------- | ------------------------------------ |
| GET    | `/health`                  | `{ ok: true }`                       |
| GET    | `/entries?from=&to=`       | Entries in the range — calendar dots |
| GET    | `/entries/:date`           | One entry, or `null` if none         |
| PUT    | `/entries/:date`           | Upserts, returns the saved entry     |

`PUT` rather than `POST`: the date is the entry's identity, so saving twice
updates one row instead of creating two. Enforced by a unique index on
`(user_id, date)`.

A day with no entry is `200` with a `null` body, not a 404 — the client checks
the value, not the status code.

```bash
curl -X PUT localhost:3000/entries/2026-08-30 \
  -H 'content-type: application/json' \
  -d '{"content":"hello","mood":"good"}'
```

## Data model

```
entries
  id          uuid pk
  user_id     uuid -> auth.users(id) on delete cascade
  date        date          calendar day, not a timestamp
  content     text
  mood        text          nullable
  created_at  timestamptz
  updated_at  timestamptz   maintained by trigger
```

`date` is a `date`, not `timestamptz`: an entry belongs to a square on a
calendar, not to an instant, and `timestamptz` would drag timezone conversion
into every query. For the same reason, build date keys from local
`getFullYear`/`getMonth`/`getDate` — **never** `toISOString()`, which converts
to UTC and can hand you the wrong day.

RLS is enabled. `service_role` bypasses it, so it doesn't affect the API — it's
there so a leaked publishable key can't read anyone's entries.

## Roadmap

- [x] Schema, migrations, grants
- [x] Express server + Supabase client
- [x] `GET /entries`, `GET /entries/:date`, `PUT /entries/:date`
- [ ] Calendar view with entry indicators
- [ ] Entry editor wired to the API
- [ ] Real auth (login, token storage, drop `DEV_USER_ID`)
- [ ] Deploy: Vercel + Railway
- [ ] Nice-to-haves: mood tags, search, streaks, markdown
