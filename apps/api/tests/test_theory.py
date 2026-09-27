"""Tests for the music theory engine."""
from __future__ import annotations

import pytest

from app.songs.theory import (
    chord_notes,
    detect_key_from_chords,
    get_guitar_fingering,
    parse_chord,
    piano_notes,
    suggest_capo,
    transpose_key,
    transpose_symbol,
)


class TestParseChord:
    def test_simple_major(self):
        p = parse_chord("C")
        assert p.root == "C"
        assert p.quality == ""

    def test_minor(self):
        p = parse_chord("Am")
        assert p.root == "A"
        assert p.quality == "m"

    def test_seventh(self):
        p = parse_chord("G7")
        assert p.root == "G"
        assert p.quality == "7"

    def test_major_seventh(self):
        p = parse_chord("Cmaj7")
        assert p.root == "C"
        assert p.quality == "maj7"

    def test_sharp_root(self):
        p = parse_chord("F#m")
        assert p.root == "F#"

    def test_flat_root(self):
        p = parse_chord("Bbmaj7")
        assert p.root == "Bb"

    def test_slash_chord(self):
        p = parse_chord("C/B")
        assert p.root == "C"
        assert p.bass == "B"

    def test_sharp_slash_chord(self):
        p = parse_chord("F#m7/A#")
        assert p.root == "F#"
        assert p.bass == "A#"

    def test_unknown_returns_unchanged(self):
        p = parse_chord("Hwat")
        assert p.symbol == "Hwat"


class TestTransposeSymbol:
    @pytest.mark.parametrize(
        ("symbol", "semitones", "expected"),
        [
            ("C", 2, "D"),
            ("C", -2, "A#"),
            ("G", 5, "C"),
            ("F", 1, "F#"),
            ("Bb", 2, "C"),
            ("Em7", 3, "Gm7"),
            ("F#m", -1, "Fm"),
        ],
    )
    def test_transpose(self, symbol, semitones, expected):
        assert transpose_symbol(symbol, semitones) == expected

    def test_transpose_with_flats(self):
        # Transpose C by 1 semitone with prefer_flats -> Db
        assert transpose_symbol("C", 1, prefer_flats=True) == "Db"

    def test_transpose_slash_chord(self):
        # F#m/A# up 2 semitones -> G#m/C  (A# + 2 = C)
        out = transpose_symbol("F#m/A#", 2)
        assert out.startswith("G#m")
        assert out.endswith("/C")

    def test_unknown_passthrough(self):
        assert transpose_symbol("Hwat", 3) == "Hwat"


class TestTransposeKey:
    def test_major_key(self):
        assert transpose_key("G", 2) == "A"

    def test_minor_key(self):
        assert transpose_key("Am", 3) == "Cm"

    def test_unknown_passthrough(self):
        assert transpose_key("Hwat", 3) == "Hwat"


class TestSuggestCapo:
    def test_capo_for_g_using_c_shape(self):
        # Playing C shapes with capo on 7 = G
        assert suggest_capo("G", "C") == 7

    def test_capo_for_d_using_c_shape(self):
        # C + capo 2 = D
        assert suggest_capo("D", "C") == 2

    def test_no_capo_same_key(self):
        assert suggest_capo("C", "C") == 0


class TestChordNotes:
    def test_c_major(self):
        assert chord_notes("C") == ["C", "E", "G"]

    def test_a_minor(self):
        assert chord_notes("Am") == ["A", "C", "E"]

    def test_g7(self):
        assert chord_notes("G7") == ["G", "B", "D", "F"]

    def test_cmaj7(self):
        assert chord_notes("Cmaj7") == ["C", "E", "G", "B"]


class TestPianoNotes:
    def test_c_middle_c_octave_4(self):
        # C4 = 60, E4 = 64, G4 = 67
        assert piano_notes("C", octave=4) == [60, 64, 67]

    def test_am7(self):
        # A3=57, C4=60, E4=64, G4=67
        assert piano_notes("Am7", octave=3) == [57, 60, 64, 67]


class TestGuitarFingering:
    def test_c_chord(self):
        f = get_guitar_fingering("C")
        assert f is not None
        base, frets = f
        assert base == 1
        assert frets[0] == -1  # low E muted
        assert frets[1] == 3   # A string fret 3

    def test_g_chord(self):
        f = get_guitar_fingering("G")
        assert f is not None
        _, frets = f
        assert frets == [3, 2, 0, 0, 0, 3]


class TestDetectKeyFromChords:
    def test_returns_most_common_root(self):
        assert detect_key_from_chords(["C", "F", "G", "C", "Am"]) == "C"

    def test_handles_minor(self):
        # Tied roots — all appear once. Result is implementation-defined;
        # we just assert it's one of the roots that appeared.
        result = detect_key_from_chords(["Am", "F", "C", "G", "Em"])
        assert result in {"A", "F", "C", "G", "E"}

    def test_empty(self):
        assert detect_key_from_chords([]) is None

    def test_unknown(self):
        assert detect_key_from_chords(["Hwat", "Foo"]) is None
