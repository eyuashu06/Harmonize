// MediaRecorder hook for capturing user performance audio.
"use client";

import * as React from "react";

export function useRecorder() {
  const [recording, setRecording] = React.useState(false);
  const [url, setUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  const start = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const u = URL.createObjectURL(blob);
        setUrl(u);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (e) {
      setError((e as Error).message || "Microphone access denied.");
    }
  }, []);

  const stop = React.useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    setRecording(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return { recording, url, error, start, stop };
}
