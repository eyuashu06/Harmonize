"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, User as UserIcon, BarChart3, History as HistoryIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { api, ApiError } from "@/lib/api";
import { initials, cn } from "@/lib/utils";
import type { PracticeSession, PracticeStats } from "@/types";

const profileSchema = z.object({
  display_name: z.string().min(1).max(120),
  primary_instrument: z.string().max(32).optional().or(z.literal("")),
  skill_level: z.enum(["beginner", "intermediate", "advanced"]).optional().or(z.literal("")),
});

type ProfileValues = z.infer<typeof profileSchema>;

const fetcher = (url: string) => api.get<PracticeSession[]>(url);
const statsFetcher = (url: string) => api.get<PracticeStats>(url);

export default function ProfilePage() {
  const { user, status, refreshUser } = useAuth();

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: user?.display_name ?? "",
      primary_instrument: user?.primary_instrument ?? "",
      skill_level: (user?.skill_level as ProfileValues["skill_level"]) ?? "",
    },
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        display_name: user.display_name,
        primary_instrument: user.primary_instrument ?? "",
        skill_level: (user.skill_level as ProfileValues["skill_level"]) ?? "",
      });
    }
  }, [user, form]);

  const { data: sessions } = useSWR<PracticeSession[]>(
    status === "authenticated" ? "/api/v1/practice/sessions?limit=20" : null,
    fetcher,
  );
  const { data: stats } = useSWR<PracticeStats>(
    status === "authenticated" ? "/api/v1/practice/stats" : null,
    statsFetcher,
  );

  const onSubmit = async (values: ProfileValues) => {
    try {
      const payload: Record<string, unknown> = {
        display_name: values.display_name,
        primary_instrument: values.primary_instrument || null,
        skill_level: values.skill_level || null,
      };
      await api.patch("/api/v1/users/me", payload);
      await refreshUser();
      toast.success("Profile updated.");
    } catch (e) {
      toast.error((e as ApiError).message ?? "Couldn't update profile.");
    }
  };

  if (status === "loading") {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (status === "unauthenticated" || !user) {
    return (
      <div className="container py-20 text-center">
        <UserIcon className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Sign in to see your profile</h1>
        <Button asChild className="mt-6">
          <Link href="/sign-in?next=/profile">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container grid gap-6 py-8 lg:grid-cols-[280px_1fr]">
      {/* Identity card */}
      <aside className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
              {initials(user.display_name)}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{user.display_name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <Badge className="capitalize">{user.role}</Badge>
                {user.skill_level && <Badge variant="outline" className="capitalize">{user.skill_level}</Badge>}
                {user.primary_instrument && <Badge variant="outline">{user.primary_instrument}</Badge>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Joined {new Date(user.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <BarChart3 className="mr-2 inline h-4 w-4" /> Practice stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <StatRow label="Sessions" value={stats?.total_sessions ?? 0} />
            <StatRow label="Total minutes" value={stats?.total_minutes ?? 0} />
            <StatRow
              label="Avg pitch accuracy"
              value={stats?.average_pitch_accuracy != null ? `${Math.round(stats.average_pitch_accuracy * 100)}%` : "—"}
            />
            <StatRow
              label="Avg timing accuracy"
              value={stats?.average_timing_accuracy != null ? `${Math.round(stats.average_timing_accuracy * 100)}%` : "—"}
            />
          </CardContent>
        </Card>
      </aside>

      {/* Forms + history */}
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>How others see you on HarmonyHub.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="display_name">Display name</label>
                <Input id="display_name" {...form.register("display_name")} />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="primary_instrument">Primary instrument</label>
                <Input
                  id="primary_instrument"
                  placeholder="Guitar, Piano, Vocals…"
                  {...form.register("primary_instrument")}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="skill_level">Skill level</label>
                <select
                  id="skill_level"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...form.register("skill_level")}
                >
                  <option value="">—</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HistoryIcon className="h-4 w-4" /> Recent practice
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!sessions || sessions.length === 0) ? (
              <p className="text-sm text-muted-foreground">
                No practice sessions yet. Open a song and hit Practice to get started.
              </p>
            ) : (
              <ul className="divide-y">
                {sessions.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-3 text-sm">
                    <span className="font-mono text-muted-foreground">
                      {Math.floor(s.duration_seconds / 60)}:{String(s.duration_seconds % 60).padStart(2, "0")}
                    </span>
                    <span className="flex-1">
                      {new Date(s.started_at).toLocaleString()}
                    </span>
                    {s.average_tempo_bpm && (
                      <Badge variant="secondary">{Math.round(s.average_tempo_bpm)} BPM</Badge>
                    )}
                    {s.pitch_accuracy != null && (
                      <Badge variant="outline">Pitch {Math.round(s.pitch_accuracy * 100)}%</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="font-medium">Your data is safe</p>
              <p className="text-muted-foreground">
                All communication is over HTTPS. We never share your practice recordings.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium")}>{value}</span>
    </div>
  );
}
