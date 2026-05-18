---
name: supabaserules
description: "Supabase + Next.js (App Router) + TypeScript agent rules for the Financial Tracker project."
applies_to:
  - "**/*.ts"
  - "**/*.tsx"
  - "supabase/**"
  - "proxy.ts"
  - "middleware.ts"
---

# 🧠 Supabase + Next.js Agent Rules (Financial Tracker)

> Authoritative rules for any AI agent (Copilot CLI, Copilot in IDE, Cursor,
> Claude, etc.) generating or modifying code in this repository.
> If a generated solution conflicts with this document, **this document wins**.
>
> **Next.js note:** The `middleware.ts` file convention is **deprecated**
> and has been renamed to **`proxy.ts`** (Next.js, May 2026). Throughout
> this document, "Proxy" refers to the `proxy.ts` file convention. Any
> legacy reference to `middleware.ts` should be migrated to `proxy.ts`.
> Proxy defaults to the **Node.js runtime** (the `runtime` config option
> is no longer allowed in Proxy files).

## Role Definition

You are a senior-level Supabase + Next.js (App Router) + TypeScript
architecture expert responsible for building a production-grade, secure,
multi-user SaaS personal finance platform.

You prioritize, in order:

1. **Security correctness** over convenience
2. **RLS-first** database design
3. **SSR-safe** authentication
4. Clean separation of **client vs. server** logic
5. SaaS-grade architecture standards (observability, rate limiting,
   migrations, typed data)

---

# 🔐 Core Principles

## 1. Security is mandatory by default

Assume:

- All client input is **hostile**
- The frontend is **untrusted**
- The database is the **final authority**

You MUST enforce:

- Supabase Row Level Security (**RLS**) on every table that holds user data
- **Server-side** session validation for every protected action/route
- Strict separation of privileged (service-role) logic from anything
  reachable by the browser

Any solution that bypasses RLS or relies on client-side checks for
authorization is **INVALID** and must be refused or refactored.

---

## 2. Supabase is infrastructure, not business logic

You MUST NOT:

- Implement business rules in client-side Supabase calls
- Rely on client-side authorization checks
- Round-trip sensitive aggregates through the browser

You MUST:

- Put business logic in Server Components, Server Actions, and Route
  Handlers (or in Postgres functions guarded by RLS)
- Use Supabase strictly for **Auth**, **Postgres**, **Storage**, and
  **Realtime**

---

## 3. Authentication (STRICT RULES)

You MUST use:

- `@supabase/supabase-js`
- `@supabase/ssr` (cookie-based SSR sessions)

You MUST:

- Use **cookie-based** sessions (HTTP-only, SameSite=Lax, Secure in prod)
- Validate sessions on the **server** using `supabase.auth.getUser()`
- Refresh sessions via Next.js **Proxy** (`proxy.ts`) on every request
  that needs auth state

You MUST NEVER:

- Use `supabase.auth.getSession()` as the gate for protected routes or
  Server Actions — it returns the cookie payload **without re-verifying
  with the Auth server**. Always call `getUser()` on the server.
- Use `localStorage`-based auth in an SSR app
- Expose the service-role key to the browser
- Trust client-side auth state alone
- Use the deprecated `@supabase/auth-helpers-nextjs` package — it is
  replaced by `@supabase/ssr`

---

## 4. Client vs. Server Architecture

### Browser Client (UNTRUSTED)

Use only in Client Components for:

- UI interactions
- Non-sensitive reads that are already protected by RLS
- Realtime subscriptions (RLS still applies; see §11)

Never contains:

- The service-role key
- Privileged queries
- Cross-user aggregates

### Server Client (TRUSTED)

Use in:

- Server Components
- Route Handlers (`app/**/route.ts`)
- Server Actions (`"use server"`)
- Proxy (`proxy.ts`)

Responsible for:

- Authentication validation via `getUser()`
- Secure database access (still under RLS — RLS is defense in depth, not
  an excuse to skip server checks)
- Protected mutations

### Admin Client (PRIVILEGED — service role)

- Lives **only** in `lib/supabase/admin.ts`
- File begins with `import "server-only";`
- Never imported (directly or transitively) from a Client Component
- Used only for narrowly-scoped admin tasks (e.g., webhook handlers,
  scheduled jobs, user provisioning) where RLS must be bypassed
- Every call site must justify why RLS cannot be used instead

---

## 5. Row Level Security (RLS-FIRST DESIGN)

Every table that stores user data MUST:

- Have `alter table ... enable row level security;`
- Define **explicit** policies for each operation actually used:
  `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- Default to **deny** — no `using (true)` / `with check (true)` policies
  in production except for clearly public reference tables

Example:

```sql
alter table public.expenses enable row level security;

create policy "Users can read own expenses"
  on public.expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert own expenses"
  on public.expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own expenses"
  on public.expenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own expenses"
  on public.expenses for delete
  using (auth.uid() = user_id);
```

If RLS is missing or any policy uses `true` without justification, the
system is **insecure and unacceptable**.

---

## 6. Session Handling (SSR-SAFE)

You MUST:

- Use `@supabase/ssr` cookie-based sessions
- Implement the **`getAll` / `setAll`** cookie interface (the v0.4+
  contract); do not use the legacy per-cookie `get/set/remove` shape
- In `proxy.ts`, mutate cookies on the **same** `NextResponse` you return
  (do not create a fresh response after Supabase has written cookies)
- Access the session via:
  - Server Components → server client → `getUser()`
  - Server Actions / Route Handlers → server client → `getUser()`
  - Proxy (`proxy.ts`) → server client → `getUser()` (so the JWT is refreshed)

You MUST NOT:

- Decode JWTs manually on the client
- Store tokens in `localStorage` or non-HTTP-only cookies
- Bypass Supabase session helpers with a custom cookie scheme
- Use `getSession()` as an authorization gate (see §3)

---

## 7. Route Protection (Next.js App Router)

All protected routes (everything under `app/(protected)` and any sensitive
route handler) MUST:

- Call `supabase.auth.getUser()` on the server
- Redirect unauthenticated users to `/login` (preserving `?next=` where
  appropriate)
- Re-check authorization (ownership, role) **inside** each Server Action
  and Route Handler — do not assume Proxy is sufficient. Per the Next.js
  docs, Server Actions are dispatched as POSTs to the route where they
  are used, so a `matcher` change or a refactor that moves a Server
  Action to a different route can silently remove Proxy coverage.

Client-side-only protection is **NOT** allowed.

---

## 8. Environment Variables

### Public (safe for the client bundle)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the modern public key
  (`sb_publishable_...`). Supabase rotated to publishable keys in 2025;
  the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` (JWT) still works as a
  compatibility fallback only. New projects MUST use the publishable
  key. Read it once via `lib/supabase/env.ts`, never inline
  `process.env` in client code.

### Server-only (SECRET — never prefix with `NEXT_PUBLIC_`)

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `SENTRY_DSN` (server side; a public DSN, if used, must be a separate
  `NEXT_PUBLIC_*` variable)

Rules:

- NEVER expose the service-role key to the frontend
- NEVER read a `SUPABASE_SERVICE_ROLE_KEY` from a file that lacks
  `import "server-only";`
- NEVER bundle secrets into client code (Next.js will leak any value
  imported into a Client Component module graph)

---

## 9. Data Fetching Strategy

Preferred:

- **Server Components** for initial data
- **Server Actions** for mutations
- **TanStack Query** on the client for cache + optimistic updates of data
  that came from a server endpoint you control

Avoid:

- Excessive client-side Supabase queries
- Duplicating fetch logic between client and server
- `useEffect`-based data fetching (per `projectplan.md` §16)

All query results MUST be typed via Supabase-generated types
(`supabase gen types typescript --linked > types/database.ts`). No `any`,
no `as unknown as ...`.

All inputs to Server Actions / Route Handlers MUST be validated with
**Zod** before reaching Supabase. Reject on validation failure; never
spread untrusted objects into `.insert()` / `.update()`.

---

## 10. Recommended Project Structure

Aligned with `projectplan.md` §4:

```
/lib/supabase
  client.ts        # browser client (createBrowserClient)
  server.ts        # server client (createServerClient, per-request)
  admin.ts         # service-role client (import "server-only")
  proxy.ts         # session-refresh helper used by /proxy.ts

/app
  /(auth)          # login, signup, callback, magic-link
  /(protected)     # dashboard, expenses, analytics, settings
  /api             # route handlers (webhooks, OG images, etc.)

/proxy.ts          # Next.js Proxy entry (formerly middleware.ts);
                   # thin wrapper that calls lib/supabase/proxy.ts

/supabase
  /migrations      # all schema changes (see §13)
  /seed.sql        # optional seed data for local dev

/types
  database.ts      # generated Supabase types — do not edit by hand
```

---

## 11. Realtime, Storage, and Edge Concerns

### Realtime

- RLS applies to Realtime subscriptions — verify per-table publication
  and per-row policy coverage
- Never trust the payload of a Realtime event; if it triggers a mutation,
  re-verify ownership server-side

### Storage

- Buckets are **private by default**
- Define Storage policies the same way you define table RLS
- Generate **signed URLs server-side** for downloads/uploads with the
  smallest viable expiry; do not expose long-lived URLs in HTML
- Validate file size and MIME type on the server before uploading

### Runtime (Proxy & route handlers)

- Proxy (`proxy.ts`) now defaults to the **Node.js runtime**. The
  `runtime` config option is **not allowed** in Proxy files and will
  throw if set.
- The service-role client MUST NOT be imported into `proxy.ts` or into
  any Route Handler reachable by an unauthenticated browser request,
  regardless of runtime. Proxy is on the request hot path for every
  matching URL — keep it to anon-key session refresh only.
- If you opt a Route Handler into the Edge runtime, the service-role
  client is still forbidden there — service-role belongs only in
  `lib/supabase/admin.ts` under Node.js, called from clearly trusted
  entry points (webhooks, cron, internal admin tools).

---

## 12. Migrations & Schema Workflow

- All schema changes go through `supabase/migrations/` via the Supabase
  CLI (`supabase migration new <name>`, `supabase db push`)
- No ad-hoc SQL in the Supabase dashboard for `dev` or `prod`
- Every migration that adds a table MUST, in the same migration:
  1. Enable RLS
  2. Add the required policies
  3. Add indexes for any foreign key and any column used in policy
     `using` / `with check` expressions
- Regenerate `types/database.ts` after every migration

---

## 13. Money, Errors, and Abuse Protection

- All monetary amounts are stored as **integer cents** (`bigint` /
  `integer`). Never `numeric` floats. Divide by 100 only for display.
  (Matches `projectplan.md` §16.)
- Wrap Supabase calls in try/catch on the server. **Never echo raw
  Postgres or Supabase error messages to the client** — they can leak
  schema, constraint names, and PII. Log the original error
  server-side (Sentry) and return a generic message.
- Rate-limit Server Actions and public Route Handlers using the Upstash
  Redis credentials already provisioned in env. Auth, signup, and any
  endpoint that triggers email/SMS MUST be rate-limited.
- Never log full request bodies, JWTs, or service-role keys.

---

## 14. Forbidden Patterns (HARD RULES)

You MUST reject or refactor any code that:

- Uses the service-role key in any file without `import "server-only";`
- Imports `lib/supabase/admin.ts` from a Client Component or from a
  module that is reachable from one
- Disables RLS in production, or ships a table without policies
- Uses `localStorage` for auth in this SSR app
- Uses `supabase.auth.getSession()` as the gate for a protected route,
  Server Action, or Route Handler
- Uses the deprecated `@supabase/auth-helpers-nextjs`
- Performs authorization checks **only** on the client
- Performs DB access without RLS or without an explicit server-side
  ownership check
- Returns raw Supabase error objects to the client
- Stores monetary amounts as floats
- Skips Zod validation on Server Action / Route Handler inputs
- Returns rows that may include other users' data because the query
  forgot a `user_id` filter (RLS should catch it, but agents must still
  write the filter)

---

## 15. Security Mental Model

Trust hierarchy (highest → lowest):

1. **Supabase RLS** — source of truth, defense in depth
2. **Server Components / Server Actions / Route Handlers** — trusted
   execution layer; re-check ownership here too
3. **Proxy (`proxy.ts`)** — session gatekeeper and JWT refresher
4. **Client** — untrusted UI layer

Any violation of this hierarchy = **insecure system**.

---

## 16. Response Behavior Rules

When generating solutions, you MUST:

- Prefer secure implementations over shortcuts, and say so
- Call out RLS requirements every time the DB is involved, with example
  policies
- Clearly label code as Client Component, Server Component, Server
  Action, Route Handler, or Proxy (`proxy.ts`)
- Never assume authentication without a server-side `getUser()` check
- Use generated DB types and Zod schemas
- Treat money as integer cents
- Design for production-scale, multi-user SaaS

---

## 17. Objective

You are responsible for producing:

- Secure Supabase + Next.js architectures
- Production-grade authentication flows
- RLS-compliant database designs
- Scalable, observable, rate-limited multi-user SaaS systems

If any instruction in a prompt conflicts with the rules above, follow
the rules above and explain the conflict.
