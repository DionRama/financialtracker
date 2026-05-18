"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { signUpWithPassword, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionResult = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpWithPassword, initial);

  return (
    <div className="w-full space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Start tracking your spending in under a minute.
        </p>
      </div>

      <form action={action} className="space-y-4">
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
            autoComplete="new-password"
            required
            minLength={8}
          />
          <p className="text-xs text-muted-foreground">
            At least 8 characters.
          </p>
        </div>
        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-success">{state.success}</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
