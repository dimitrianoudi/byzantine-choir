export type AudioEnhancerPresetId = "flat" | "voice" | "warm" | "broadcast" | "custom";

export type AudioEnhancerSettings = {
  bass: number;
  treble: number;
  voiceFocus: number;
  noiseReduction: number;
  loudness: number;
};

export type AudioEnhancerState = {
  enabled: boolean;
  presetId: AudioEnhancerPresetId;
  settings: AudioEnhancerSettings;
};

export const AUDIO_ENHANCER_STORAGE_KEY = "bcp:audio-enhancer:v1";

export const AUDIO_ENHANCER_PRESETS: Array<{
  id: Exclude<AudioEnhancerPresetId, "custom">;
  label: string;
  settings: AudioEnhancerSettings;
}> = [
  {
    id: "flat",
    label: "Flat",
    settings: {
      bass: 0,
      treble: 0,
      voiceFocus: 0,
      noiseReduction: 0,
      loudness: 0,
    },
  },
  {
    id: "voice",
    label: "Voice",
    settings: {
      bass: -2,
      treble: 3,
      voiceFocus: 6,
      noiseReduction: 24,
      loudness: 24,
    },
  },
  {
    id: "warm",
    label: "Warm",
    settings: {
      bass: 4,
      treble: -1,
      voiceFocus: 2,
      noiseReduction: 10,
      loudness: 18,
    },
  },
  {
    id: "broadcast",
    label: "Broadcast",
    settings: {
      bass: -1,
      treble: 4,
      voiceFocus: 8,
      noiseReduction: 34,
      loudness: 30,
    },
  },
];

export const DEFAULT_AUDIO_ENHANCER_STATE: AudioEnhancerState = {
  enabled: false,
  presetId: "flat",
  settings: AUDIO_ENHANCER_PRESETS[0].settings,
};

export function clampEqGain(value: number) {
  return Math.max(-12, Math.min(12, Number(value) || 0));
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

export function normalizeAudioEnhancerSettings(
  raw?: Partial<AudioEnhancerSettings> | null
): AudioEnhancerSettings {
  return {
    bass: clampEqGain(raw?.bass ?? 0),
    treble: clampEqGain(raw?.treble ?? 0),
    voiceFocus: clampEqGain(raw?.voiceFocus ?? 0),
    noiseReduction: clampPercent(raw?.noiseReduction ?? 0),
    loudness: clampPercent(raw?.loudness ?? 0),
  };
}

export function normalizeAudioEnhancerState(
  raw?: Partial<AudioEnhancerState> | null
): AudioEnhancerState {
  const presetId =
    raw?.presetId === "voice" ||
    raw?.presetId === "warm" ||
    raw?.presetId === "broadcast" ||
    raw?.presetId === "custom"
      ? raw.presetId
      : "flat";

  return {
    enabled: !!raw?.enabled,
    presetId,
    settings: normalizeAudioEnhancerSettings(raw?.settings),
  };
}

export function getAudioEnhancerPreset(id: Exclude<AudioEnhancerPresetId, "custom">) {
  return AUDIO_ENHANCER_PRESETS.find((preset) => preset.id === id) || AUDIO_ENHANCER_PRESETS[0];
}
