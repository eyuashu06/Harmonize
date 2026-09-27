"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ChevronLeft, Loader2, ListMusic, Trash2, Music4 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { api, ApiError } from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import type { Playlist, Song } from "@/types";

export default function PlaylistDetailPage() {
  const params = useParams<{ id: string }>();
  const playlistId = params.id;
  const { status, token } = useAuth();

  const { data: playlist, isLoading, error, mutate } = useSWR<Playlist>(
    status === "authenticated" ? `/api/v1/playlists/${playlistId}` : null,
    (url: string) => api.get<Playlist>(url, { authToken: token }),
  );

  const removeSong = async (songId: string) => {
    if (!playlist) return;
    try {
      await api.delete(`/api/v1/playlists/${playlist.id}/songs/${songId}`, { authToken: token });
      toast.success("Song removed.");
      void mutate();
    } catch (e) {
      toast.error((e as ApiError).message ?? "Couldn't remove song.");
    }
  };

  const deletePlaylist = async () => {
    if (!playlist) return;
    if (!confirm("Delete this playlist?")) return;
    try {
      await api.delete(`/api/v1/playlists/${playlist.id}`, { authToken: token });
      toast.success("Playlist deleted.");
      window.location.href = "/playlists";
    } catch (e) {
      toast.error((e as ApiError).message ?? "Couldn't delete playlist.");
    }
  };

  if (status === "loading" || status === "unauthenticated" || isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="container py-20 text-center">
        <ListMusic className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Playlist not found</h1>
        <Button asChild className="mt-6">
          <Link href="/playlists">Back to playlists</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/playlists"><ChevronLeft className="mr-1 h-4 w-4" /> Playlists</Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{playlist.name}</h1>
          {playlist.description && (
            <p className="mt-1 text-muted-foreground">{playlist.description}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {playlist.song_ids.length} songs
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={deletePlaylist}>
          <Trash2 className="mr-1 h-4 w-4" /> Delete playlist
        </Button>
      </div>

      {playlist.song_ids.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-3 py-16 text-center">
            <Music4 className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              This playlist is empty. Open a song and use the playlist button to add songs.
            </p>
            <Button asChild>
              <Link href="/songs">Browse songs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <PlaylistSongs songIds={playlist.song_ids} onRemove={removeSong} />
      )}
    </div>
  );
}

function PlaylistSongs({
  songIds,
  onRemove,
}: {
  songIds: string[];
  onRemove: (songId: string) => void;
}) {

  const { data: songs } = useSWR<(Song | null)[]>(
    songIds.length ? ["playlist-songs", ...songIds] : null,
    async (key) => {
      const ids = (key as readonly string[]).slice(1);
      return Promise.all(
        ids.map((id) =>
          api.get<Song>(`/api/v1/songs/${id}`).catch(() => null),
        ),
      );
    },
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {(songs ?? songIds.map(() => null)).map((song, i) => {
        if (!song) return null;
        return (
          <Card key={songIds[i]} className="group">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <Link href={`/songs/${song.id}`} className="font-medium hover:underline line-clamp-1">
                  {song.title}
                </Link>
                <p className="text-sm text-muted-foreground line-clamp-1">{song.artist}</p>
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  {song.key && <Badge variant="secondary">Key {song.key}</Badge>}
                  {song.tempo_bpm && <Badge variant="outline">{song.tempo_bpm} BPM</Badge>}
                  <span className="text-muted-foreground">{formatDuration(song.duration_seconds)}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemove(song.id)}
                className="text-rose-500 hover:text-rose-600 shrink-0"
                aria-label="Remove from playlist"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
