import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { MobileNav } from "@/components/shell/mobile-nav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Best-effort: materialize any past-due recurring rules so newly authenticated
  // page loads are self-healing. Errors are swallowed — a transient DB hiccup
  // must not block rendering.
  try {
    await supabase.rpc("materialize_recurring");
  } catch {
    // intentionally ignored
  }

  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";

  const [{ data: profile }, { count: expensesCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, monthly_income_cents")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true }),
  ]);

  const needsOnboarding =
    (profile?.monthly_income_cents ?? 0) === 0 &&
    (expensesCount ?? 0) === 0;

  if (needsOnboarding && !pathname.includes("/onboarding")) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar email={user.email ?? ""} fullName={profile?.full_name ?? null} />
        <main className="flex-1 px-5 py-6 pb-24 sm:px-6 sm:py-8 md:pb-8">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
