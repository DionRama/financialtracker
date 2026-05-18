# Financial Tracker

A production-grade personal finance tracking app: track expenses, set
monthly budgets per category, and analyse where your money goes.

Built on **Next.js 16 (App Router) + React 19 + TypeScript (strict) +
Tailwind v4 + shadcn/ui + Supabase (`@supabase/ssr`) + TanStack Query +
React Hook Form + Zod + Recharts**.

> Security model and engineering rules live in **[AGENTS.md](./AGENTS.md)**.
> Anything that conflicts with that file is a bug.

---

## Quick start

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and fill in your Supabase
project credentials:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # server-only
```

> **Publishable key, not anon key.** Supabase rotated to publishable keys
> (`sb_publishable_...`) in 2025; the legacy anon JWT still works but is
> kept only for backward compatibility. Grab the publishable key from
> **Settings → API Keys → Publishable** in the Supabase dashboard.

### 3. Apply the database schema

Open the Supabase SQL editor and run the single file:

```
supabase/migrations/0001_init.sql
```

It is **self-contained** and creates everything:

- 4 tables — `profiles`, `categories`, `expenses`, `budgets`
- RLS enabled with explicit `SELECT / INSERT / UPDATE / DELETE`
  owner-only policies on every table
- Indexes on policy columns and common query paths
- `updated_at` triggers via `moddatetime`
- An `on_auth_user_created` trigger that seeds a profile and a starter
  pack of ~10 categories whenever a user signs up
- A `monthly_totals` view with `security_invoker = on`

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## Features

- **Auth** — email + password and magic link via Supabase Auth.
- **Dashboard** — KPI cards, daily-spend area chart, category pie,
  recent transactions.
- **Expenses** — search, category filter, edit, delete, optimistic UI.
- **Budgets** — per-category monthly limits with progress bars.
- **Categories** — color + icon, archive, custom names.
- **Analytics** — month-vs-month bars and a 6-month trend.
- **Settings** — profile, currency, locale, danger zone.
- **Dark mode default**, mobile-first responsive layout.

---

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
```

---

## Architecture notes

- **`getUser()`, not `getSession()`** — every protected layout and
  every server action verifies the JWT against Supabase.
- **Service-role key isolation** — only `lib/supabase/admin.ts` uses
  it, prefixed with `import "server-only"` so it cannot be imported
  from a client graph.
- **`proxy.ts`, not `middleware.ts`** — Next.js renamed the middleware
  convention in 2026. Proxy defaults to the Node.js runtime; the
  `runtime` config option throws if set. See AGENTS.md §3 and §7.
- **Money as cents** — `bigint` in Postgres, integers in TS, formatted
  via `Intl.NumberFormat`.
- **Server-first data fetching** — server components read, server
  actions write and `revalidatePath`.
- **Zod everywhere on the boundary**.

---

## License

MIT
