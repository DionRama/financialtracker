# Financial Tracker — Full Project Plan

> A production-grade personal finance platform built with Next.js, React, TypeScript, TailwindCSS, and Supabase.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Folder Structure](#4-folder-structure)
5. [Database Schema](#5-database-schema)
6. [Authentication System](#6-authentication-system)
7. [Phase-by-Phase Build Plan](#7-phase-by-phase-build-plan)
8. [UI/UX Design System](#8-uiux-design-system)
9. [Expense Engine](#9-expense-engine)
10. [Analytics & Charts](#10-analytics--charts)
11. [Performance & Optimization](#11-performance--optimization)
12. [Testing Strategy](#12-testing-strategy)
13. [Deployment & DevOps](#13-deployment--devops)
14. [Future Roadmap](#14-future-roadmap)
15. [Development Rules & Standards](#15-development-rules--standards)

---

## 1. Project Overview

### What We Are Building

A highly sophisticated personal financial tracking web application that allows users to:

- Track every monthly expense with deep categorization
- Create micro-expense records with full detail
- View advanced analytics and multi-period comparisons
- Store and compare historical monthly financial data
- Authenticate securely with personal accounts
- Access responsive dashboards on both desktop and mobile

### User Personas

| Persona | Description | Primary Need |
|---|---|---|
| **Personal tracker** | Individual wanting to understand their spending | Simple expense entry, clear dashboards |
| **Budget optimizer** | User actively trying to reduce spending | Budget limits, overspend alerts, trends |
| **Financial planner** | User with savings goals and long-term vision | Goal tracking, forecasting, comparisons |
| **Power analyst** | User who wants deep data control | Export, filters, custom categories, charts |

### MVP Features (Phase 1–7)

- User authentication (email + OAuth)
- Expense CRUD with categories and tags
- Monthly dashboard with totals
- Category breakdown charts
- Historical month comparison
- Budget limits per category
- Mobile-responsive UI

### Enterprise Features (Phase 8–onwards)

- Subscription detection and tracking
- Receipt upload and storage
- Multi-currency support
- Bank API integrations
- CSV import from bank exports
- Shared household budgets

---

## 2. Tech Stack

### Frontend

| Tool | Purpose | Version |
|---|---|---|
| **Next.js** | Framework (App Router) | 14+ |
| **React** | UI library | 18+ |
| **TypeScript** | Type safety | 5+ |
| **TailwindCSS** | Styling | 3+ |
| **shadcn/ui** | Component library | Latest |
| **Framer Motion** | Animations | Latest |

### State Management

| Tool | Purpose |
|---|---|
| **Zustand** | Global client state (auth, UI preferences) |
| **TanStack Query** | Server state, caching, background refetch |

### Backend & Database

| Tool | Purpose |
|---|---|
| **Supabase** | Backend-as-a-service (Auth, DB, Storage, Realtime) |
| **PostgreSQL** | Relational database via Supabase |
| **Supabase Edge Functions** | Serverless logic (scheduled jobs, notifications) |

### Data Visualization

| Tool | Purpose |
|---|---|
| **Recharts** | Primary chart library (line, bar, pie, area) |
| **Apache ECharts** | Advanced charts (heatmaps, scatter, treemaps) |

### Forms & Validation

| Tool | Purpose |
|---|---|
| **React Hook Form** | Form management |
| **Zod** | Schema validation (shared client + server) |

### Developer Tools

| Tool | Purpose |
|---|---|
| **ESLint + Prettier** | Code quality |
| **Husky** | Pre-commit hooks |
| **Vitest** | Unit testing |
| **Playwright** | End-to-end testing |

---

## 3. Architecture Overview

### Rendering Strategy

```
Public pages (marketing, login, signup)  → Static Site Generation (SSG)
Dashboard pages                          → Server Components + Client Islands
Data-heavy analytics                     → Client Components with TanStack Query
Real-time notifications                  → Supabase Realtime subscriptions
```

### Data Flow

```
User Action
    │
    ▼
React Component (Client)
    │
    ├─► TanStack Query mutation
    │       │
    │       ▼
    │   Next.js Server Action / API Route
    │       │
    │       ▼
    │   Supabase Client (server-side)
    │       │
    │       ▼
    │   PostgreSQL (RLS enforced)
    │       │
    │       ▼
    │   Response → Cache invalidation
    │
    └─► Zustand (local UI state update)
```

### Authentication Flow

```
User visits /dashboard
    │
    ▼
Next.js Proxy (proxy.ts, Node.js runtime)
    │
    ├─ No session → redirect to /login
    │
    └─ Session valid → forward request
            │
            ▼
        Server Component fetches user profile
            │
            ▼
        Page renders with user context
```

---

## 4. Folder Structure

```
financial-tracker/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group (no layout)
│   │   ├── login/
│   │   ├── signup/
│   │   └── reset-password/
│   ├── (dashboard)/              # Protected route group
│   │   ├── layout.tsx            # Sidebar + nav shell
│   │   ├── page.tsx              # Main dashboard
│   │   ├── expenses/
│   │   │   ├── page.tsx          # Expense list
│   │   │   └── [id]/page.tsx     # Expense detail
│   │   ├── analytics/
│   │   │   └── page.tsx          # Charts + reports
│   │   ├── budgets/
│   │   │   └── page.tsx          # Budget management
│   │   ├── savings/
│   │   │   └── page.tsx          # Savings goals
│   │   ├── history/
│   │   │   └── page.tsx          # Monthly history
│   │   └── settings/
│   │       └── page.tsx          # Account settings
│   ├── api/                      # API Routes
│   │   ├── expenses/
│   │   └── analytics/
│   ├── globals.css
│   └── layout.tsx                # Root layout
│
├── components/                   # Shared UI components
│   ├── ui/                       # shadcn/ui base components
│   ├── charts/                   # Chart components
│   │   ├── SpendingTrendChart.tsx
│   │   ├── CategoryPieChart.tsx
│   │   ├── MonthlyComparisonChart.tsx
│   │   └── BudgetProgressBar.tsx
│   ├── expenses/                 # Expense-specific components
│   │   ├── ExpenseForm.tsx
│   │   ├── ExpenseList.tsx
│   │   ├── ExpenseCard.tsx
│   │   └── CategoryBadge.tsx
│   ├── dashboard/                # Dashboard widgets
│   │   ├── SummaryCards.tsx
│   │   ├── RecentExpenses.tsx
│   │   └── QuickAddExpense.tsx
│   └── layout/                   # Layout components
│       ├── Sidebar.tsx
│       ├── TopNav.tsx
│       └── MobileNav.tsx
│
├── lib/                          # Core logic
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── proxy.ts              # Auth proxy helpers (was middleware.ts)
│   ├── services/                 # Business logic services
│   │   ├── expenses.service.ts
│   │   ├── analytics.service.ts
│   │   └── budgets.service.ts
│   ├── hooks/                    # Custom React hooks
│   │   ├── useExpenses.ts
│   │   ├── useAnalytics.ts
│   │   ├── useBudgets.ts
│   │   └── useUser.ts
│   ├── stores/                   # Zustand stores
│   │   ├── ui.store.ts
│   │   └── filters.store.ts
│   ├── utils/                    # Pure utility functions
│   │   ├── currency.ts
│   │   ├── dates.ts
│   │   └── formatters.ts
│   └── validations/              # Zod schemas
│       ├── expense.schema.ts
│       └── budget.schema.ts
│
├── types/                        # Global TypeScript types
│   ├── database.types.ts         # Auto-generated from Supabase
│   ├── expense.types.ts
│   └── analytics.types.ts
│
├── proxy.ts                       # Next.js Proxy (was middleware.ts; Node.js runtime)
├── next.config.ts
├── tailwind.config.ts
└── supabase/
    ├── migrations/               # SQL migration files
    └── seed.sql                  # Dev seed data
```

---

## 5. Database Schema

### Core Tables

#### users (managed by Supabase Auth)
Extended via `profiles` table.

#### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  currency VARCHAR(3) DEFAULT 'EUR',
  locale VARCHAR(10) DEFAULT 'en',
  monthly_income NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### categories
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color VARCHAR(7),
  parent_id UUID REFERENCES categories(id),   -- subcategory support
  is_system BOOLEAN DEFAULT FALSE,            -- built-in defaults
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### expenses
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  description TEXT,
  notes TEXT,
  date DATE NOT NULL,
  payment_method VARCHAR(50),
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_interval VARCHAR(20),             -- monthly, weekly, yearly
  receipt_url TEXT,                           -- Supabase Storage
  tags TEXT[],
  is_deleted BOOLEAN DEFAULT FALSE,           -- soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### budgets
```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  amount NUMERIC(12, 2) NOT NULL,
  period VARCHAR(20) DEFAULT 'monthly',       -- monthly, yearly
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### savings_goals
```sql
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL,
  current_amount NUMERIC(12, 2) DEFAULT 0,
  deadline DATE,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### monthly_snapshots
```sql
CREATE TABLE monthly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_spent NUMERIC(12, 2),
  total_income NUMERIC(12, 2),
  net_savings NUMERIC(12, 2),
  category_breakdown JSONB,                   -- { category_id: amount }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, year, month)
);
```

### Row Level Security Policies

```sql
-- All tables follow the same pattern
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own expenses"
  ON expenses FOR ALL
  USING (auth.uid() = user_id);
```

### Key Indexes

```sql
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_user_month ON expenses(user_id, date_trunc('month', date));
CREATE INDEX idx_budgets_user_period ON budgets(user_id, period);
```

---

## 6. Authentication System

### Providers

- **Email + Password** — primary method
- **Google OAuth** — one-click login
- **Magic Link** — passwordless option

### Implementation

**`proxy.ts`** — runs on every matched request (Node.js runtime; replaces the deprecated `middleware.ts`):

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* getAll / setAll handlers */ } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
```

### Session Strategy

- Sessions stored in **HTTP-only cookies** (managed by `@supabase/ssr`)
- Auto-refresh handled by Supabase client
- Server Components read session via server-side Supabase client
- Client Components use `useUser()` hook backed by Zustand

---

## 7. Phase-by-Phase Build Plan

### Phase 1 — Project Setup (Week 1)

**Goal:** Working skeleton with auth.

- [ ] `npx create-next-app@latest` with TypeScript + Tailwind
- [ ] Install and configure shadcn/ui
- [ ] Set up Supabase project and connect
- [ ] Configure environment variables
- [ ] Implement proxy auth guard (`proxy.ts`)
- [ ] Build login and signup pages
- [ ] Set up ESLint, Prettier, Husky
- [ ] Create base folder structure
- [ ] Deploy to Vercel (preview environment)

**Deliverable:** You can sign up, log in, and be redirected to a blank dashboard.

---

### Phase 2 — Design System (Week 2)

**Goal:** All base UI components ready.

- [ ] Define Tailwind design tokens (colors, spacing, radius, typography)
- [ ] Build `Sidebar` component with navigation links
- [ ] Build `TopNav` with user avatar and quick actions
- [ ] Build `MobileNav` (bottom tab bar)
- [ ] Build `SummaryCard` widget component
- [ ] Build `EmptyState` component
- [ ] Build `LoadingSpinner` and `SkeletonCard`
- [ ] Build `ErrorBoundary` wrapper
- [ ] Implement dark/light mode toggle
- [ ] Verify all components are accessible (keyboard nav, ARIA)

**Deliverable:** A navigable shell with placeholder content in all routes.

---

### Phase 3 — Database & Supabase (Week 2–3)

**Goal:** Schema live, RLS active, types generated.

- [ ] Write and run all SQL migration files
- [ ] Enable Row Level Security on all tables
- [ ] Seed default categories (Food, Transport, Housing, etc.)
- [ ] Generate TypeScript types: `supabase gen types typescript`
- [ ] Create `lib/supabase/client.ts` and `lib/supabase/server.ts`
- [ ] Create `profiles` trigger to auto-create profile on sign-up
- [ ] Test RLS policies manually in Supabase dashboard

**Deliverable:** Database ready, types available, auth auto-creates user profile.

---

### Phase 4 — Expense Engine (Week 3–4)

**Goal:** Full CRUD for expenses.

- [ ] Build `ExpenseForm` with React Hook Form + Zod validation
- [ ] Implement category selector with icon and color display
- [ ] Implement tag input (multi-select)
- [ ] Implement date picker
- [ ] Implement payment method selector
- [ ] Build `expenses.service.ts` with all CRUD functions
- [ ] Build `useExpenses` hook with TanStack Query
- [ ] Build `ExpenseList` with pagination
- [ ] Build `ExpenseCard` with edit/delete actions
- [ ] Implement optimistic updates on mutation
- [ ] Add search input with debounce
- [ ] Add filters: date range, category, amount range
- [ ] Implement soft delete with undo toast
- [ ] Implement recurring expense logic

**Deliverable:** Users can add, edit, delete, and browse all expenses.

---

### Phase 5 — Dashboard (Week 4–5)

**Goal:** Main dashboard with live data.

- [ ] Build `SummaryCards` showing: total spent this month, top category, remaining budget, savings rate
- [ ] Build `RecentExpenses` list (last 5–10)
- [ ] Build `QuickAddExpense` inline form
- [ ] Build `BudgetProgressBar` per category
- [ ] Build `CategorySpendingWidget` (mini pie chart)
- [ ] Build `MonthPicker` for historical navigation
- [ ] Wire all widgets to real Supabase data
- [ ] Add loading skeletons for all widgets
- [ ] Implement dashboard data caching (staleTime: 5min)

**Deliverable:** Fully functional dashboard with real data.

---

### Phase 6 — Categories & Budgets (Week 5)

**Goal:** Full category management and budget system.

- [ ] Build category management page (CRUD)
- [ ] Support subcategories (parent/child)
- [ ] Allow custom icon and color per category
- [ ] Build budget creation form per category
- [ ] Calculate budget utilization in real time
- [ ] Send in-app alert when budget is at 80% / 100%
- [ ] Display budget status on dashboard

**Deliverable:** Users can fully customize categories and set monthly budgets.

---

### Phase 7 — Analytics & Charts (Week 6–7)

**Goal:** Rich data visualization.

- [ ] **Spending Trend** — area chart of daily/weekly spend over a month
- [ ] **Category Breakdown** — pie + donut chart with drill-down
- [ ] **Monthly Comparison** — bar chart comparing last 6 months
- [ ] **Yearly Overview** — heatmap of spending by day (like GitHub contributions)
- [ ] **Cash Flow** — income vs. spending waterfall chart
- [ ] **Budget Progress** — horizontal bar chart per category
- [ ] **Savings Trend** — line chart of savings over time
- [ ] Implement all charts with dark mode support
- [ ] Add chart export (PNG download)
- [ ] Make all charts mobile responsive

**Deliverable:** Full analytics page with interactive charts.

---

### Phase 8 — Historical Reports (Week 7)

**Goal:** Monthly snapshots and comparison.

- [ ] Implement `monthly_snapshots` auto-generation (Edge Function on month-end)
- [ ] Build historical report page with month selector
- [ ] Build month-over-month comparison view
- [ ] Build year-over-year comparison
- [ ] Show category trends across months
- [ ] Export monthly report as PDF

**Deliverable:** Users can review and compare any past month's spending.

---

### Phase 9 — Performance (Week 8–9)

**Goal:** Fast, production-grade performance.

- [ ] Audit all pages with Lighthouse (target: 90+ on all metrics)
- [ ] Implement route-level code splitting (automatic with App Router)
- [ ] Add `loading.tsx` files to all dashboard routes
- [ ] Wrap all charts in `dynamic(() => import(...), { ssr: false })`
- [ ] Implement `ISR` (Incremental Static Regeneration) on public pages
- [ ] Add `staleTime` and `gcTime` tuning in TanStack Query
- [ ] Optimize images with `next/image`
- [ ] Add `React.memo` and `useMemo` where profiler shows re-renders
- [ ] Set up Supabase connection pooling (PgBouncer)

**Deliverable:** Dashboard loads under 2s, Lighthouse 90+ across all pages.

---

### Phase 10 — Testing (Week 9–10)

**Goal:** Reliable, bug-resistant codebase.

- [ ] Unit tests for all service functions (`expenses.service.ts` etc.) with Vitest
- [ ] Unit tests for all Zod validation schemas
- [ ] Unit tests for utility functions (currency, dates, formatters)
- [ ] Integration tests for auth flows
- [ ] E2E tests with Playwright:
  - Sign up → add expense → view on dashboard
  - Set budget → exceed it → see alert
  - Navigate to analytics → verify charts render
- [ ] Set up CI to run all tests on every PR

**Deliverable:** Test suite covers all critical paths. CI blocks broken PRs.

---

### Phase 11 — Security Hardening (Week 10–11)

**Goal:** Production-safe security posture.

- [ ] Audit all RLS policies — test with different user IDs
- [ ] Add `Content-Security-Policy` headers in `next.config.ts`
- [ ] Add rate limiting on all API routes (Vercel Edge or Upstash Redis)
- [ ] Validate all inputs server-side with Zod (never trust client)
- [ ] Store secrets only in environment variables, never in code
- [ ] Enable Supabase Auth email verification
- [ ] Add CAPTCHA on sign-up (hCaptcha or Cloudflare Turnstile)
- [ ] Audit all `REFERENCES` for `ON DELETE CASCADE` vs `RESTRICT` correctness
- [ ] Set up Supabase database backups (daily)

---

### Phase 12 — Deployment (Week 11)

**Goal:** Live in production.

- [ ] Configure Vercel project with environment variables
- [ ] Set up production Supabase project (separate from dev)
- [ ] Run all migrations on production database
- [ ] Set up custom domain and SSL
- [ ] Configure `vercel.json` with security headers
- [ ] Set up Sentry for error tracking
- [ ] Set up Vercel Analytics for performance monitoring
- [ ] Configure GitHub Actions CI/CD pipeline
- [ ] Write runbook: how to roll back a deploy

**Deliverable:** App is live on production domain, monitored, and deployable via git push.

---

## 8. UI/UX Design System

### Color Palette

```css
/* Tailwind config tokens */
:root {
  --color-brand:       #6366F1;   /* Indigo — primary actions */
  --color-brand-light: #EEF2FF;
  --color-success:     #10B981;   /* Green — positive amounts */
  --color-danger:      #EF4444;   /* Red — overspend, negative */
  --color-warning:     #F59E0B;   /* Amber — approaching limit */
  --color-neutral:     #6B7280;   /* Gray — secondary text */
  --color-surface:     #FFFFFF;
  --color-background:  #F9FAFB;
}
```

### Typography

```
Headings:    Inter, 500 weight
Body:        Inter, 400 weight
Monospace:   JetBrains Mono (amounts, numbers)

Scale:
  xs:  12px
  sm:  14px
  base: 16px
  lg:  18px
  xl:  20px
  2xl: 24px
  3xl: 30px
```

### Component Rules

- **Cards:** white background, 1px border `#E5E7EB`, `border-radius: 12px`, `padding: 20px`
- **Buttons:** solid brand color for primary, outline for secondary, ghost for destructive actions
- **Inputs:** 40px height, 8px radius, focus ring in brand color
- **Amounts:** always right-aligned, monospace font, color-coded (green = income, red = expense)
- **Empty states:** centered illustration + heading + CTA button — never blank white

### Spacing System

Use 4px base unit: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`

---

## 9. Expense Engine

### Expense Data Model (TypeScript)

```typescript
export interface Expense {
  id: string
  userId: string
  categoryId: string
  amount: number
  currency: string
  description: string
  notes?: string
  date: string              // ISO date string
  paymentMethod?: string
  isRecurring: boolean
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  receiptUrl?: string
  tags: string[]
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  category?: Category       // joined
}
```

### Expense Service (key functions)

```typescript
// lib/services/expenses.service.ts

export const expensesService = {
  async getAll(userId: string, filters: ExpenseFilters): Promise<Expense[]>
  async getById(id: string): Promise<Expense>
  async create(data: CreateExpenseInput): Promise<Expense>
  async update(id: string, data: UpdateExpenseInput): Promise<Expense>
  async softDelete(id: string): Promise<void>
  async getMonthlyTotal(userId: string, year: number, month: number): Promise<number>
  async getCategoryBreakdown(userId: string, year: number, month: number): Promise<CategoryBreakdown[]>
  async getRecurring(userId: string): Promise<Expense[]>
}
```

### Validation Schema

```typescript
// lib/validations/expense.schema.ts
import { z } from 'zod'

export const createExpenseSchema = z.object({
  categoryId:        z.string().uuid(),
  amount:            z.number().positive().max(1_000_000),
  currency:          z.string().length(3).default('EUR'),
  description:       z.string().min(1).max(200),
  notes:             z.string().max(1000).optional(),
  date:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod:     z.string().optional(),
  isRecurring:       z.boolean().default(false),
  recurringInterval: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  tags:              z.array(z.string()).max(10).default([]),
})
```

---

## 10. Analytics & Charts

### Chart Component Architecture

Every chart follows this pattern:

```typescript
// components/charts/SpendingTrendChart.tsx
interface SpendingTrendChartProps {
  data: DailySpending[]
  period: 'week' | 'month' | 'year'
  isLoading?: boolean
}

export function SpendingTrendChart({ data, period, isLoading }: SpendingTrendChartProps) {
  if (isLoading) return <ChartSkeleton />
  if (!data.length) return <ChartEmptyState />
  return <ResponsiveContainer>/* Recharts ... */</ResponsiveContainer>
}
```

### Analytics Service

```typescript
// lib/services/analytics.service.ts

export const analyticsService = {
  async getSpendingTrend(userId: string, period: Period): Promise<DailySpending[]>
  async getCategoryBreakdown(userId: string, month: Month): Promise<CategoryBreakdown[]>
  async getMonthlyComparison(userId: string, months: number): Promise<MonthlyTotal[]>
  async getBudgetUtilization(userId: string): Promise<BudgetUtilization[]>
  async getYearlyHeatmap(userId: string, year: number): Promise<DaySpending[]>
  async getSavingsTrend(userId: string, months: number): Promise<MonthlySavings[]>
}
```

### Chart Library Decisions

| Chart Type | Library | Reason |
|---|---|---|
| Line / Area | Recharts | Simple, composable API |
| Bar (grouped) | Recharts | Consistent with line charts |
| Pie / Donut | Recharts | Built-in label support |
| Heatmap | ECharts | Recharts has no native heatmap |
| Treemap | ECharts | Better performance at scale |

---

## 11. Performance & Optimization

### Target Metrics

| Metric | Target |
|---|---|
| Lighthouse Performance | ≥ 90 |
| Lighthouse Accessibility | ≥ 95 |
| First Contentful Paint | < 1.2s |
| Time to Interactive | < 2.5s |
| Dashboard load (cached) | < 800ms |

### Key Strategies

**Query Optimization**
```sql
-- Always filter by user_id first (uses index)
SELECT * FROM expenses
WHERE user_id = $1
  AND date >= $2
  AND date < $3
  AND is_deleted = FALSE
ORDER BY date DESC;
```

**React Optimization**
```typescript
// Memoize expensive computations
const categoryTotals = useMemo(() =>
  computeCategoryTotals(expenses), [expenses]
)

// Memoize stable components
const ExpenseRow = memo(({ expense }: { expense: Expense }) => ...)
```

**TanStack Query Caching**
```typescript
// Dashboard data: cache for 5 minutes
useQuery({
  queryKey: ['dashboard', userId, currentMonth],
  queryFn: () => analyticsService.getDashboard(userId, currentMonth),
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
})
```

---

## 12. Testing Strategy

### Test Pyramid

```
        [E2E Tests]          ← 10% — Playwright, critical flows only
      [Integration Tests]    ← 20% — API routes, auth flows
    [Unit Tests]             ← 70% — Services, utils, schemas
```

### Critical E2E Flows

1. Sign up → verify email → log in → see empty dashboard
2. Add expense → appears in list → shows on dashboard total
3. Set budget → add expenses → see budget progress update
4. Navigate to analytics → all charts render with data
5. Generate monthly report → view historical month

---

## 13. Deployment & DevOps

### Environments

| Environment | Branch | URL | Database |
|---|---|---|---|
| Development | `dev` | localhost:3000 | Local / Supabase dev project |
| Preview | PR branches | Vercel preview URLs | Supabase dev project |
| Production | `main` | yourdomain.com | Supabase production project |

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build

  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - run: npx playwright test
```

### Security Headers (`next.config.ts`)

```typescript
const securityHeaders = [
  { key: 'X-Frame-Options',          value: 'DENY' },
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
]
```

### Monitoring Stack

| Tool | Purpose |
|---|---|
| **Sentry** | Error tracking and alerting |
| **Vercel Analytics** | Core Web Vitals monitoring |
| **Supabase Dashboard** | DB query performance |

---

## 14. Future Roadmap

### Near Term (3–6 months post-launch)

- [ ] Receipt upload and storage
- [ ] CSV import from bank exports
- [ ] Shared household budgets
- [ ] Push notifications (budget alerts, monthly summary)
- [ ] PWA support (installable on mobile)

### Medium Term (6–12 months)

- [ ] Bank API integration (Plaid / Teller for US; Salt Edge for Europe)
- [ ] Investment portfolio tracking
- [ ] Crypto wallet tracking
- [ ] Tax analytics and expense categorization for self-employed
- [ ] Mobile app (React Native / Expo, sharing logic with web)

### Long Term (12 months+)

- [ ] Automated savings rules ("round up and save")
- [ ] Multi-tenant SaaS (white-label for accountants)
- [ ] Voice expense input
- [ ] Offline-first architecture

---

## 15. Development Rules & Standards

### Code Quality Rules

1. **TypeScript strict mode always on** — no `any`, no `as unknown`
2. **Never mix business logic with UI** — services live in `lib/services`, not in components
3. **All forms use React Hook Form + Zod** — no raw `useState` for form state
4. **All server data fetched via TanStack Query** — no `useEffect` for data fetching
5. **All mutations have optimistic updates** — UI feels instant
6. **All amounts stored as integers (cents)** — never floats for money; divide by 100 for display

### Git Workflow

```
main         ← production, protected, requires PR
dev          ← integration branch
feature/*    ← individual feature branches
fix/*        ← bug fixes
```

**Commit format:** `feat(expenses): add recurring expense support`

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never expose to client
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=
```

### Definition of Done (DoD)

A feature is only done when:

- [ ] TypeScript compiles with zero errors
- [ ] Unit tests written and passing
- [ ] Accessible (keyboard navigable, ARIA labels)
- [ ] Mobile responsive tested at 375px and 768px
- [ ] Loading state implemented
- [ ] Empty state implemented
- [ ] Error state implemented
- [ ] Code reviewed and approved

---

*Last updated: May 2026*
*Stack: Next.js 14 · React 18 · TypeScript 5 · TailwindCSS 3 · Supabase · PostgreSQL*
