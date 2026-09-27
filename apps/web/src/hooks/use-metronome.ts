// Web Audio metronome. Uses AudioContext + scheduled OscillatorNodes for accurate timing.
"use client";

import * as React from "react";

export interface MetronomeOptions {
  bpm: number;
  beatsPerMeasure?: number;
  soundOn?: boolean;
  onBeat?: (beatIndex: number) => void;
}

export function useMetronome({ bpm, beatsPerMeasure = 4, soundOn = true, onBeat }: MetronomeOptions) {
  const [running, setRunning] = React.useState(false);
  const ctxRef = React.useRef<AudioContext | null>(null);
  const nextNoteTimeRef = React.useRef(0);
  const beatIndexRef = React.useRef(0);
  const timerRef = React.useRef<number | null>(null);
  const bpmRef = React.useRef(bpm);
  const onBeatRef = React.useRef(onBeat);

  React.useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  React.useEffect(() => { onBeatRef.current = onBeat; }, [onBeat]);

  const ensureCtx = () => {
    if (!ctxRef.current) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === "suspended") {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  };

  const scheduleClick = (time: number, isAccent: boolean) => {
    const ctx = ctxRef.current!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = isAccent ? 1500 : 900;
    osc.connect(gain).connect(ctx.destination);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(isAccent ? 0.4 : 0.2, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.06);
  };

  const scheduler = React.useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const lookahead = 0.1;   // seconds
    const scheduleAhead = 0.1;
    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAhead) {
      const beat = beatIndexRef.current % beatsPerMeasure;
      const isAccent = beat === 0;
      if (soundOn) scheduleClick(nextNoteTimeRef.current, isAccent);
      // Save the beat time for visual sync
      const scheduledAt = nextNoteTimeRef.current;
      const beatIdx = beatIndexRef.current;
      window.setTimeout(() => onBeatRef.current?.(beatIdx), Math.max(0, (scheduledAt - ctx.currentTime) * 1000));
      const secondsPerBeat = 60.0 / bpmRef.current;
      nextNoteTimeRef.current += secondsPerBeat;
      beatIndexRef.current++;
    }
    timerRef.current = window.setTimeout(scheduler, lookahead * 1000);
  }, [beatsPerMeasure, soundOn]);

  const start = React.useCallback(() => {
    const ctx = ensureCtx();
    setRunning(true);
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    beatIndexRef.current = 0;
    scheduler();
  }, [scheduler]);

  const stop = React.useCallback(() => {
    setRunning(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  React.useEffect(() => () => stop(), [stop]);

  return { running, start, stop };
}
