export type AccessibilitySettings = {
  reducedMotion?: boolean;
  reducedSound?: boolean;
};

export type UserSettings = {
  theme?: string;
  language?: string;
  sfxEnabled?: boolean;
  bgmEnabled?: boolean;
  accessibility?: AccessibilitySettings;
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: "light",
  language: "th",
  sfxEnabled: true,
  bgmEnabled: true,
  accessibility: {
    reducedMotion: false,
    reducedSound: false,
  },
};

export function parseUserSettings(settings: unknown): UserSettings {
  if (!settings || typeof settings !== "object") {
    return DEFAULT_USER_SETTINGS;
  }

  const value = settings as UserSettings;

  return {
    ...DEFAULT_USER_SETTINGS,
    ...value,
    accessibility: {
      ...DEFAULT_USER_SETTINGS.accessibility,
      ...(value.accessibility ?? {}),
    },
  };
}
