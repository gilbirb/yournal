# yournal

A journal that lives on a calendar. Click a day, write about it, and the days
you've already written on get a little dot.

Built over a two-week break. The frontend never talks to the database, only to
the Express API, so I can point a React Native app at the same endpoints later
without rewriting anything.

## Stack

React + Vite on the frontend with react-day-picker for the calendar. Node and
Express 5 (ESM) on the backend. Postgres through Supabase, which also handles
auth. Tokens go in an `Authorization: Bearer` header, no cookies or sessions.

Deploy plan is Vercel for the web app and Railway for the server, though
neither is set up yet.

## Layout

```
sql/schema.sql        paste into the Supabase SQL editor
server/
  src/index.js        express app, middleware, routes
  src/db.js           supabase client (secret key, never shipped to browser)
  src/middleware/     requireAuth, sets req.userId
  src/routes/         the endpoints
  src/lib/            plain functions: validation, date keys
web/
  src/api/            fetch wrapper + one function per endpoint
  src/lib/            date helpers
  src/components/     calendar, editor
```

Three rules I'm trying to stick to so the mobile app is cheap to add:

- Everything goes through the REST API, no direct DB calls from the client.
- Logic lives in plain functions under `lib/`, not buried in components.
- The API returns raw data. Formatting happens in the UI, not the response.

## Getting it running

**Database first.** Make a Supabase project and run `sql/schema.sql` in the SQL
editor. That sets up the `entries` table, the uniqueness constraint, the
`updated_at` trigger, and the grant.

The grant matters if you created the project with "Automatically expose new
tables" turned off. Without it every single query dies with `permission denied
for table entries`, which is a fun half hour to spend.

**Then a user.** `entries.user_id` points at `auth.users`, so a made-up UUID
gets rejected. Go to Authentication → Users → Add user, then drop that UUID
into `DEV_USER_ID`.

**Server:**

```bash
cd server
npm install
cp .env.example .env   # fill it in
npm run dev            # localhost:3000
curl localhost:3000/health
```

**Web:**

```bash
cd web
npm install
npm run dev            # localhost:5173
```

### server/.env

| Variable                   | Notes                                       |
| -------------------------- | ------------------------------------------- |
| `SUPABASE_URL`             | Just the project URL, no `/rest/v1` on it   |
| `SUPABASE_SECRET_KEY`      | `sb_secret_...`, server only, bypasses RLS  |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` for the browser        |
| `SUPABASE_JWKS_URL`        | For verifying tokens                        |
| `PORT`                     | 3000                                        |
| `CORS_ORIGIN`              | `http://localhost:5173` locally             |
| `DEV_USER_ID`              | Dev only, see below                         |

`.env` is gitignored, `.env.example` is the template that gets committed.

Only `npm run dev` reads `.env`, via `node --env-file`. `npm start` doesn't,
because Railway injects real env vars in production and there's no file there
to read.

## Auth

`requireAuth` puts the user id on `req.userId` and every route reads it from
there. Never from the query string or the body, otherwise anyone could read
anyone else's journal by editing a URL.

Until the frontend actually sends tokens, a request with no `Authorization`
header gets treated as `DEV_USER_ID`. That variable has to stay unset in
production, where a missing token should just 401. Switching to real auth means
changing where `req.userId` comes from and nothing else, which was the whole
point of the middleware.

## API

Everything needs `Authorization: Bearer <token>`, or the dev fallback. Dates
are `YYYY-MM-DD`, and anything malformed (or fake, like `2026-02-30`) gets a
400.

| Method | Path                 | Returns                            |
| ------ | -------------------- | ---------------------------------- |
| GET    | `/health`            | `{ ok: true }`                     |
| GET    | `/entries?from=&to=` | Entries in a range, for the dots   |
| GET    | `/entries/:date`     | One entry, or `null` if there's none |
| PUT    | `/entries/:date`     | Upserts and returns the saved entry |

`PUT` instead of `POST` because the date *is* the identity of an entry. Saving
twice should update one row, not create two, and the unique index on
`(user_id, date)` enforces that.

An empty day comes back as `200` with a `null` body rather than a 404. The
client checks the value, not the status code.

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
  date        date          a calendar day, not a timestamp
  content     text
  mood        text          nullable
  created_at  timestamptz
  updated_at  timestamptz   trigger keeps this current
```

`date` is a `date` and not a `timestamptz` on purpose. An entry belongs to a
square on a calendar, not to a moment in time, and using `timestamptz` would
drag timezone conversion into every query.

Same reasoning on the frontend: build date keys out of `getFullYear`,
`getMonth` and `getDate`. Do not use `toISOString()`. It converts to UTC, and
in UTC+10 that quietly gives you yesterday's date for most of the evening.

RLS is on. `service_role` ignores it so the API is unaffected, but it means a
leaked publishable key still can't read anybody's entries.

## Where it's at

- [x] Schema, constraints, grants
- [x] Express server talking to Supabase
- [x] `GET /entries`, `GET /entries/:date`, `PUT /entries/:date`
- [x] Calendar with dots on days that have entries
- [x] Editor wired up, saves and updates the dot immediately
- [ ] Real auth, then delete `DEV_USER_ID`
- [ ] Deploy
- [ ] Maybe: mood tags, search, streaks, markdown
