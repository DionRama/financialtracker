import { redirect } from "next/navigation";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar email={user.email ?? ""} fullName={profile?.full_name ?? null} />
        <main className="min-w-0 flex-1 px-5 py-6 pb-24 sm:px-6 sm:py-8 md:pb-8">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
