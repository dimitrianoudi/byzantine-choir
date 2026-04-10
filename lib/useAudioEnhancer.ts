'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AUDIO_ENHANCER_STORAGE_KEY,
  DEFAULT_AUDIO_ENHANCER_STATE,
  clampEqGain,
  clampPercent,
  getAudioEnhancerPreset,
  normalizeAudioEnhancerState,
  type AudioEnhancerPresetId,
  type AudioEnhancerSettings,
  type AudioEnhancerState,
} from '@/lib/audioEnhancer';

type AudioContextCtor = typeof AudioContext;
type WebAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: AudioContextCtor;
  };

type EnhancerNodes = {
  source: MediaElementAudioSourceNode;
  cleanGain: GainNode;
  inputTrim: GainNode;
  highPass: BiquadFilterNode;
  bass: BiquadFilterNode;
  voiceFocus: BiquadFilterNode;
  treble: BiquadFilterNode;
  lowPass: BiquadFilterNode;
  notch: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  output: GainNode;
  wetGain: GainNode;
};

export type UseAudioEnhancerResult = {
  supported: boolean;
  open: boolean;
  enabled: boolean;
  presetId: AudioEnhancerPresetId;
  settings: AudioEnhancerSettings;
  error: string | null;
  ensureReady: () => Promise<boolean>;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEnabled: (value: boolean) => void;
  applyPreset: (presetId: Exclude<AudioEnhancerPresetId, 'custom'>) => void;
  updateSetting: (key: keyof AudioEnhancerSettings, value: number) => void;
  reset: () => void;
};

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null;
  const audioWindow = window as WebAudioWindow;
  return audioWindow.AudioContext || audioWindow.webkitAudioContext || null;
}

function setNodeValue(param: AudioParam, value: number, now: number) {
  param.cancelScheduledValues(now);
  param.setTargetAtTime(value, now, 0.015);
}

export function useAudioEnhancer(
  audioRef: React.RefObject<HTMLAudioElement | null>
): UseAudioEnhancerResult {
  const [state, setState] = useState<AudioEnhancerState>(DEFAULT_AUDIO_ENHANCER_STATE);
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef(state);
  const contextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<EnhancerNodes | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const applyStateToGraph = useCallback((nextState: AudioEnhancerState) => {
    const context = contextRef.current;
    const nodes = nodesRef.current;
    if (!context || !nodes) return;

    const now = context.currentTime;
    const { bass, treble, voiceFocus, noiseReduction, loudness } = nextState.settings;
    const enabled = nextState.enabled;

    setNodeValue(nodes.cleanGain.gain, enabled ? 0 : 1, now);
    setNodeValue(nodes.wetGain.gain, enabled ? 1 : 0, now);

    setNodeValue(nodes.inputTrim.gain, 0.98, now);
    setNodeValue(nodes.highPass.frequency, enabled ? 24 + noiseReduction * 0.76 : 20, now);
    setNodeValue(nodes.bass.gain, enabled ? bass : 0, now);
    setNodeValue(nodes.voiceFocus.gain, enabled ? voiceFocus : 0, now);
    setNodeValue(nodes.treble.gain, enabled ? treble : 0, now);
    setNodeValue(nodes.lowPass.frequency, enabled ? 19000 - noiseReduction * 105 : 22050, now);
    setNodeValue(nodes.output.gain, enabled ? 1 + loudness * 0.006 : 1, now);
    setNodeValue(nodes.compressor.threshold, enabled ? -24 - loudness * 0.08 : 0, now);
    setNodeValue(nodes.compressor.knee, enabled ? 18 : 0, now);
    setNodeValue(nodes.compressor.ratio, enabled ? 1.8 + loudness * 0.04 : 1, now);
    setNodeValue(nodes.compressor.attack, 0.003, now);
    setNodeValue(nodes.compressor.release, 0.2, now);
  }, []);

  const ensureReady = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;

    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) {
      setSupported(false);
      setError('Ο browser δεν υποστηρίζει audio equalizer.');
      return false;
    }

    try {
      if (!nodesRef.current) {
        const context = new AudioContextCtor();
        const source = context.createMediaElementSource(audio);
        const cleanGain = context.createGain();
        const inputTrim = context.createGain();
        const highPass = context.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 20;

        const bass = context.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 140;

        const voiceFocus = context.createBiquadFilter();
        voiceFocus.type = 'peaking';
        voiceFocus.frequency.value = 2400;
        voiceFocus.Q.value = 1.15;

        const treble = context.createBiquadFilter();
        treble.type = 'highshelf';
        treble.frequency.value = 4700;

        const lowPass = context.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 22050;

        const notch = context.createBiquadFilter();
        notch.type = 'notch';
        notch.frequency.value = 50;
        notch.Q.value = 8;

        const compressor = context.createDynamicsCompressor();
        const output = context.createGain();
        const wetGain = context.createGain();

        source.connect(cleanGain);
        cleanGain.connect(context.destination);

        source.connect(inputTrim);
        inputTrim.connect(highPass);
        highPass.connect(bass);
        bass.connect(voiceFocus);
        voiceFocus.connect(treble);
        treble.connect(lowPass);
        lowPass.connect(notch);
        notch.connect(compressor);
        compressor.connect(output);
        output.connect(wetGain);
        wetGain.connect(context.destination);

        contextRef.current = context;
        nodesRef.current = {
          source,
          cleanGain,
          inputTrim,
          highPass,
          bass,
          voiceFocus,
          treble,
          lowPass,
          notch,
          compressor,
          output,
          wetGain,
        };
        applyStateToGraph(stateRef.current);
      }

      if (contextRef.current?.state === 'suspended') {
        await contextRef.current.resume();
      }

      setSupported(true);
      setError(null);
      applyStateToGraph(stateRef.current);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Αδυναμία ενεργοποίησης του equalizer.');
      return false;
    }
  }, [applyStateToGraph, audioRef]);

  useEffect(() => {
    setSupported(!!getAudioContextCtor());
    try {
      const raw = window.localStorage.getItem(AUDIO_ENHANCER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AudioEnhancerState>;
        setState(normalizeAudioEnhancerState(parsed));
      }
    } catch {
      // Ignore invalid saved EQ settings and fall back to defaults.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(AUDIO_ENHANCER_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore persistence failures.
    }
  }, [hydrated, state]);

  useEffect(() => {
    applyStateToGraph(state);
  }, [applyStateToGraph, state]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      if (stateRef.current.enabled) {
        void ensureReady();
      }
    };

    audio.addEventListener('play', onPlay);
    return () => audio.removeEventListener('play', onPlay);
  }, [audioRef, ensureReady]);

  useEffect(() => {
    if (!state.enabled) return;
    void ensureReady();
  }, [ensureReady, state.enabled]);

  useEffect(() => {
    return () => {
      try {
        nodesRef.current?.source.disconnect();
      } catch {}
      try {
        nodesRef.current?.cleanGain.disconnect();
      } catch {}
      try {
        nodesRef.current?.inputTrim.disconnect();
      } catch {}
      try {
        nodesRef.current?.highPass.disconnect();
      } catch {}
      try {
        nodesRef.current?.bass.disconnect();
      } catch {}
      try {
        nodesRef.current?.voiceFocus.disconnect();
      } catch {}
      try {
        nodesRef.current?.treble.disconnect();
      } catch {}
      try {
        nodesRef.current?.lowPass.disconnect();
      } catch {}
      try {
        nodesRef.current?.notch.disconnect();
      } catch {}
      try {
        nodesRef.current?.compressor.disconnect();
      } catch {}
      try {
        nodesRef.current?.output.disconnect();
      } catch {}
      try {
        nodesRef.current?.wetGain.disconnect();
      } catch {}

      const context = contextRef.current;
      nodesRef.current = null;
      contextRef.current = null;
      if (context) {
        void context.close().catch(() => {});
      }
    };
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, enabled: value }));
    if (value) {
      void ensureReady();
    }
  }, [ensureReady]);

  const applyPreset = useCallback((presetId: Exclude<AudioEnhancerPresetId, 'custom'>) => {
    const preset = getAudioEnhancerPreset(presetId);
    setState({
      enabled: presetId !== 'flat',
      presetId,
      settings: preset.settings,
    });
    if (presetId !== 'flat') {
      void ensureReady();
    }
  }, [ensureReady]);

  const updateSetting = useCallback((key: keyof AudioEnhancerSettings, value: number) => {
    setState((prev) => ({
      enabled: true,
      presetId: 'custom',
      settings: {
        ...prev.settings,
        [key]:
          key === 'noiseReduction' || key === 'loudness'
            ? clampPercent(value)
            : clampEqGain(value),
      },
    }));
    void ensureReady();
  }, [ensureReady]);

  const reset = useCallback(() => {
    setState(DEFAULT_AUDIO_ENHANCER_STATE);
  }, []);

  return {
    supported,
    open,
    enabled: state.enabled,
    presetId: state.presetId,
    settings: state.settings,
    error,
    ensureReady,
    setOpen,
    setEnabled,
    applyPreset,
    updateSetting,
    reset,
  };
}
