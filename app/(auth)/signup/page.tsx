import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { SignupForm } from "./signup-form";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return <SignupForm />;
}
