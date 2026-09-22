# yournal

A journal that lives on a calendar. Click a day, write about it, and the days
you've written on get a little dot. You can search everything you've written,
either by keyword or by asking a question in plain words, like "when did I
last go to the beach?" or "what did I do last week?".

**Live:** [yournal-frontend.vercel.app](https://yournal-frontend.vercel.app).
There's a shared demo account on the login screen if you just want a look.
Anyone can read and edit it, so don't write anything real in there.

The frontend never talks to the database. Everything goes through one Express
API, which is also what the (early) React Native app uses.

## What it does

- **Calendar journal.** One entry per day. Days with an entry get a dot, and
  saving or clearing updates the dot straight away.
- **Editor.** Loads the day you click, saves with a button or Ctrl/Cmd+Enter,
  and clearing a day deletes the entry rather than leaving a blank one.
- **Keyword search.** Postgres full-text search. It matches word stems, so
  "changing" finds "change". Clicking a result jumps the calendar to that day.
- **AI search.** Flip the AI switch and ask a question. Gemini turns the
  question into search words and a date range, then the same full-text search
  runs over your entries. It shows what it searched for, so a wrong answer is
  easy to understand.
- **Accounts.** Sign up, sign in, sign out. Every journal is private to its
  owner.
- **Light and dark mode,** following your system until you pick one.

## How the AI search works

The model never sees your journal. Only your question goes to Gemini, and what
comes back is a small search plan:

```
"what did I do last week?"   ->  { terms: [],                      from: "2026-09-14", to: "2026-09-20" }
"when did I hurt my ankle?"  ->  { terms: ["ankle","sprain","injury"] }
```

That plan is then validated like any untrusted input before it touches a
query. Terms are stripped down to letters and numbers, so the model can't
sneak in search operators. Dates have to be real `YYYY-MM-DD` dates, or they're
dropped. A plan with only dates and no terms means "every entry in that
range", which is how "what did I do last week" works.

If anything goes wrong (rate limit, missing key, bad output), the route falls
back to a plain keyword search on the question, and says so in the UI. AI
search gets worse; it doesn't break.

Why only the question: Gemini's free tier says submitted content can be used to
improve Google's products. That's fine for a question, not for a private
diary.

**Limits.** Each account gets 10 AI questions a day. The demo account gets 30,
shared by everyone who uses it. The count lives in Postgres (`llm_usage`),
because in-memory counters don't survive on serverless. It resets at midnight
UTC. Over the limit, you get keyword results instead.

## Stack

- **Web:** React 19 + Vite, react-day-picker for the calendar
- **API:** Node + Express 5 (ESM)
- **Database and auth:** Postgres through Supabase
- **AI:** Google Gemini (`gemini-3.5-flash-lite`) via `@google/genai`
- **Mobile:** Expo / React Native (early, see below)
- **Hosting:** Vercel, as two projects from this repo

Auth is token based: `Authorization: Bearer <token>` on every request, no
cookies or sessions.

## Layout

```
sql/schema.sql            everything the database needs, run in the Supabase SQL editor

server/
  src/index.js            express app, CORS, JSON parsing, routes
  src/db.js               supabase client (secret key, server only)
  src/middleware/auth.js  requireAuth: checks the token, sets req.userId
  src/routes/entries.js   every endpoint, plus the shared findEntries query
  src/lib/entries.js      plain functions: isValidDateKey, validatePlan
  src/lib/llm.js          the only file that knows about Gemini: planSearch
  scripts/try-plan.js     run one question through the AI from the terminal

web/src/
  api/                    fetch wrapper, one function per endpoint, supabase client
  hooks/                  useSession, useTheme
  lib/                    date and text helpers
  components/             Journal, CalendarView, EntryEditor, SearchPanel,
                          LoginForm, SignUpForm, ThemeToggle

mobile/src/               Expo app sharing the same api/lib/hooks structure
```

Three rules I stuck to so the mobile app would be cheap to add:

- Everything goes through the REST API, no direct database calls from a client.
- Logic lives in plain functions under `lib/`, not inside components.
- The API returns raw data. Formatting happens in the UI.

## Running it locally

**1. Database.** Make a Supabase project and run `sql/schema.sql` in the SQL
editor. It creates:

- the `entries` table, with one row per user per day
- the `updated_at` trigger
- the full-text search column and its index
- the `llm_usage` table and the `bump_llm_usage` function for AI limits
- the grants the API needs

The grants matter if you created the project with "Automatically expose new
tables" turned off. Without them every query dies with `permission denied`.

The file doesn't turn on row level security for `entries` itself. It relies on
Supabase's "Enable automatic RLS" project setting. If you don't have that on,
run `alter table public.entries enable row level security;` too.

**2. Server:**

```bash
cd server
npm install
cp .env.example .env   # fill it in
npm run dev            # localhost:3000
curl localhost:3000/health
```

**3. Web:**

```bash
cd web
npm install
cp .env.example .env   # fill it in
npm run dev            # localhost:5173
```

Then sign up on the login screen.

If "Confirm email" is on in Supabase (Authentication → Sign In / Providers →
Email), signing up won't log you in until you click the email link. The
built-in mailer only sends a few emails an hour, so I keep it off while
developing.

**Trying the AI prompt on its own**, without the app:

```bash
cd server
node --env-file=.env scripts/try-plan.js "what did I do last week"
```

Each run uses one request from your Gemini free tier. Check your limits per
model at [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit);
they differ a lot. The Flash Lite models get 500 a day, the regular Flash
models 20.

### server/.env

| Variable              | Notes                                                   |
| --------------------- | ------------------------------------------------------- |
| `SUPABASE_URL`        | Just the project URL, no `/rest/v1` on the end          |
| `SUPABASE_SECRET_KEY` | `sb_secret_...`. Server only, bypasses RLS              |
| `GEMINI_API_KEY`      | From Google AI Studio. Without it, AI search falls back to keywords |
| `DEMO_USER_ID`        | UUID of the shared demo account, which gets its own AI limit |
| `PORT`                | 3000 locally. Don't set it on Vercel                    |
| `CORS_ORIGIN`         | The web app's URL, exactly. No trailing slash           |
| `DEV_USER_ID`         | Optional, local only. See Auth                          |

### web/.env

| Variable                 | Notes                                           |
| ------------------------ | ----------------------------------------------- |
| `VITE_API_URL`           | The server's URL, no trailing slash             |
| `VITE_SUPABASE_URL`      | Same project URL as the server                  |
| `VITE_SUPABASE_ANON_KEY` | The `sb_publishable_...` key, never the secret one |

All `.env` files are gitignored.

Anything starting with `VITE_` (or `EXPO_PUBLIC_` on mobile) gets baked into
the JavaScript at build time, where anyone can read it. That's fine for a URL
and the publishable key, and a disaster for anything else. The secret key and
the Gemini key only ever live on the server.

## Auth

The browser signs in with Supabase directly. `useSession` listens for auth
changes and hands the access token to the API client, so every request after
that carries it. It also picks up Supabase's silent token refresh, which
matters because access tokens only last an hour.

`App` has three states: still checking (renders nothing), signed out (login or
sign up), and signed in (the journal). The journal only mounts once the token
is set, so its first request never goes out without one.

On the server, `requireAuth` checks the token with Supabase and puts the user
id on `req.userId`. Every route reads it from there, never from the query
string or the body. Otherwise anyone could read anyone else's journal by
editing a URL.

`DEV_USER_ID` makes requests with *no* token act as that user, which is handy
for curling the API locally. **It must never be set in production**, where it
would hand that person's whole journal to anyone.

## API

Everything except `/health` needs `Authorization: Bearer <token>`. Dates are
`YYYY-MM-DD`, and anything malformed (or fake, like `2026-02-30`) gets a 400.

| Method | Path                  | Does                                          |
| ------ | --------------------- | --------------------------------------------- |
| GET    | `/health`             | `{ ok: true }`                                |
| GET    | `/entries?from=&to=`  | Entries in a range, for the calendar dots     |
| GET    | `/entries/search?q=`  | Keyword search, newest first, up to 50        |
| POST   | `/entries/search/ask` | AI search: `{ question, today }`              |
| GET    | `/entries/:date`      | One entry, or `null` if there's none          |
| PUT    | `/entries/:date`      | Creates or updates, returns the entry         |
| DELETE | `/entries/:date`      | Deletes that day's entry                      |

`/search` and `/search/ask` are defined above `/:date` on purpose. Express
matches routes in order, and `/:date` would otherwise take `search` as a date
and reject it.

`POST /entries/search/ask` returns `{ mode, plan, entries }`:

- `mode` is `ai` if the AI answered, `limited` if the account is over its
  daily limit, or `fallback` if the AI failed. The last two are keyword
  results.
- `plan` is what was actually searched for.
- `today` has to come from the browser. The server runs in UTC, so its idea
  of "today" can be a day off from the user's.

`PUT` instead of `POST` for saving, because the date *is* the identity of an
entry. Saving twice updates one row instead of creating two, and the unique
index on `(user_id, date)` enforces that.

An empty day comes back as `200` with a `null` body rather than a 404. The
client checks the value, not the status code.

## Deploying

Two Vercel projects pointing at this repo:

1. **API.** Root directory `server`. Vercel finds the Express app in
   `src/index.js` with no config. Set every server variable above except
   `PORT` and `DEV_USER_ID`. Check `/health` works.
2. **Web.** Root directory `web`, Vite gets detected. Set the three `VITE_`
   variables, with `VITE_API_URL` pointing at the API project.
3. **Connect them.** Set `CORS_ORIGIN` on the API project to the web URL, then
   redeploy the API. Env var changes on Vercel only apply to new deployments.
   In Supabase, set Authentication → URL Configuration → Site URL to the web
   URL as well.

Things that caught me:

- A trailing slash in `CORS_ORIGIN` breaks every request. The browser's origin
  never has one, and the two have to match exactly.
- A CORS mismatch shows up in the app as "can't reach the server", because the
  browser throws the response away before the code sees it. The console has
  the real error.
- Changing a `VITE_` variable means rebuilding the web project, since the
  value is compiled in.
- Use each project's fixed `<name>.vercel.app` address. The per-deployment URLs
  with a hash in them can sit behind Vercel's login.

## Data model

```
entries
  id             uuid pk
  user_id        uuid -> auth.users(id) on delete cascade
  date           date          a calendar day, not a timestamp
  content        text
  mood           text          nullable, not used by the UI yet
  created_at     timestamptz
  updated_at     timestamptz   kept current by a trigger
  search_vector  tsvector      generated from content, GIN indexed

llm_usage
  user_id        uuid -> auth.users(id) on delete cascade
  day            date          database's date, so a client can't reset it
  count          int
  primary key (user_id, day)
```

`date` is a `date` and not a `timestamptz` on purpose. An entry belongs to a
square on a calendar, not to a moment in time, and `timestamptz` would drag
timezone conversion into every query.

Same on the frontend: build date keys from `getFullYear`, `getMonth` and
`getDate`. Don't use `toISOString()`, which converts to UTC and in UTC+10 gives
you yesterday's date for most of the evening. Going the other way, don't use
`new Date("2026-09-21")` either. That parses as UTC midnight. `fromDateKey` in
`lib/date.js` does it properly.

`search_vector` is a generated column, so Postgres keeps it up to date on
every save and nothing in the API has to remember to.

`bump_llm_usage` increments and returns the count in one statement, so two
requests at once can't both slip under the limit. Only the server's role can
call it. Otherwise someone holding the publishable key could use up another
user's limit.

## Mobile

`mobile/` is an Expo app at the proof-of-concept stage. It signs in with
Supabase and lists this month's entries from the same API, which proves the
whole chain works on a phone: session, token, Express, Supabase. The actual
journal screens aren't built yet.

Its `api/`, `lib/` and `hooks/` folders mirror the web ones, which is the
point of keeping logic out of components. One difference: on a phone or
emulator, `localhost` means the device itself, not your computer.
`mobile/.env.example` lists the address to use for each case.

## Where it's at

- [x] Calendar, editor, save / clear with the dots kept in sync
- [x] Sign up, sign in, sign out
- [x] Keyword search that jumps the calendar to a result
- [x] AI search with fallback and per-account daily limits
- [x] Light and dark mode
- [x] Deployed on Vercel
- [ ] Don't lose unsaved text when switching days
- [ ] Tests for `validatePlan` and the date helpers
- [ ] Rank search results by relevance (`ts_rank`) and highlight matches
      (`ts_headline`), instead of newest first
- [ ] Server-side validation for entry content and mood
- [ ] Mobile journal screens
- [ ] Maybe: mood tags, streaks, markdown
