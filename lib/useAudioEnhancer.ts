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
  humCut50: BiquadFilterNode;
  humCut100: BiquadFilterNode;
  bass: BiquadFilterNode;
  voiceFocus: BiquadFilterNode;
  treble: BiquadFilterNode;
  deHiss: BiquadFilterNode;
  lowPass: BiquadFilterNode;
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
    const noiseMix = enabled ? noiseReduction / 100 : 0;

    setNodeValue(nodes.cleanGain.gain, enabled ? 0 : 1, now);
    setNodeValue(nodes.wetGain.gain, enabled ? 1 : 0, now);

    setNodeValue(nodes.inputTrim.gain, enabled ? 0.98 - noiseMix * 0.05 : 0.98, now);
    setNodeValue(nodes.highPass.frequency, enabled ? 28 + noiseMix * 122 : 20, now);
    setNodeValue(nodes.humCut50.gain, enabled ? -noiseMix * 18 : 0, now);
    setNodeValue(nodes.humCut100.gain, enabled ? -noiseMix * 12 : 0, now);
    setNodeValue(nodes.bass.gain, enabled ? bass : 0, now);
    setNodeValue(nodes.voiceFocus.gain, enabled ? voiceFocus + noiseMix * 2 : 0, now);
    setNodeValue(nodes.treble.gain, enabled ? treble : 0, now);
    setNodeValue(nodes.deHiss.gain, enabled ? -noiseMix * 18 : 0, now);
    setNodeValue(nodes.lowPass.frequency, enabled ? 18500 - noiseMix * 12000 : 22050, now);
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

        const humCut50 = context.createBiquadFilter();
        humCut50.type = 'peaking';
        humCut50.frequency.value = 50;
        humCut50.Q.value = 1.2;
        humCut50.gain.value = 0;

        const humCut100 = context.createBiquadFilter();
        humCut100.type = 'peaking';
        humCut100.frequency.value = 100;
        humCut100.Q.value = 1.4;
        humCut100.gain.value = 0;

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

        const deHiss = context.createBiquadFilter();
        deHiss.type = 'highshelf';
        deHiss.frequency.value = 5200;
        deHiss.gain.value = 0;

        const lowPass = context.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 22050;

        const compressor = context.createDynamicsCompressor();
        const output = context.createGain();
        const wetGain = context.createGain();

        source.connect(cleanGain);
        cleanGain.connect(context.destination);

        source.connect(inputTrim);
        inputTrim.connect(highPass);
        highPass.connect(humCut50);
        humCut50.connect(humCut100);
        humCut100.connect(bass);
        bass.connect(voiceFocus);
        voiceFocus.connect(treble);
        treble.connect(deHiss);
        deHiss.connect(lowPass);
        lowPass.connect(compressor);
        compressor.connect(output);
        output.connect(wetGain);
        wetGain.connect(context.destination);

        contextRef.current = context;
        nodesRef.current = {
          source,
          cleanGain,
          inputTrim,
          highPass,
          humCut50,
          humCut100,
          bass,
          voiceFocus,
          treble,
          deHiss,
          lowPass,
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
        nodesRef.current?.humCut50.disconnect();
      } catch {}
      try {
        nodesRef.current?.humCut100.disconnect();
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
        nodesRef.current?.deHiss.disconnect();
      } catch {}
      try {
        nodesRef.current?.lowPass.disconnect();
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
