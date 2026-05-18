import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, currency, locale")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Settings"
        description="Account preferences and danger zone."
      />
      <SettingsForm
        email={user.email ?? ""}
        initial={{
          full_name: profile?.full_name ?? null,
          currency: profile?.currency ?? "USD",
          locale: profile?.locale ?? "en-US",
        }}
      />
    </div>
  );
}
