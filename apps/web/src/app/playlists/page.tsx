"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ListMusic, Loader2, Plus, Music4 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth-provider";
import { api, ApiError } from "@/lib/api";
import type { Playlist } from "@/types";

const createSchema = z.object({
  name: z.string().min(1, "Name is required.").max(120),
  description: z.string().max(500).optional(),
});

type CreateValues = z.infer<typeof createSchema>;

export default function PlaylistsPage() {
  const { status, token } = useAuth();
  const [open, setOpen] = React.useState(false);
  const form = useForm<CreateValues>({ resolver: zodResolver(createSchema) });

  const { data: playlists, isLoading, mutate } = useSWR<Playlist[]>(
    status === "authenticated" ? "/api/v1/playlists" : null,
    (url: string) => api.get<Playlist[]>(url, { authToken: token }),
  );

  const onCreate = form.handleSubmit(async (values) => {
    try {
      await api.post<Playlist>(
        "/api/v1/playlists",
        { name: values.name, description: values.description || null, is_public: false, song_ids: [] },
        { authToken: token },
      );
      toast.success("Playlist created.");
      setOpen(false);
      form.reset();
      void mutate();
    } catch (e) {
      toast.error((e as ApiError).message ?? "Couldn't create playlist.");
    }
  });

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="container py-20 text-center">
        <ListMusic className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Your playlists</h1>
        <p className="mt-2 text-muted-foreground">
          {status === "loading" ? "Loading..." : "Sign in to manage your playlists."}
        </p>
        {status === "unauthenticated" && (
          <Button asChild className="mt-6">
            <Link href="/sign-in?next=/playlists">Sign in</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Playlists</h1>
          <p className="mt-1 text-muted-foreground">Organize your songs into sets and practice groups.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> New playlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create playlist</DialogTitle>
              <DialogDescription>Give your playlist a name and optional description.</DialogDescription>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="pl-name">Name</label>
                <Input id="pl-name" placeholder="e.g. Jazz Standards" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="pl-desc">Description (optional)</label>
                <Input id="pl-desc" placeholder="Notes about this playlist" {...form.register("description")} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !playlists || playlists.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-3 py-16 text-center">
            <Music4 className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No playlists yet. Create one to start organizing songs.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((pl) => (
            <Link key={pl.id} href={`/playlists/${pl.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
                <CardHeader>
                  <CardTitle className="line-clamp-1 text-base">{pl.name}</CardTitle>
                  {pl.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{pl.description}</p>
                  )}
                </CardHeader>
                <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{pl.song_ids.length} songs</Badge>
                  <span className="ml-auto">{new Date(pl.updated_at).toLocaleDateString()}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
