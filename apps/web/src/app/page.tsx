import Link from "next/link";
import {
  Guitar,
  Mic2,
  Music4,
  PianoIcon,
  Sliders,
  Sparkles,
  Upload,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: <Music4 className="h-5 w-5" />,
    title: "Synchronized lyrics & chords",
    body: "Search a song and see lyrics scroll in time with chord charts for guitar, piano, and bass — in any key.",
  },
  {
    icon: <Sliders className="h-5 w-5" />,
    title: "Transpose on the fly",
    body: "Move any song up or down by semitones. We suggest a capo position so you can play in the original key with friendlier shapes.",
  },
  {
    icon: <Waves className="h-5 w-5" />,
    title: "AI audio analysis",
    body: "Drop in an MP3 or WAV. We estimate key, tempo, chords, melody, harmony, bass line, and song structure.",
  },
  {
    icon: <Mic2 className="h-5 w-5" />,
    title: "Practice mode",
    body: "Auto-scrolling lyrics, metronome, section loop, MIDI playback, pitch detection, recording & comparison.",
  },
  {
    icon: <PianoIcon className="h-5 w-5" />,
    title: "Piano & guitar visualizers",
    body: "See the chord you're playing on a virtual piano keyboard and guitar fretboard with suggested fingerings.",
  },
  {
    icon: <Upload className="h-5 w-5" />,
    title: "Print-ready chord sheets",
    body: "Clean, monochrome print layouts with sections, capo, and tuned transpositions. Perfect for the gig binder.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.12),_transparent_60%)]" />
        <div className="container grid gap-10 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Built for musicians, by musicians
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Learn, perform, and practice
              <br />
              <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                every song in your setlist.
              </span>
            </h1>
            <p className="mt-6 max-w-prose text-lg text-muted-foreground">
              HarmonyHub gives you synchronized lyrics, chord charts, and an AI-powered practice
              studio — all in your browser. Transpose to your key, loop the bridge, record yourself
              and compare to the original.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/songs">Browse songs</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/sign-in">Create an account</Link>
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Guitar className="h-4 w-4" /> Guitar, piano, bass
              </div>
              <div className="flex items-center gap-2">
                <Mic2 className="h-4 w-4" /> Pitch detection
              </div>
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4" /> MP3 / WAV analysis
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl border bg-card p-6 shadow-2xl">
              <div className="space-y-2">
                <p className="section-marker">Verse 1</p>
                <div className="flex gap-2 text-primary">
                  <span className="chord">Em7</span>
                  <span className="chord">G</span>
                  <span className="chord">Dsus4</span>
                  <span className="chord">A7sus4</span>
                </div>
                <p className="text-lg">Today is gonna be the day</p>
                <div className="flex gap-2 pt-3 text-primary">
                  <span className="chord">F#m7</span>
                  <span className="chord">A</span>
                  <span className="chord">E</span>
                  <span className="chord">E6</span>
                </div>
                <p className="text-lg">By now you should've somehow</p>
                <p className="section-marker pt-4">Chorus</p>
                <div className="flex gap-2 text-primary">
                  <span className="chord">C</span>
                  <span className="chord">D</span>
                  <span className="chord">E</span>
                </div>
                <p className="text-lg">Realised what you gotta do</p>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 hidden rounded-xl border bg-card/90 p-4 text-sm shadow-xl md:block">
              <p className="font-medium">🎼 Capo suggestion</p>
              <p className="text-muted-foreground">Play in C shapes with capo on 2 = key of D</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="mb-12 max-w-prose">
          <h2 className="text-3xl font-bold tracking-tight">Everything a working musician needs</h2>
          <p className="mt-3 text-muted-foreground">
            Built for guitarists, pianists, bassists, and singers — from first learn-through to gig night.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="bg-card/50">
              <CardHeader>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  {f.icon}
                </div>
                <CardTitle className="mt-4 text-base">{f.title}</CardTitle>
                <CardDescription>{f.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-fuchsia-500/10 p-10 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Ready to start practicing smarter?</h2>
          <p className="mx-auto mt-3 max-w-prose text-muted-foreground">
            Sign in to save favorites, build playlists, and track your practice history across devices.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/sign-in">Get started — it's free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/audio">Try audio analysis</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
