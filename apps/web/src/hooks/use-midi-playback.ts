// Simple MIDI-style note playback using the Web Audio API.
// Used to play the melody line or arpeggiate chords during practice.
"use client";

import * as React from "react";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteNameToMidi(name: string): number | null {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(name.trim());
  if (!m) return null;
  const [, letter, acc, oct] = m;
  const idx = NOTE_NAMES.indexOf(letter + (acc ?? ""));
  if (idx < 0) return null;
  return (parseInt(oct, 10) + 1) * 12 + idx;
}

export interface PlaybackNote {
  pitch: string; // "C#4"
  start: number;  // seconds
  end: number;    // seconds
  velocity?: number;
}

export function useMidiPlayback() {
  const ctxRef = React.useRef<AudioContext | null>(null);
  const activeRef = React.useRef<Set<OscillatorNode>>(new Set());

  const ensureCtx = React.useCallback(() => {
    if (!ctxRef.current) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playNote = React.useCallback(
    (midi: number, when: number, duration: number, velocity = 0.7) => {
      const ctx = ensureCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      const startAbs = ctx.currentTime + when;
      const stopAbs = startAbs + duration;
      gain.gain.setValueAtTime(0, startAbs);
      gain.gain.linearRampToValueAtTime(velocity, startAbs + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAbs);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startAbs);
      osc.stop(stopAbs + 0.05);
      activeRef.current.add(osc);
      osc.onended = () => activeRef.current.delete(osc);
    },
    [ensureCtx],
  );

  const playChord = React.useCallback(
    (midiNotes: number[], when = 0, duration = 0.8) => {
      midiNotes.forEach((m) => playNote(m, when, duration, 0.5));
    },
    [playNote],
  );

  const scheduleMelody = React.useCallback(
    (notes: PlaybackNote[]) => {
      ensureCtx();
      const start = ctxRef.current!.currentTime + 0.1;
      for (const n of notes) {
        const midi = noteNameToMidi(n.pitch);
        if (midi == null) continue;
        playNote(midi, n.start, Math.max(0.1, n.end - n.start), n.velocity ?? 0.7);
      }
      return start;
    },
    [ensureCtx, playNote],
  );

  const stopAll = React.useCallback(() => {
    activeRef.current.forEach((o) => {
      try { o.stop(); } catch { /* already stopped */ }
    });
    activeRef.current.clear();
  }, []);

  return { playNote, playChord, scheduleMelody, stopAll, noteNameToMidi };
}
