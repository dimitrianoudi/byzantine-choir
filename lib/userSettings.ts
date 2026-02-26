export type MaterialTab = 'podcast' | 'pdf';

export type UserSettings = {
  defaultAutoplay: boolean;
  playbackRate: number;
  defaultMaterialTab: MaterialTab;
  rememberLastFolder: boolean;
};

export const USER_SETTINGS_KEY = 'bcp:user-settings';
export const USER_SETTINGS_EVENT = 'bcp:user-settings-changed';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultAutoplay: false,
  playbackRate: 1,
  defaultMaterialTab: 'podcast',
  rememberLastFolder: true,
};

function normalizePlaybackRate(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_USER_SETTINGS.playbackRate;
  const allowed = [0.8, 1, 1.1, 1.25, 1.5];
  return allowed.includes(n) ? n : DEFAULT_USER_SETTINGS.playbackRate;
}

export function sanitizeUserSettings(input: unknown): UserSettings {
  const raw = (input ?? {}) as Partial<UserSettings>;
  return {
    defaultAutoplay: Boolean(raw.defaultAutoplay),
    playbackRate: normalizePlaybackRate(raw.playbackRate),
    defaultMaterialTab: raw.defaultMaterialTab === 'pdf' ? 'pdf' : 'podcast',
    rememberLastFolder:
      typeof raw.rememberLastFolder === 'boolean'
        ? raw.rememberLastFolder
        : DEFAULT_USER_SETTINGS.rememberLastFolder,
  };
}

export function getUserSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_USER_SETTINGS;
  try {
    const raw = window.localStorage.getItem(USER_SETTINGS_KEY);
    if (!raw) return DEFAULT_USER_SETTINGS;
    return { ...DEFAULT_USER_SETTINGS, ...sanitizeUserSettings(JSON.parse(raw)) };
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveUserSettings(next: UserSettings) {
  if (typeof window === 'undefined') return;
  const safe = sanitizeUserSettings(next);
  window.localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(safe));
  window.dispatchEvent(new CustomEvent(USER_SETTINGS_EVENT, { detail: safe }));
}
