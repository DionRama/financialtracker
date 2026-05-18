import {
  ArrowRight,
  PieChart,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Wallet,
    title: "Track every cent",
    body: "Log expenses in seconds with categories, tags, and notes. Amounts are stored as integer cents — accurate forever.",
  },
  {
    icon: PieChart,
    title: "See where it goes",
    body: "Beautiful dashboards with daily spend trends, category breakdowns, and month-vs-month comparisons.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Built on Supabase with Row Level Security. Your data is yours — no other user can ever see it.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--color-primary),transparent_60%)]/[20]" />

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-4 w-4" />
          </div>
          Financial Tracker
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 pb-12 pt-16 text-center sm:pt-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Personal finance, done right
        </div>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          Know exactly where your money goes
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          A fast, private expense tracker with monthly budgets, rich
          analytics, and a UI that respects your time. Built on Next.js
          and Supabase.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/signup">
              Create your free account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">I already have an account</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border bg-card p-6 shadow-sm"
          >
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="mx-auto max-w-6xl border-t px-6 py-8 text-sm text-muted-foreground">
        © {new Date().getFullYear()} Financial Tracker. Built with Next.js
        and Supabase.
      </footer>
    </main>
  );
}
