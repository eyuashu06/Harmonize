// Pitch detection hook using the autocorrelation method on the microphone input.
// Returns the most recent detected frequency (Hz) and nearest MIDI note.
"use client";

import * as React from "react";

export interface PitchReading {
  frequency: number;
  midi: number;
  noteName: string;
  clarity: number; // 0..1
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function freqToMidi(hz: number): number {
  if (hz <= 0) return NaN;
  return 69 + 12 * Math.log2(hz / 440);
}

function midiToNote(midi: number): string {
  if (Number.isNaN(midi)) return "—";
  const rounded = Math.round(midi);
  return `${NOTE_NAMES[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
}

function autoCorrelate(buf: Float32Array, sampleRate: number): { freq: number; clarity: number } {
  // Yin-lite: simple autocorrelation peak picking.
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return { freq: -1, clarity: 0 };

  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  }

  const trimmed = buf.subarray(r1, r2);
  const newSize = trimmed.length;
  const c = new Array(newSize).fill(0);
  for (let i = 0; i < newSize; i++) {
    for (let j = 0; j < newSize - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < newSize; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  if (T0 <= 0) return { freq: -1, clarity: 0 };
  const x1 = c[T0 - 1] || 0;
  const x2 = c[T0] || 0;
  const x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);
  const freq = sampleRate / T0;
  return { freq, clarity: Math.min(1, maxval / (c[0] || 1)) };
}

export function usePitchDetector(active: boolean) {
  const [reading, setReading] = React.useState<PitchReading | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const ctxRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const sourceRef = React.useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const activeRef = React.useRef(active);
  activeRef.current = active;

  const stop = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (sourceRef.current) sourceRef.current.disconnect();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    sourceRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    setReading(null);
  }, []);

  const start = React.useCallback(async () => {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      ctxRef.current = ctx;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const src = ctx.createMediaStreamSource(stream);
      sourceRef.current = src;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Float32Array(analyser.fftSize);
      const loop = () => {
        if (!activeRef.current) return;
        analyser.getFloatTimeDomainData(buf);
        const { freq, clarity } = autoCorrelate(buf, ctx.sampleRate);
        if (freq > 0) {
          const midi = freqToMidi(freq);
          setReading({ frequency: freq, midi, noteName: midiToNote(midi), clarity });
        } else {
          setReading(null);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      setError((e as Error).message || "Microphone access denied.");
    }
  }, []);

  React.useEffect(() => {
    if (active) void start();
    else stop();
    return () => stop();
  }, [active, start, stop]);

  return { reading, error };
}
