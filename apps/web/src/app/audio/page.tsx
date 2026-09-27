"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Activity,
  AudioLines,
  CheckCircle2,
  Clock3,
  Loader2,
  Music4,
  Upload,
  Waves,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PianoKeyboard } from "@/components/piano-keyboard";
import { ChordDiagram } from "@/components/chord-diagram";
import { useAuth } from "@/components/auth-provider";
import { api, ApiError } from "@/lib/api";
import { transposeSymbol } from "@/lib/theory";
import { cn, formatDuration } from "@/lib/utils";
import type { AudioAnalysis, AudioUpload } from "@/types";

const analysesFetcher = (url: string) => api.get<AudioAnalysis[]>(url);

const SECTION_COLORS: Record<string, string> = {
  intro: "bg-sky-500/70",
  verse: "bg-emerald-500/70",
  pre_chorus: "bg-teal-500/70",
  chorus: "bg-fuchsia-500/70",
  bridge: "bg-amber-500/70",
  solo: "bg-orange-500/70",
  outro: "bg-rose-500/70",
  instrumental: "bg-slate-500/70",
};

export default function AudioPage() {
  const { status, token } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [polling, setPolling] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const { data: analyses, mutate, isLoading } = useSWR<AudioAnalysis[]>(
    status === "authenticated" ? "/api/v1/audio/analyses" : null,
    analysesFetcher,
  );

  const selected = analyses?.find((a) => a.id === selectedId) ?? analyses?.[0];

  // Poll while an analysis is running
  React.useEffect(() => {
    if (!polling) return;
    const i = setInterval(() => void mutate(), 2000);
    return () => clearInterval(i);
  }, [polling, mutate]);

  React.useEffect(() => {
    if (!analyses) return;
    const hasRunning = analyses.some((a) => a.status === "pending" || a.status === "running");
    if (!hasRunning) setPolling(null);
  }, [analyses]);

  const onPickFile = () => fileInputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (status !== "authenticated") {
      toast.error("Sign in to upload audio.");
      return;
    }
    if (file.size > 64 * 1024 * 1024) {
      toast.error("File too large (max 64 MB).");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upload = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/audio/uploads`, {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json() as Promise<AudioUpload>);

      await api.post(`/api/v1/audio/uploads/${upload.id}/analyze`, undefined, { authToken: token });
      toast.success("Analysis started.");
      setPolling(upload.id);
      void mutate();
    } catch (err) {
      toast.error((err as ApiError).message ?? "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <AudioLines className="h-7 w-7 text-primary" /> AI Audio Analysis
          </h1>
          <p className="mt-1 text-muted-foreground">
            Upload an MP3 or WAV. We estimate key, tempo, chords, melody, harmony, bass, and structure.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/flac,audio/m4a,audio/ogg,audio/aac,.mp3,.wav,.flac,.m4a,.ogg,.aac"
            onChange={onFile}
            className="hidden"
            aria-label="Choose audio file"
          />
          <Button onClick={onPickFile} disabled={uploading || status !== "authenticated"}>
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Uploading…" : "Upload audio"}
          </Button>
        </div>
      </div>

      {status !== "authenticated" && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-sm">
            You'll need to <a href="/sign-in" className="font-medium underline">sign in</a> to upload and analyze audio.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar: list of analyses */}
        <aside className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted-foreground">Your analyses</h2>
          {isLoading && (
            <div className="grid place-items-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && (!analyses || analyses.length === 0) && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No analyses yet. Upload a song to get started.
              </CardContent>
            </Card>
          )}
          {analyses?.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              className={cn(
                "w-full rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent",
                selected?.id === a.id && "border-primary bg-primary/5",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Analysis {a.id.slice(0, 8)}</span>
                <StatusBadge status={a.status} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {a.key && <span>Key {a.key}</span>}
                {a.tempo_bpm && <span>{Math.round(a.tempo_bpm)} BPM</span>}
                <span>{formatDuration(a.duration_seconds)}</span>
              </div>
            </button>
          ))}
        </aside>

        {/* Main: detailed view */}
        <section>
          {!selected ? (
            <Card>
              <CardContent className="grid place-items-center gap-3 py-20 text-center">
                <Waves className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">Select or upload an analysis to view details.</p>
              </CardContent>
            </Card>
          ) : (
            <AnalysisView analysis={selected} />
          )}
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AudioAnalysis["status"] }) {
  if (status === "done")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
        <CheckCircle2 className="h-3.5 w-3.5" /> Done
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-rose-500">
        <XCircle className="h-3.5 w-3.5" /> Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-500">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> {status}
    </span>
  );
}

function AnalysisView({ analysis }: { analysis: AudioAnalysis }) {
  const uniqueChords = React.useMemo(() => {
    const seen = new Set<string>();
    return (analysis.chords ?? []).filter((c) => {
      if (seen.has(c.chord)) return false;
      seen.add(c.chord);
      return true;
    });
  }, [analysis.chords]);

  if (analysis.status === "failed") {
    return (
      <Card className="border-rose-500/30">
        <CardContent className="py-10 text-center">
          <XCircle className="mx-auto h-8 w-8 text-rose-500" />
          <h3 className="mt-3 font-semibold">Analysis failed</h3>
          <p className="text-sm text-muted-foreground">{analysis.error ?? "Unknown error."}</p>
        </CardContent>
      </Card>
    );
  }
  if (analysis.status !== "done") {
    return (
      <Card>
        <CardContent className="grid place-items-center gap-3 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Analysis {analysis.status}…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Key" value={analysis.key ?? "—"} sub={analysis.scale ?? ""} icon={<Music4 className="h-4 w-4" />} />
        <Stat label="Tempo" value={analysis.tempo_bpm ? `${Math.round(analysis.tempo_bpm)} BPM` : "—"} icon={<Activity className="h-4 w-4" />} />
        <Stat label="Time sig" value={analysis.time_signature ?? "—"} icon={<Clock3 className="h-4 w-4" />} />
        <Stat label="Duration" value={formatDuration(analysis.duration_seconds)} icon={<Waves className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="structure">
        <TabsList>
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="chords">Chords</TabsTrigger>
          <TabsTrigger value="melody">Melody</TabsTrigger>
          <TabsTrigger value="harmony">Harmony</TabsTrigger>
          <TabsTrigger value="bass">Bass</TabsTrigger>
        </TabsList>

        <TabsContent value="structure">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Song structure</CardTitle>
              <CardDescription>Estimated sections of the song.</CardDescription>
            </CardHeader>
            <CardContent>
              <StructureTimeline segments={analysis.structure} total={analysis.duration_seconds ?? 0} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chords">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chord progression</CardTitle>
              <CardDescription>Estimated chord timeline and diagrams.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ChordTimeline chords={analysis.chords} total={analysis.duration_seconds ?? 0} />
              <div>
                <h3 className="mb-3 text-sm font-semibold">Chord library</h3>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {uniqueChords.slice(0, 20).map((c, i) => (
                    <SimpleChordBadge key={i} symbol={c.chord} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="melody">
          <MelodyView notes={analysis.melody} total={analysis.duration_seconds ?? 0} />
        </TabsContent>

        <TabsContent value="harmony">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Harmony suggestions</CardTitle>
              <CardDescription>Diatonic chord suggestions for each melodic event.</CardDescription>
            </CardHeader>
            <CardContent>
              <HarmonyView entries={analysis.harmony} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bass">
          <MelodyView notes={analysis.bass_line} total={analysis.duration_seconds ?? 0} title="Bass line" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
          {icon} {label}
        </p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground capitalize">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function StructureTimeline({ segments, total }: { segments: AudioAnalysis["structure"]; total: number }) {
  if (!segments.length || total <= 0) {
    return <p className="text-sm text-muted-foreground">No structure detected.</p>;
  }
  return (
    <div>
      <div className="flex h-8 w-full overflow-hidden rounded-md border bg-muted">
        {segments.map((s, i) => {
          const pct = ((s.end - s.start) / total) * 100;
          const color = SECTION_COLORS[s.label] ?? "bg-slate-500/70";
          return (
            <div
              key={i}
              className={cn("flex items-center justify-center text-[10px] font-semibold text-white", color)}
              style={{ width: `${pct}%` }}
              title={`${s.label} (${s.start.toFixed(1)}s – ${s.end.toFixed(1)}s)`}
            >
              {pct > 6 ? s.label : ""}
            </div>
          );
        })}
      </div>
      <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className={cn("inline-block h-2 w-2 rounded-full", SECTION_COLORS[s.label] ?? "bg-slate-500")} />
            <span className="capitalize">{s.label}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {s.start.toFixed(1)}s – {s.end.toFixed(1)}s
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChordTimeline({ chords, total }: { chords: AudioAnalysis["chords"]; total: number }) {
  if (!chords.length || total <= 0) return <p className="text-sm text-muted-foreground">No chords detected.</p>;
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded border bg-muted">
        {chords.map((c, i) => {
          const pct = ((c.end - c.start) / total) * 100;
          return (
            <div
              key={i}
              className="flex items-center justify-center border-r border-background/50 bg-primary/60 text-[10px] font-semibold text-primary-foreground last:border-r-0"
              style={{ width: `${pct}%` }}
              title={`${c.chord} (${c.start.toFixed(1)}s – ${c.end.toFixed(1)}s)`}
            >
              {pct > 4 ? c.chord : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MelodyView({
  notes,
  total,
  title = "Melody",
}: {
  notes: AudioAnalysis["melody"];
  total: number;
  title?: string;
}) {
  const [activeMidi, setActiveMidi] = React.useState<number[]>([]);
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => {
    if (!playing || notes.length === 0) return;
    let cancelled = false;
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      if (cancelled) return;
      const t = (performance.now() - start) / 1000;
      const active = notes.filter((n) => t >= n.start && t <= n.end).map((n) => n.midi);
      setActiveMidi(active);
      if (t > total) {
        setPlaying(false);
        setActiveMidi([]);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [playing, notes, total]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Click play to scrub through the extracted notes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setPlaying((p) => !p)} disabled={notes.length === 0}>
            {playing ? "Stop" : "Play"} playback
          </Button>
          <span className="text-xs text-muted-foreground">{notes.length} notes detected</span>
        </div>
        <PianoKeyboard highlightMidi={activeMidi} octaves={3} startOctave={2} />
        <PianoRoll notes={notes} total={total} />
      </CardContent>
    </Card>
  );
}

function PianoRoll({ notes, total }: { notes: AudioAnalysis["melody"]; total: number }) {
  if (!notes.length) return <p className="text-sm text-muted-foreground">No notes.</p>;
  const minMidi = Math.min(...notes.map((n) => n.midi));
  const maxMidi = Math.max(...notes.map((n) => n.midi));
  const range = Math.max(1, maxMidi - minMidi);
  const height = 160;
  return (
    <div className="relative w-full overflow-hidden rounded border bg-muted" style={{ height }}>
      {notes.map((n, i) => {
        const left = (n.start / Math.max(total, 1)) * 100;
        const width = ((n.end - n.start) / Math.max(total, 1)) * 100;
        const top = ((maxMidi - n.midi) / range) * (height - 8) + 4;
        return (
          <div
            key={i}
            className="absolute h-2 rounded bg-primary/80"
            style={{ left: `${left}%`, width: `${width}%`, top, height: 4 }}
            title={`${n.pitch} ${n.start.toFixed(2)}s – ${n.end.toFixed(2)}s`}
          />
        );
      })}
    </div>
  );
}

function HarmonyView({ entries }: { entries: AudioAnalysis["harmony"] }) {
  if (!entries.length) return <p className="text-sm text-muted-foreground">No harmony suggestions.</p>;
  return (
    <div className="grid max-h-96 grid-cols-2 gap-1 overflow-y-auto text-sm sm:grid-cols-3 md:grid-cols-4">
      {entries.slice(0, 200).map((h, i) => (
        <div key={i} className="rounded border bg-muted/30 px-2 py-1 font-mono">
          <span className="font-semibold text-primary">{h.chord}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {h.start.toFixed(1)}s
          </span>
        </div>
      ))}
    </div>
  );
}

function SimpleChordBadge({ symbol }: { symbol: string }) {
  const displayed = transposeSymbol(symbol, 0);
  // Try to use the canonical 6-string open shape if we know it.
  const SHAPES: Record<string, { base: number; frets: number[] }> = {
    C: { base: 1, frets: [-1, 3, 2, 0, 1, 0] },
    D: { base: 1, frets: [-1, -1, 0, 2, 3, 2] },
    E: { base: 1, frets: [0, 2, 2, 1, 0, 0] },
    Em: { base: 1, frets: [0, 2, 2, 0, 0, 0] },
    G: { base: 1, frets: [3, 2, 0, 0, 0, 3] },
    A: { base: 1, frets: [-1, 0, 2, 2, 2, 0] },
    Am: { base: 1, frets: [-1, 0, 2, 2, 1, 0] },
    F: { base: 1, frets: [1, 3, 3, 2, 1, 1] },
    Bm: { base: 2, frets: [-1, 2, 4, 4, 3, 2] },
  };
  const root = symbol.match(/^[A-G][#b]?/)?.[0] ?? "";
  const shape = SHAPES[symbol] ?? SHAPES[root] ?? null;
  if (!shape) {
    return (
      <div className="flex flex-col items-center text-sm">
        <span className="font-semibold">{displayed}</span>
        <span className="text-xs text-muted-foreground">no diagram</span>
      </div>
    );
  }
  return <ChordDiagram symbol={displayed} frets={shape.frets} baseFret={shape.base} size="sm" />;
}
