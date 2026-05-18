"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  authPasswordSchema,
  authMagicLinkSchema,
  authSignupSchema,
} from "@/lib/validation";

export type ActionResult = { error?: string; success?: string };

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signInWithPassword(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = authPasswordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Please enter a valid email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUpWithPassword(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = authSignupSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path[0] === "full_name")
      return { error: "Please enter your full name." };
    if (firstIssue?.path[0] === "email")
      return { error: "Please enter a valid email." };
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/onboarding`,
      data: { full_name: parsed.data.full_name },
    },
  });
  if (error) return { error: error.message };

  if (data.session && data.user) {
    await supabase
      .from("profiles")
      .update({ full_name: parsed.data.full_name })
      .eq("id", data.user.id);
    revalidatePath("/", "layout");
    redirect("/onboarding");
  }
  return {
    success:
      "Check your inbox to confirm your email, then sign in.",
  };
}

export async function signInWithMagicLink(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = authMagicLinkSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/dashboard` },
  });
  if (error) return { error: error.message };
  return { success: "Check your inbox for the sign-in link." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
