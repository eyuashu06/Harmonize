"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Guitar,
  Heart,
  ListPlus,
  Loader2,
  Music4,
  PianoIcon,
  Printer,
  Share2,
  Waves,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ChordDiagram } from "@/components/chord-diagram";
import { PianoKeyboard } from "@/components/piano-keyboard";
import { useAuth } from "@/components/auth-provider";
import { api, ApiError } from "@/lib/api";
import { transposeSymbol, transposeKey, suggestCapo } from "@/lib/theory";
import { pianoMidi } from "@/lib/format";
import { formatDuration } from "@/lib/utils";
import type { Song, TransposeResponse } from "@/types";

const fetcher = (url: string) => api.get<Song>(url);

export default function SongDetailPage() {
  const params = useParams<{ id: string }>();
  const songId = params.id;
  const { status, token } = useAuth();

  const [semitones, setSemitones] = React.useState(0);
  const [preferFlats, setPreferFlats] = React.useState(false);
  const [isFavorite, setIsFavorite] = React.useState(false);

  const { data: song, isLoading, error } = useSWR<Song>(
    `/api/v1/songs/${songId}`,
    fetcher,
  );

  const { data: transposed } = useSWR<TransposeResponse>(
    song ? [`/api/v1/songs/${songId}/transpose`, semitones, preferFlats] : null,
    ([url, s, f]) =>
      api.post<TransposeResponse>(url, { semitones: s, prefer_flats: f }),
  );

  // Check favorite state
  React.useEffect(() => {
    if (status !== "authenticated" || !song) return;
    api
      .get<{ song_id: string }[]>(`/api/v1/favorites`, { authToken: token })
      .then((favs) => setIsFavorite(favs.some((f) => f.song_id === song.id)))
      .catch(() => undefined);
  }, [status, song, token]);

  const toggleFavorite = async () => {
    if (!song) return;
    if (status !== "authenticated") {
      toast.error("Sign in to save favorites.");
      return;
    }
    try {
      if (isFavorite) {
        await api.delete(`/api/v1/favorites/${song.id}`, { authToken: token });
        setIsFavorite(false);
        toast.success("Removed from favorites.");
      } else {
        await api.post(`/api/v1/favorites/${song.id}`, undefined, { authToken: token });
        setIsFavorite(true);
        toast.success("Added to favorites.");
      }
    } catch (e) {
      toast.error((e as ApiError).message ?? "Couldn't update favorite.");
    }
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !song) {
    return (
      <div className="container py-20 text-center">
        <Music4 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Song not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been removed or made private.</p>
        <Button asChild className="mt-6">
          <Link href="/songs">Back to songs</Link>
        </Button>
      </div>
    );
  }

  const displayedKey = transposed?.new_key ?? song.key;
  const suggestedCapo = transposed?.suggested_capo ?? suggestCapo(song.key ?? "C");
  const t = (s: string) => transposeSymbol(s, semitones, preferFlats);

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/songs"><ChevronLeft className="mr-1 h-4 w-4" /> Songs</Link>
        </Button>
      </div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{song.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {song.artist}
            {song.album ? ` · ${song.album}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {displayedKey && <Badge>Key {displayedKey}</Badge>}
            {song.tempo_bpm && <Badge variant="secondary">{song.tempo_bpm} BPM</Badge>}
            {song.time_signature && <Badge variant="secondary">{song.time_signature}</Badge>}
            {song.capo ? <Badge variant="outline">Capo {song.capo}</Badge> : null}
            {song.difficulty && (
              <Badge variant="outline" className="capitalize">{song.difficulty}</Badge>
            )}
            <span className="text-muted-foreground">{formatDuration(song.duration_seconds)}</span>
            {song.tags.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSemitones((s) => s - 1)} aria-label="Transpose down">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center font-mono text-sm">
            {semitones > 0 ? `+${semitones}` : semitones} st
          </span>
          <Button variant="outline" size="sm" onClick={() => setSemitones((s) => s + 1)} aria-label="Transpose up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSemitones(0)}>
            Reset
          </Button>
          <label className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={preferFlats} onCheckedChange={setPreferFlats} />
            Use flats
          </label>
          <Button variant="outline" size="sm" onClick={toggleFavorite}>
            <Heart className={`mr-1 h-4 w-4 ${isFavorite ? "fill-current text-rose-500" : ""}`} />
            {isFavorite ? "Favorited" : "Favorite"}
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/practice?song=${song.id}`}>
              <Waves className="mr-1 h-4 w-4" /> Practice
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {suggestedCapo != null && suggestedCapo > 0 && semitones !== 0 && (
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <strong>Capo tip:</strong> play in {transposeKey(song.key ?? "C", -semitones, preferFlats)} shapes
          with a capo on the <strong>{suggestedCapo}th fret</strong> to sound in {displayedKey}.
        </div>
      )}

      {/* Main content */}
      <Tabs defaultValue="lyrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lyrics">Lyrics & chords</TabsTrigger>
          <TabsTrigger value="chords">Chord charts</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        {/* Lyrics + chord timeline */}
        <TabsContent value="lyrics" className="space-y-4">
          <Card className="print:shadow-none print:border-none">
            <CardContent className="space-y-1 p-6 font-mono text-base leading-relaxed">
              {song.lyrics.map((line) => (
                <div key={line.id} className="group">
                  {line.chords.length > 0 && (
                    <div className="flex flex-wrap gap-3 text-primary">
                      {line.chords.map((c, i) => (
                        <span
                          key={i}
                          className="chord"
                          title={`Beat ${c.beat}`}
                        >
                          {t(c.chord)}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-foreground">{line.text || " "}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chord diagrams grid */}
        <TabsContent value="chords">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Guitar className="h-4 w-4" /> Chord library
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {song.chords.map((c) => (
                  <ChordDiagram
                    key={c.id}
                    symbol={t(c.symbol)}
                    frets={c.guitar_frets}
                    baseFret={c.guitar_base_fret}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sections */}
        <TabsContent value="sections">
          <Card>
            <CardContent className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {song.sections.map((sec) => (
                <div key={sec.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{sec.name}</h3>
                    <Badge variant="secondary" className="capitalize">
                      {sec.type.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Repeat: {sec.repeat}×
                  </p>
                  {sec.start_seconds != null && sec.end_seconds != null && (
                    <p className="text-xs text-muted-foreground">
                      {sec.start_seconds.toFixed(1)}s → {sec.end_seconds.toFixed(1)}s
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools: piano keyboard preview for the first chord */}
        <TabsContent value="tools">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PianoIcon className="h-4 w-4" /> Piano preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {song.chords[0] ? (
                  <PianoKeyboard highlightMidi={pianoMidi(t(song.chords[0].symbol))} />
                ) : (
                  <p className="text-sm text-muted-foreground">No chords available.</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Highlighting notes for: <strong>{song.chords[0] ? t(song.chords[0].symbol) : "—"}</strong>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListPlus className="h-4 w-4" /> Quick actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Add this song to a playlist or open the full practice studio with metronome,
                  loop, and pitch detection.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={`/practice?song=${song.id}`}>
                      <Waves className="mr-1 h-4 w-4" /> Open practice
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                    <Share2 className="mr-1 h-4 w-4" /> Copy link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
