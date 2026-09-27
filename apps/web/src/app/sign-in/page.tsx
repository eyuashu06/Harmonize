"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, User as UserIcon, Music4, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth-provider";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const signUpSchema = signInSchema.extend({
  displayName: z.string().min(2, "Tell us what to call you."),
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/songs";
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, status } = useAuth();

  const [busy, setBusy] = React.useState<"" | "email" | "google" | "apple" | "signup">("");
  const [tab, setTab] = React.useState<"signin" | "signup">("signin");

  const inForm = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });
  const upForm = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  // If already authenticated, bounce.
  React.useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, router, next]);

  const onSignIn = inForm.handleSubmit(async (values) => {
    setBusy("email");
    try {
      await signInWithEmail(values.email, values.password);
      toast.success("Welcome back!");
      router.replace(next);
    } catch (e) {
      toast.error((e as Error).message || "Sign-in failed.");
    } finally {
      setBusy("");
    }
  });

  const onSignUp = upForm.handleSubmit(async (values) => {
    setBusy("signup");
    try {
      await signUpWithEmail(values.email, values.password, values.displayName);
      toast.success("Account created.");
      router.replace(next);
    } catch (e) {
      toast.error((e as Error).message || "Sign-up failed.");
    } finally {
      setBusy("");
    }
  });

  const social = async (provider: "google" | "apple") => {
    setBusy(provider);
    try {
      if (provider === "google") await signInWithGoogle();
      else await signInWithApple();
      router.replace(next);
    } catch (e) {
      toast.error((e as Error).message || "Sign-in failed.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="container grid min-h-[calc(100vh-4rem)] place-items-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Music4 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Welcome to HarmonyHub</CardTitle>
          <CardDescription>Sign in or create an account to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => social("google")}
              disabled={busy !== ""}
              aria-label="Continue with Google"
            >
              {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Google"}
            </Button>
            <Button
              variant="outline"
              onClick={() => social("apple")}
              disabled={busy !== ""}
              aria-label="Continue with Apple"
            >
              {busy === "apple" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apple"}
            </Button>
          </div>

          <div className="relative my-2 text-center text-xs uppercase text-muted-foreground">
            <span className="bg-card px-2">or</span>
            <div className="absolute left-0 right-0 top-1/2 -z-10 h-px bg-border" />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-3">
              <form onSubmit={onSignIn} className="space-y-3">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    autoComplete="email"
                    aria-label="Email"
                    {...inForm.register("email")}
                  />
                </div>
                {inForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{inForm.formState.errors.email.message}</p>
                )}
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    autoComplete="current-password"
                    aria-label="Password"
                    {...inForm.register("password")}
                  />
                </div>
                {inForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{inForm.formState.errors.password.message}</p>
                )}
                <Button type="submit" className="w-full" disabled={busy !== ""}>
                  {busy === "email" && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-3">
              <form onSubmit={onSignUp} className="space-y-3">
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Display name"
                    className="pl-9"
                    aria-label="Display name"
                    autoComplete="name"
                    {...upForm.register("displayName")}
                  />
                </div>
                {upForm.formState.errors.displayName && (
                  <p className="text-xs text-destructive">{upForm.formState.errors.displayName.message}</p>
                )}
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    autoComplete="email"
                    aria-label="Email"
                    {...upForm.register("email")}
                  />
                </div>
                {upForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{upForm.formState.errors.email.message}</p>
                )}
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="At least 6 characters"
                    className="pl-9"
                    autoComplete="new-password"
                    aria-label="Password"
                    {...upForm.register("password")}
                  />
                </div>
                {upForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{upForm.formState.errors.password.message}</p>
                )}
                <Button type="submit" className="w-full" disabled={busy !== ""}>
                  {busy === "signup" && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline">Terms</Link> and{" "}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
