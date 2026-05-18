import { NextResponse, type NextRequest } from "next/server";

import { safeRelativePath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = safeRelativePath(searchParams.get("next"), "");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      let next = nextParam || "/dashboard";
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const fullName = (user.user_metadata?.full_name ?? "")
          .toString()
          .trim();
        if (fullName) {
          await supabase
            .from("profiles")
            .update({ full_name: fullName })
            .eq("id", user.id);
        }
        if (!nextParam) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("monthly_income_cents")
            .eq("id", user.id)
            .maybeSingle();
          if (!profile || profile.monthly_income_cents == null) {
            next = "/onboarding";
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
