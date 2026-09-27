"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import { Heart, Loader2, Music4 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { api, ApiError } from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import type { Favorite, Song, SongSummary } from "@/types";

export default function FavoritesPage() {
  const { status, token } = useAuth();
  const { data, isLoading, mutate } = useSWR<Favorite[]>(
    status === "authenticated" ? "/api/v1/favorites" : null,
    (url: string) => api.get<Favorite[]>(url, { authToken: token }),
  );

  const remove = async (songId: string) => {
    try {
      await api.delete(`/api/v1/favorites/${songId}`, { authToken: token });
      void mutate();
    } catch (e) {
      console.error((e as ApiError).message);
    }
  };

  if (status === "loading") {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (status === "unauthenticated") {
    return (
      <div className="container py-20 text-center">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Sign in to see your favorites</h1>
        <Button asChild className="mt-6">
          <Link href="/sign-in?next=/favorites">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Favorites</h1>
      <p className="mb-6 text-muted-foreground">
        Songs you've saved for quick access.
      </p>
      {isLoading ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-3 py-16 text-center">
            <Music4 className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No favorites yet. Tap the heart on any song.</p>
            <Button asChild>
              <Link href="/songs">Browse songs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <FavoritesList favorites={data} onRemove={remove} />
      )}
    </div>
  );
}

function FavoritesList({
  favorites,
  onRemove,
}: {
  favorites: Favorite[];
  onRemove: (songId: string) => void;
}) {
  // Fetch each song in parallel via SWR's parallel requests
  const { data: songs } = useSWR<(SongSummary | null)[]>(
    favorites.length ? ["favorites-songs", ...favorites.map((f) => f.song_id)] : null,
    async (key) => {
      const ids = (key as readonly string[]).slice(1);
      return Promise.all(
        ids.map((id) =>
          api
            .get<Song>(`/api/v1/songs/${id}`)
            .then((s) => ({
              id: s.id,
              title: s.title,
              artist: s.artist,
              album: s.album,
              duration_seconds: s.duration_seconds,
              key: s.key,
              mode: s.mode,
              tempo_bpm: s.tempo_bpm,
              time_signature: s.time_signature,
              difficulty: s.difficulty,
              tags: s.tags,
            }))
            .catch(() => null),
        ),
      );
    },
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {(songs ?? favorites.map(() => null)).map((song, i) => {
        if (!song) return null;
        return (
          <Card key={favorites[i].id} className="group">
            <CardHeader>
              <CardTitle className="line-clamp-1 text-base">
                <Link href={`/songs/${song.id}`} className="hover:underline">
                  {song.title}
                </Link>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{song.artist}</p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-xs">
              {song.key && <Badge>Key {song.key}</Badge>}
              {song.tempo_bpm && <Badge variant="secondary">{song.tempo_bpm} BPM</Badge>}
              {song.difficulty && (
                <Badge variant="outline" className="capitalize">{song.difficulty}</Badge>
              )}
              <span className="ml-auto text-muted-foreground">{formatDuration(song.duration_seconds)}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemove(song.id)}
                className="ml-2 text-rose-500 hover:text-rose-600"
                aria-label="Remove from favorites"
              >
                <Heart className="h-4 w-4 fill-current" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
