# yournal

A journal that lives on a calendar. Click a day, write about it, and the days
you've already written on get a little dot.

Built over a two-week break. The frontend never talks to the database, only to
the Express API, so I can point a React Native app at the same endpoints later
without rewriting anything.

## Stack

React + Vite on the frontend with react-day-picker for the calendar. Node and
Express 5 (ESM) on the backend. Postgres through Supabase, which also handles
sign up and sign in. Tokens go in an `Authorization: Bearer` header, no cookies
or sessions.

Both halves are hosted on Vercel, as two separate projects from this one repo.

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
  src/api/            fetch wrapper, one function per endpoint, supabase client
  src/hooks/          useSession
  src/lib/            date helpers
  src/components/     Journal, CalendarView, EntryEditor, LoginForm, SignUpForm
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
cp .env.example .env   # fill it in
npm run dev            # localhost:5173
```

Then open the app and make an account on the sign up screen.

If "Confirm email" is on in Supabase (Authentication → Sign In / Providers →
Email), sign up won't log you in until you click the link in your inbox. The
built-in mailer only sends a few emails an hour, so I leave it off while
developing.

### server/.env

| Variable              | Notes                                          |
| --------------------- | ---------------------------------------------- |
| `SUPABASE_URL`        | Just the project URL, no `/rest/v1` on it      |
| `SUPABASE_SECRET_KEY` | `sb_secret_...`, server only, bypasses RLS     |
| `PORT`                | 3000 locally. Don't set it on Vercel           |
| `CORS_ORIGIN`         | The web app's URL, exactly. No trailing slash  |
| `DEV_USER_ID`         | Optional, local only. See Auth                 |

### web/.env

| Variable                 | Notes                                        |
| ------------------------ | -------------------------------------------- |
| `VITE_API_URL`           | The server's URL, no trailing slash          |
| `VITE_SUPABASE_URL`      | Same project URL as the server               |
| `VITE_SUPABASE_ANON_KEY` | The `sb_publishable_...` key, never the secret one |

`.env` files are gitignored.

Anything starting with `VITE_` gets baked into the JavaScript at build time and
anyone can read it, which is fine for a URL and a publishable key and a
disaster for anything else.

Only `npm run dev` reads `server/.env`, via `node --env-file`. In production
the host injects real env vars and there's no file to read.

## Auth

The browser signs in with Supabase directly (`signInWithPassword`, `signUp`).
`useSession` listens for auth changes and hands the access token to the API
client with `setToken`, so every request after that carries it. It also
catches Supabase's silent token refresh, which matters because access tokens
only last an hour.

`App` has three states: still checking (render nothing), signed out (login or
sign up form), signed in (the journal). The journal only mounts after the token
is set, so its first fetch never goes out without one.

On the server, `requireAuth` checks the token with Supabase and puts the user id
on `req.userId`. Every route reads it from there. Never from the query string
or the body, otherwise anyone could read anyone else's journal by editing a URL.

`DEV_USER_ID` is a leftover from before auth existed: a request with *no*
token gets treated as that user. Handy for curling the API locally. **It must
never be set in production**, where it would give anyone without a token that
person's whole journal.

## API

Everything needs `Authorization: Bearer <token>`. Dates are `YYYY-MM-DD`, and
anything malformed (or fake, like `2026-02-30`) gets a 400.

| Method | Path                 | Does                                  |
| ------ | -------------------- | ------------------------------------- |
| GET    | `/health`            | `{ ok: true }`, no auth needed        |
| GET    | `/entries?from=&to=` | Entries in a range, for the dots      |
| GET    | `/entries/:date`     | One entry, or `null` if there's none  |
| PUT    | `/entries/:date`     | Creates or updates, returns the entry |
| DELETE | `/entries/:date`     | Deletes that day's entry              |

`PUT` instead of `POST` because the date *is* the identity of an entry. Saving
twice should update one row, not create two, and the unique index on
`(user_id, date)` enforces that.

An empty day comes back as `200` with a `null` body rather than a 404. The
client checks the value, not the status code.

Clearing a day deletes the row instead of saving empty text, so the dot goes
away and there are no blank entries hanging around.

## Deploying

Two Vercel projects pointing at this repo:

1. **API.** Root directory `server`. Vercel picks up the Express app from
   `src/index.js` without any config. Set `SUPABASE_URL` and
   `SUPABASE_SECRET_KEY`. Check `/health` works.
2. **Web.** Root directory `web`, Vite gets detected. Set the three `VITE_`
   variables, with `VITE_API_URL` pointing at the API project.
3. **Connect them.** Set `CORS_ORIGIN` on the API project to the web URL, then
   redeploy the API. Env var changes on Vercel only apply to new deployments.
   In Supabase, set Authentication → URL Configuration → Site URL to the web
   URL too.

Things that caught me or nearly did:

- Use each project's fixed `<name>.vercel.app` address. The per-deployment URLs
  with a hash in them can sit behind Vercel's login and 401 for reasons that
  have nothing to do with your code.
- Changing a `VITE_` variable means rebuilding the web project, since the value
  is compiled in.
- A CORS mismatch shows up in the app as "can't reach the server", because the
  browser throws away the response before the code ever sees it.

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
- [x] Express API: list, get, save, delete
- [x] Calendar with dots on days that have entries
- [x] Editor that saves, clears, and updates the dot right away
- [x] Sign up, sign in, sign out
- [ ] Deploy (in progress)
- [ ] Server-side validation for entry content and mood
- [ ] Don't lose unsaved text when clicking another day
- [ ] Maybe: mood tags, search, streaks, markdown
