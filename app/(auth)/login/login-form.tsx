"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";

import {
  signInWithPassword,
  signInWithMagicLink,
  type ActionResult,
} from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/supabase/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const initial: ActionResult = {};

export function LoginForm() {
  const params = useSearchParams();
  const oauthError = params.get("error");
  const [mode, setMode] = useState<"password" | "magic">("password");

  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPassword,
    initial,
  );
  const [magicState, magicAction, magicPending] = useActionState(
    signInWithMagicLink,
    initial,
  );

  async function googleSignIn() {
    const supabase = createClient();
    const next = params.get("next") ?? "/dashboard";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  return (
    <div className="w-full space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your account to continue.
        </p>
      </div>

      {oauthError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Sign-in failed. Please try again.
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button
          variant={mode === "password" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setMode("password")}
        >
          Password
        </Button>
        <Button
          variant={mode === "magic" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setMode("magic")}
        >
          Magic link
        </Button>
      </div>

      {mode === "password" ? (
        <form action={passwordAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
            />
          </div>
          {passwordState.error ? (
            <p className="text-sm text-destructive">{passwordState.error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={passwordPending}>
            {passwordPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Sign in
          </Button>
        </form>
      ) : (
        <form action={magicAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-magic">Email</Label>
            <Input
              id="email-magic"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          {magicState.error ? (
            <p className="text-sm text-destructive">{magicState.error}</p>
          ) : null}
          {magicState.success ? (
            <p className="text-sm text-success">{magicState.success}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={magicPending}>
            {magicPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Send magic link
          </Button>
        </form>
      )}

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs uppercase tracking-wider text-muted-foreground">
          or
        </span>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={googleSignIn}
        type="button"
      >
        <GoogleIcon /> Continue with Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.83z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.3 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}
