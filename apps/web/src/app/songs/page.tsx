"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Loader2, Music4, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import type { SongSearchResponse } from "@/types";

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

const fetcher = (url: string) => api.get<SongSearchResponse>(url);

export default function SongsPage() {
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = React.useState(initialQ);
  const [debouncedQuery, setDebounced] = React.useState(initialQ);
  const [difficulty, setDifficulty] = React.useState<string>("");
  const [tag, setTag] = React.useState<string>("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const searchParams = new URLSearchParams();
  if (debouncedQuery) searchParams.set("q", debouncedQuery);
  if (difficulty) searchParams.set("difficulty", difficulty);
  if (tag) searchParams.append("tag", tag);
  searchParams.set("limit", "100");

  const { data, isLoading } = useSWR<SongSearchResponse>(
    `/api/v1/songs?${searchParams.toString()}`,
    fetcher,
  );

  const hasFilters = difficulty || tag;

  return (
    <div className="container py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Songs</h1>
          <p className="mt-1 text-muted-foreground">
            Search the library, then open a song to see lyrics, chords, and practice tools.
          </p>
        </div>
        <div className="w-full sm:max-w-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, artist, album..."
              className="pl-9"
              aria-label="Search songs"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Filter:</span>
        <div className="flex gap-1">
          {DIFFICULTIES.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={difficulty === d ? "default" : "outline"}
              onClick={() => setDifficulty(difficulty === d ? "" : d)}
              className="capitalize text-xs"
            >
              {d}
            </Button>
          ))}
        </div>
        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setDifficulty(""); setTag(""); }}
            className="text-xs text-muted-foreground"
          >
            <X className="mr-1 h-3 w-3" /> Clear filters
          </Button>
        )}
        {tag && (
          <Badge variant="secondary" className="text-xs">
            #{tag}
            <button onClick={() => setTag("")} className="ml-1 hover:text-foreground">&times;</button>
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-3 py-16 text-center">
            <Music4 className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {hasFilters ? "No songs match your filters." : "No songs match your search."}
            </p>
            {hasFilters && (
              <Button variant="outline" onClick={() => { setDifficulty(""); setTag(""); }}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((song) => (
            <Link key={song.id} href={`/songs/${song.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
                <CardHeader>
                  <CardTitle className="line-clamp-1 text-base">{song.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{song.artist}</p>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2 text-xs">
                  {song.key && <Badge variant="secondary">Key {song.key}</Badge>}
                  {song.tempo_bpm && <Badge variant="outline">{song.tempo_bpm} BPM</Badge>}
                  {song.time_signature && <Badge variant="outline">{song.time_signature}</Badge>}
                  {song.difficulty && (
                    <Badge variant="outline" className="capitalize">{song.difficulty}</Badge>
                  )}
                  {song.tags.map((t) => (
                    <button
                      key={t}
                      onClick={(e) => { e.preventDefault(); setTag(t); }}
                      className="text-primary hover:underline"
                    >
                      <Badge variant="outline" className="text-[10px]">#{t}</Badge>
                    </button>
                  ))}
                  <span className="ml-auto text-muted-foreground">
                    {formatDuration(song.duration_seconds)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
