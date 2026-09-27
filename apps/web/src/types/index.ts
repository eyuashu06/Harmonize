// TypeScript types matching the backend API contracts.

export type UUID = string;

export type SectionType =
  | "intro"
  | "verse"
  | "pre_chorus"
  | "chorus"
  | "bridge"
  | "instrumental"
  | "solo"
  | "outro";

export interface User {
  id: UUID;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  role: "user" | "artist" | "admin";
  is_active: boolean;
  primary_instrument: string | null;
  skill_level: string | null;
  created_at: string;
  last_seen_at: string | null;
}

export interface Section {
  id: UUID;
  name: string;
  type: SectionType;
  order_index: number;
  start_seconds: number | null;
  end_seconds: number | null;
  repeat: number;
}

export interface LyricLine {
  id: UUID;
  line_index: number;
  text: string;
  chords: ChordEvent[];
  start_seconds: number | null;
  end_seconds: number | null;
}

export interface ChordEvent {
  chord: string;
  beat: number;
}

export interface ChordShape {
  id: UUID;
  symbol: string;
  root: string;
  quality: string;
  guitar_frets: number[];
  guitar_fingers: number[];
  guitar_base_fret: number;
  piano_notes: { midi: number; hand: "left" | "right" }[];
}

export interface SongSummary {
  id: UUID;
  title: string;
  artist: string;
  album: string | null;
  duration_seconds: number | null;
  key: string | null;
  mode: string | null;
  tempo_bpm: number | null;
  time_signature: string | null;
  difficulty: string;
  tags: string[];
}

export interface Song extends SongSummary {
  capo: number;
  tuning: string | null;
  language: string;
  is_public: boolean;
  sections: Section[];
  lyrics: LyricLine[];
  chords: ChordShape[];
  created_at: string;
  updated_at: string;
}

export interface SongSearchResponse {
  items: SongSummary[];
  total: number;
  query: string;
}

export interface TransposeResponse {
  original_key: string | null;
  new_key: string | null;
  suggested_capo: number | null;
  semitones: number;
  transposed_chords: string[];
}

export interface Playlist {
  id: UUID;
  user_id: UUID;
  name: string;
  description: string | null;
  is_public: boolean;
  song_ids: UUID[];
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: UUID;
  song_id: UUID;
  created_at: string;
}

export interface PracticeSession {
  id: UUID;
  user_id: UUID;
  song_id: UUID | null;
  duration_seconds: number;
  sections_completed: string[];
  average_tempo_bpm: number | null;
  pitch_accuracy: number | null;
  timing_accuracy: number | null;
  notes: string | null;
  recording_url: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface PracticeStats {
  total_sessions: number;
  total_minutes: number;
  average_pitch_accuracy: number | null;
  average_timing_accuracy: number | null;
  last_7_days: { date: string; minutes: number }[];
}

export interface AudioUpload {
  id: UUID;
  user_id: UUID;
  song_id: UUID | null;
  filename: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  duration_seconds: number | null;
  created_at: string;
}

export interface AudioAnalysis {
  id: UUID;
  upload_id: UUID;
  user_id: UUID;
  status: "pending" | "running" | "done" | "failed";
  error: string | null;
  key: string | null;
  scale: string | null;
  tempo_bpm: number | null;
  time_signature: string | null;
  duration_seconds: number | null;
  chords: { start: number; end: number; chord: string }[];
  melody: { start: number; end: number; midi: number; pitch: string; velocity: number }[];
  harmony: { start: number; end: number; chord: string }[];
  bass_line: { start: number; end: number; midi: number; pitch: string; velocity: number }[];
  structure: { start: number; end: number; label: string }[];
  created_at: string;
}

export interface BackendSession {
  access_token: string;
  token_type: string;
  user_id: UUID;
  email: string | null;
}
