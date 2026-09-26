# Practice Mode

Practice mode is the heart of the app for working musicians. It's at `/practice` and takes a `?song=<id>` query parameter.

## Features

* **Auto-scrolling lyrics** — clicks pause the scroll; tap any line to jump to it.
* **Transposition** — every chord symbol on screen respects the current transpose offset.
* **Metronome** — Web Audio scheduled clicks; precise timing even under UI load.
* **Adjustable playback speed** — 40–140% of the song's original BPM. All tempo references in the UI update live.
* **Section loop** — pick a section (verse, chorus, bridge…) and the active line index is constrained to that section.
* **Chord highlighting** — the chord at the current line lights up on both the piano and the guitar fretboard.
* **Piano keyboard** — 2-octave SVG visualization, multi-note highlighting.
* **Guitar fretboard** — diagrams sourced from the song's `chords` table, transposed live.
* **MIDI playback** — Web Audio oscillators arpeggiate the current line's chords. Listen to what you should be playing.
* **Pitch detection** — autocorrelation-based, mic-permission gated. Shows current note name and frequency in Hz.
* **Recording** — `MediaRecorder` captures your performance. Replay it side-by-side with the song.
* **Progress tracking** — every practice session is saved to `practice_sessions` and shown in your profile stats.

## Hooks

* `useMetronome({ bpm, beatsPerMeasure, soundOn, onBeat })` — accurate, scheduled, low-CPU.
* `usePitchDetector(active: boolean)` — requests mic permission, auto-stops when `active` flips to false.
* `useRecorder()` — `start()` / `stop()` and a `url` for the resulting blob.
* `useMidiPlayback()` — `playNote`, `playChord`, `scheduleMelody` (all scheduled against the shared AudioContext).

## State

All practice state is local — no server round-trips during a session. When you press **Save session**, the following is `POST`ed to `/api/v1/practice/sessions`:

```ts
{
  song_id: UUID,
  duration_seconds: number,
  sections_completed: string[],
  average_tempo_bpm: number,
  pitch_accuracy: number | null,    // last measured clarity 0..1
  timing_accuracy: number | null,
  notes: string | null,
  recording_url: string | null,     // object URL of the recording (transient)
  extra: object
}
```

> Note: `recording_url` from a local practice session is a `blob:` URL. To persist recordings across devices, switch the recorder to upload chunks to S3/R2 and store the public URL here.

## AudioContext lifecycle

* All hooks share a single `AudioContext` per page. Created lazily on first user interaction (browser autoplay policies).
* The context is suspended on unmount and resumed on demand. You'll never get a "click to play" warning.

## Accessibility

* Every interactive control has an `aria-label`.
* The piano keyboard is keyboard-focusable via Tab and exposes `role="img"` with a descriptive `aria-label`.
* The transport controls respect `prefers-reduced-motion` — animated scroll is disabled.

## Keyboard shortcuts

| Key            | Action                          |
|----------------|----------------------------------|
| `Space`        | Start / stop metronome           |
| `←` / `→`      | Prev / next lyric line           |
| `[` / `]`      | Decrease / increase transpose     |
| `r`            | Toggle recording                 |
