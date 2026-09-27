"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  Activity,
  ChevronLeft,
  Disc3,
  Gauge,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  Repeat,
  Save,
  Square,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { PianoKeyboard } from "@/components/piano-keyboard";
import { ChordDiagram } from "@/components/chord-diagram";
import { useAuth } from "@/components/auth-provider";
import { useMetronome } from "@/hooks/use-metronome";
import { usePitchDetector } from "@/hooks/use-pitch-detector";
import { useRecorder } from "@/hooks/use-recorder";
import { useMidiPlayback } from "@/hooks/use-midi-playback";
import { api, ApiError } from "@/lib/api";
import { transposeSymbol } from "@/lib/theory";
import { pianoMidi } from "@/lib/format";
import { formatDuration, cn } from "@/lib/utils";
import type { Song, PracticeSession } from "@/types";

const fetcher = (url: string) => api.get<Song>(url);

export default function PracticePage() {
  const params = useSearchParams();
  const songId = params.get("song");
  const { status, token } = useAuth();

  const { data: song, isLoading } = useSWR<Song>(
    songId ? `/api/v1/songs/${songId}` : null,
    fetcher,
  );

  // Practice state
  const [semitones] = React.useState(0);
  const [tempoPct, setTempoPct] = React.useState(100);
  const [loopSection, setLoopSection] = React.useState<string | null>(null);
  const [activeLineIdx, setActiveLineIdx] = React.useState(0);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const [metronomeOn, setMetronomeOn] = React.useState(true);
  const [currentBeat, setCurrentBeat] = React.useState(0);
  const [pitchDetectionOn, setPitchDetectionOn] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [startedAt] = React.useState(() => new Date());

  // Hooks
  const effectiveBpm = React.useMemo(() => {
    if (!song?.tempo_bpm) return 100;
    return Math.round(song.tempo_bpm * (tempoPct / 100));
  }, [song?.tempo_bpm, tempoPct]);

  const { running: metronomeRunning, start: startMetronome, stop: stopMetronome } = useMetronome({
    bpm: effectiveBpm,
    beatsPerMeasure: parseInt(song?.time_signature?.split("/")[0] ?? "4", 10) || 4,
    soundOn: metronomeOn,
    onBeat: setCurrentBeat,
  });

  const { reading: pitchReading } = usePitchDetector(pitchDetectionOn);
  const { recording, url: recordingUrl, start: startRecording, stop: stopRecording } = useRecorder();
  const { scheduleMelody } = useMidiPlayback();

  // Track elapsed time
  React.useEffect(() => {
    const i = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.getTime()) / 1000)), 1000);
    return () => clearInterval(i);
  }, [startedAt]);

  // MIDI playback — arpeggiate the active line's chords
  const playCurrentChords = React.useCallback(() => {
    if (!song) return;
    const line = song.lyrics[activeLineIdx];
    if (!line) return;
    const arpeggio = line.chords.slice(0, 4).map((c, i) => ({
      pitch: `${transposeSymbol(c.chord, semitones).replace(/[^A-G#b]/g, "")}4`,
      start: i * 0.3,
      end: (i + 1) * 0.3,
      velocity: 0.5,
    }));
    scheduleMelody(arpeggio);
  }, [song, activeLineIdx, semitones, scheduleMelody]);

  // Compute highlighted chord on the active line
  const activeLine = song?.lyrics[activeLineIdx];
  const activeChord = activeLine?.chords[0]
    ? transposeSymbol(activeLine.chords[0].chord, semitones)
    : null;

  const saveSession = async () => {
    if (status !== "authenticated" || !song) {
      toast.error("Sign in to save practice sessions.");
      return;
    }
    try {
      const payload = {
        song_id: song.id,
        duration_seconds: elapsed,
        sections_completed: loopSection ? [loopSection] : [],
        average_tempo_bpm: effectiveBpm,
        pitch_accuracy: pitchReading ? pitchReading.clarity : null,
        timing_accuracy: null,
        notes: null,
        recording_url: recordingUrl,
        extra: {},
      };
      const s = await api.post<PracticeSession>(
        "/api/v1/practice/sessions",
        payload,
        { authToken: token },
      );
      toast.success(`Session saved (${formatDuration(s.duration_seconds)}).`);
    } catch (e) {
      toast.error((e as ApiError).message ?? "Couldn't save session.");
    }
  };

  if (!songId) {
    return <EmptyPractice />;
  }
  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!song) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-semibold">Pick a song to practice</h1>
        <p className="mt-2 text-muted-foreground">Open any song and click "Practice" to begin.</p>
        <Button asChild className="mt-6">
          <a href="/songs">Browse songs</a>
        </Button>
      </div>
    );
  }

  const t = (s: string) => transposeSymbol(s, semitones);

  return (
    <div className="container grid gap-4 py-6 lg:grid-cols-[1fr_360px]">
      {/* Main: lyrics with auto-scroll */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <a href={`/songs/${song.id}`}><ChevronLeft className="mr-1 h-4 w-4" /> Back to song</a>
          </Button>
          <h1 className="ml-2 text-2xl font-bold">Practice: {song.title}</h1>
        </div>

        <Card>
          <CardContent className="p-0">
            <div
              className="max-h-[60vh] overflow-y-auto p-6 font-mono text-lg leading-relaxed"
              ref={(el) => {
                if (autoScroll && el) {
                  const target = el.querySelector<HTMLElement>(`[data-line="${activeLineIdx}"]`);
                  target?.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
            >
              {song.lyrics.map((line, idx) => (
                <div
                  key={line.id}
                  data-line={idx}
                  onClick={() => setActiveLineIdx(idx)}
                  className={cn(
                    "cursor-pointer rounded px-2 py-1 transition-colors",
                    idx === activeLineIdx && "bg-primary/10 ring-2 ring-primary/30",
                    loopSection && "opacity-50",
                  )}
                >
                  {line.chords.length > 0 && (
                    <div className="flex flex-wrap gap-3 text-primary">
                      {line.chords.map((c, i) => (
                        <span key={i} className="chord">{t(c.chord)}</span>
                      ))}
                    </div>
                  )}
                  <div>{line.text || " "}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visualizers</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">Piano — {activeChord ?? "—"}</p>
              <PianoKeyboard highlightMidi={activeChord ? pianoMidi(activeChord) : []} />
            </div>
            {activeChord && song.chords.find((c) => t(c.symbol) === activeChord) && (
              <div>
                <p className="mb-2 text-sm font-medium">Guitar — {activeChord}</p>
                {(() => {
                  const shape = song.chords.find((c) => t(c.symbol) === activeChord)!;
                  return (
                    <ChordDiagram
                      symbol={t(shape.symbol)}
                      frets={shape.guitar_frets}
                      baseFret={shape.guitar_base_fret}
                      size="lg"
                    />
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar: controls */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Elapsed</span>
              <span className="font-mono">{formatDuration(elapsed)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tempo</span>
              <span className="font-mono">{effectiveBpm} BPM</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pitch</span>
              <span className="font-mono">
                {pitchReading ? `${pitchReading.noteName} (${pitchReading.frequency.toFixed(0)} Hz)` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Beat</span>
              <span className="font-mono">{currentBeat + 1}</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {metronomeRunning ? (
                <Button size="sm" onClick={stopMetronome}>
                  <Pause className="mr-1 h-4 w-4" /> Stop metronome
                </Button>
              ) : (
                <Button size="sm" onClick={startMetronome}>
                  <Play className="mr-1 h-4 w-4" /> Start metronome
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={playCurrentChords}>
                <Volume2 className="mr-1 h-4 w-4" /> Play line
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tempo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{tempoPct}%</span>
            </div>
            <Slider
              value={[tempoPct]}
              min={40}
              max={140}
              step={5}
              onValueChange={(v) => setTempoPct(v[0])}
              aria-label="Playback speed"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>40%</span><span>100%</span><span>140%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Toggles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Auto-scroll lyrics" icon={<Activity className="h-4 w-4" />}>
              <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
            </Row>
            <Row label="Metronome sound" icon={<Disc3 className="h-4 w-4" />}>
              <Switch checked={metronomeOn} onCheckedChange={setMetronomeOn} />
            </Row>
            <Row label="Pitch detection" icon={<Mic className="h-4 w-4" />}>
              <Switch checked={pitchDetectionOn} onCheckedChange={setPitchDetectionOn} />
            </Row>
            {loopSection && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
                Looping: <strong>{loopSection}</strong>
                <Button size="sm" variant="ghost" className="ml-2 h-6 px-2" onClick={() => setLoopSection(null)}>
                  clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sections (loop)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {song.sections.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant={loopSection === s.name ? "default" : "outline"}
                onClick={() => setLoopSection(loopSection === s.name ? null : s.name)}
              >
                <Repeat className="mr-1 h-3 w-3" /> {s.name}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record & save</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recording ? (
              <Button size="sm" variant="destructive" onClick={stopRecording} className="w-full">
                <Square className="mr-1 h-4 w-4" /> Stop recording
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={startRecording} className="w-full">
                <Mic className="mr-1 h-4 w-4" /> Record performance
              </Button>
            )}
            {recordingUrl && (
              <audio src={recordingUrl} controls className="w-full" />
            )}
            <Button onClick={saveSession} className="w-full" size="sm">
              <Save className="mr-1 h-4 w-4" /> Save session
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Row({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon} {label}
      </span>
      {children}
    </div>
  );
}

function EmptyPractice() {
  return (
    <div className="container py-20 text-center">
      <MicOff className="mx-auto h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-semibold">Pick a song to practice</h1>
      <p className="mt-2 text-muted-foreground">
        Open a song and click the <strong>Practice</strong> button to enter the studio.
      </p>
      <Button asChild className="mt-6">
        <a href="/songs">Browse songs</a>
      </Button>
    </div>
  );
}


