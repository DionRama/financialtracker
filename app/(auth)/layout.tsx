import Link from "next/link";
import { Wallet } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/15),transparent_60%)]" />
      <header className="mx-auto max-w-6xl px-6 py-6">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-4 w-4" />
          </div>
          Financial Tracker
        </Link>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-200px)] max-w-md items-center justify-center px-6 py-8">
        {children}
      </main>
    </div>
  );
}
