"use client";

import * as Tone from "tone";

export type ExercisePhase = "warmup" | "working" | "rest" | "cooldown";

export interface MusicParams {
  key: string;
  mode: string;
  density: number;
  reverb: number;
  bpm_multiplier: number;
}

const PHASE_PARAMS: Record<ExercisePhase, MusicParams> = {
  warmup: { key: "C", mode: "major", density: 0.3, reverb: 0.6, bpm_multiplier: 0.7 },
  working: { key: "D", mode: "dorian", density: 0.6, reverb: 0.3, bpm_multiplier: 1.0 },
  rest: { key: "F", mode: "lydian", density: 0.1, reverb: 0.8, bpm_multiplier: 0.5 },
  cooldown: { key: "G", mode: "lydian", density: 0.15, reverb: 0.9, bpm_multiplier: 0.6 },
};

// Scale degrees for modes
const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};

const KEY_OFFSETS: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

function getScaleNotes(key: string, mode: string, octave: number = 4): string[] {
  const scale = SCALES[mode] || SCALES.major;
  const offset = KEY_OFFSETS[key] || 0;
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  return scale.map((degree) => {
    const noteIndex = (degree + offset) % 12;
    const noteOctave = octave + Math.floor((degree + offset) / 12);
    return `${noteNames[noteIndex]}${noteOctave}`;
  });
}

export interface MusicEngine {
  start: () => Promise<void>;
  stop: () => void;
  setPhase: (phase: ExercisePhase) => void;
  setBpm: (bpm: number) => void;
  setParams: (params: Partial<MusicParams>) => void;
  isPlaying: () => boolean;
}

export function createMusicEngine(baseBpm: number = 70): MusicEngine {
  let synth: Tone.PolySynth | null = null;
  let reverb: Tone.Reverb | null = null;
  let loopEvent: Tone.Loop | null = null;
  let playing = false;
  let currentParams: MusicParams = { ...PHASE_PARAMS.warmup };
  let currentBpm = baseBpm;

  function buildNotePattern(params: MusicParams): string[] {
    const notes = getScaleNotes(params.key, params.mode);
    // Pick notes based on density
    const count = Math.max(1, Math.round(notes.length * params.density));
    return notes.slice(0, count);
  }

  async function start(): Promise<void> {
    if (playing) return;

    await Tone.start();

    reverb = new Tone.Reverb({
      decay: 2 + currentParams.reverb * 4,
      wet: currentParams.reverb,
    }).toDestination();

    synth = new Tone.PolySynth(Tone.FMSynth, {
      volume: -12,
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.8 },
    }).connect(reverb);

    Tone.getTransport().bpm.value = currentBpm * currentParams.bpm_multiplier;

    let noteIndex = 0;

    loopEvent = new Tone.Loop((time) => {
      const notes = buildNotePattern(currentParams);
      if (notes.length === 0) return;
      const note = notes[noteIndex % notes.length];
      synth?.triggerAttackRelease(note, "8n", time);
      noteIndex++;
    }, "4n");

    loopEvent.start(0);
    Tone.getTransport().start();
    playing = true;
  }

  function stop(): void {
    if (!playing) return;
    Tone.getTransport().stop();
    loopEvent?.stop();
    loopEvent?.dispose();
    synth?.dispose();
    reverb?.dispose();
    loopEvent = null;
    synth = null;
    reverb = null;
    playing = false;
  }

  function setPhase(phase: ExercisePhase): void {
    currentParams = { ...PHASE_PARAMS[phase] };
    if (playing) {
      Tone.getTransport().bpm.value = currentBpm * currentParams.bpm_multiplier;
      if (reverb) {
        reverb.wet.value = currentParams.reverb;
      }
    }
  }

  function setBpm(bpm: number): void {
    currentBpm = bpm;
    if (playing) {
      Tone.getTransport().bpm.value = currentBpm * currentParams.bpm_multiplier;
    }
  }

  function setParams(params: Partial<MusicParams>): void {
    currentParams = { ...currentParams, ...params };
    if (playing) {
      Tone.getTransport().bpm.value = currentBpm * currentParams.bpm_multiplier;
    }
  }

  return { start, stop, setPhase, setBpm, setParams, isPlaying: () => playing };
}
