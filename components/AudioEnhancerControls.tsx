'use client';

import clsx from 'clsx';
import {
  AUDIO_ENHANCER_PRESETS,
  type AudioEnhancerPresetId,
  type AudioEnhancerSettings,
} from '@/lib/audioEnhancer';

type Props = {
  supported: boolean;
  open: boolean;
  enabled: boolean;
  presetId: AudioEnhancerPresetId;
  settings: AudioEnhancerSettings;
  error: string | null;
  onToggleOpen: () => void;
  onToggleEnabled: () => void;
  onApplyPreset: (presetId: Exclude<AudioEnhancerPresetId, 'custom'>) => void;
  onUpdateSetting: (key: keyof AudioEnhancerSettings, value: number) => void;
  onReset: () => void;
};

const SLIDERS: Array<{
  key: keyof AudioEnhancerSettings;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: 'bass', label: 'Bass', min: -12, max: 12, step: 1 },
  { key: 'treble', label: 'Treble', min: -12, max: 12, step: 1 },
  { key: 'voiceFocus', label: 'Voice', min: -12, max: 12, step: 1 },
  { key: 'noiseReduction', label: 'Noise', min: 0, max: 100, step: 1 },
  { key: 'loudness', label: 'Loudness', min: 0, max: 100, step: 1 },
];

function formatValue(key: keyof AudioEnhancerSettings, value: number) {
  if (key === 'noiseReduction' || key === 'loudness') return `${Math.round(value)}%`;
  return `${value > 0 ? '+' : ''}${Math.round(value)} dB`;
}

export default function AudioEnhancerControls({
  supported,
  open,
  enabled,
  presetId,
  settings,
  error,
  onToggleOpen,
  onToggleEnabled,
  onApplyPreset,
  onUpdateSetting,
  onReset,
}: Props) {
  return (
    <div className="audio-enhancer">
      <div className="audio-enhancer-bar">
        <button
          type="button"
          className={clsx('btn btn-sm btn-outline', open && 'btn--selected')}
          onClick={onToggleOpen}
          disabled={!supported}
          title={supported ? 'Άνοιγμα equalizer' : 'Ο browser δεν υποστηρίζει equalizer'}
        >
          EQ
        </button>
        {enabled && <span className="audio-enhancer-status">Enhancer on</span>}
      </div>

      {open && (
        <div className="audio-enhancer-panel">
          <div className="audio-enhancer-head">
            <div className="min-w-0">
              <div className="audio-enhancer-title">Equalizer</div>
              <div className="text-xs text-muted">
              Η μείωση θορύβου βελτιώνει αισθητά τις ομιλίες και τα podcasts.
              </div>
            </div>

            <label className="audio-enhancer-toggle">
              <input type="checkbox" checked={enabled} onChange={onToggleEnabled} />
              <span>{enabled ? 'Ενεργό' : 'Ανενεργό'}</span>
            </label>
          </div>

          <div className="audio-enhancer-presets">
            {AUDIO_ENHANCER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={clsx(
                  'btn btn-sm',
                  presetId === preset.id ? 'btn-gold' : 'btn-outline'
                )}
                onClick={() => onApplyPreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="audio-enhancer-grid">
            {SLIDERS.map((slider) => (
              <label key={slider.key} className="audio-enhancer-slider">
                <div className="audio-enhancer-slider-head">
                  <span>{slider.label}</span>
                  <span className="text-muted">{formatValue(slider.key, settings[slider.key])}</span>
                </div>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={settings[slider.key]}
                  onChange={(e) => onUpdateSetting(slider.key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>

          {error && <div className="text-xs text-red">{error}</div>}

          <div className="audio-enhancer-foot">
            <button type="button" className="btn btn-sm btn-outline" onClick={onReset}>
              Reset
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .audio-enhancer {
          margin-top: 12px;
        }

        .audio-enhancer-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .audio-enhancer-status {
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.12);
          color: #166534;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
        }

        .audio-enhancer-panel {
          margin-top: 10px;
          border: 1px solid rgba(49, 91, 153, 0.14);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.9);
          padding: 12px;
          display: grid;
          gap: 12px;
        }

        .audio-enhancer-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .audio-enhancer-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--blue);
        }

        .audio-enhancer-toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--muted);
          white-space: nowrap;
        }

        .audio-enhancer-presets {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .audio-enhancer-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 12px;
        }

        .audio-enhancer-slider {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .audio-enhancer-slider-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
        }

        .audio-enhancer-slider input[type='range'] {
          width: 100%;
          accent-color: var(--gold);
        }

        .audio-enhancer-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .audio-enhancer-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
