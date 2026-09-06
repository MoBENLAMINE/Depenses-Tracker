// ============================================================
// Contexte de thème (mode, accent Material-3, contraste, batterie)
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useLowPowerMode } from 'expo-battery';
import { getTheme, type Theme, type ColorPalette } from '../theme';
import { useDatabase } from './DatabaseContext';
import { SettingsRepository } from '../database/settings';
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  getAccentPreset,
  generateMaterialRoles,
  rolesToPaletteOverrides,
  highContrastOverrides,
  batterySaverOverrides,
} from '../theme/material';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentMode = 'preset' | 'custom' | 'image';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  accentId: string;
  accentMode: AccentMode;
  customAccent: string;
  imageAccent: string | null;
  highContrast: boolean;
  batterySaver: boolean;
  setAccentId: (id: string) => void;
  setAccentMode: (mode: AccentMode) => void;
  setCustomAccent: (hex: string) => void;
  setImageAccent: (hex: string | null) => void;
  setHighContrast: (enabled: boolean) => void;
  setBatterySaver: (enabled: boolean) => void;
  brandColor: string;
  setBrandColor: (hex: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: getTheme(false),
  mode: 'system',
  isDark: false,
  setMode: () => {},
  toggleTheme: () => {},
  accentId: DEFAULT_ACCENT,
  accentMode: 'preset',
  customAccent: '#006C49',
  imageAccent: null,
  highContrast: false,
  batterySaver: false,
  setAccentId: () => {},
  setAccentMode: () => {},
  setCustomAccent: () => {},
  setImageAccent: () => {},
  setHighContrast: () => {},
  setBatterySaver: () => {},
  brandColor: '#006C49',
  setBrandColor: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { db } = useDatabase();

  const [mode, setModeState] = useState<ThemeMode>('system');
  const [accentId, setAccentIdState] = useState<string>(DEFAULT_ACCENT);
  const [accentMode, setAccentModeState] = useState<AccentMode>('preset');
  const [customAccent, setCustomAccentState] = useState('#0E5A4C');
  const [imageAccent, setImageAccentState] = useState<string | null>(null);
  const [highContrast, setHighContrastState] = useState(false);
  const [batterySaverManual, setBatterySaverState] = useState(false);
  const [brandColor, setBrandColorState] = useState('#006C49');

  // Auto-détection du mode basse consommation du système (OR avec le réglage manuel)
  const systemLowPower = useLowPowerMode();
  const batterySaver = batterySaverManual || systemLowPower;

  const settings = useMemo(
    () => (db ? new SettingsRepository(db) : null),
    [db]
  );

  // Charger les préférences persistées dès que la DB est prête
  useEffect(() => {
    if (!settings) return;
    let mounted = true;
    (async () => {
      const [m, a, am, ca, ia, hc, bs, bc] = await Promise.all([
        settings.getString('theme_mode'),
        settings.getString('theme_accent'),
        settings.getString('theme_accent_mode'),
        settings.getString('theme_custom_accent'),
        settings.getString('theme_image_accent'),
        settings.getBoolean('theme_high_contrast', false),
        settings.getBoolean('theme_battery_saver', false),
        settings.getString('theme_brand_color'),
      ]);
      if (!mounted) return;
      if (m === 'light' || m === 'dark' || m === 'system') setModeState(m);
      if (a) setAccentIdState(a);
      if (am === 'preset' || am === 'custom' || am === 'image') setAccentModeState(am);
      if (ca) setCustomAccentState(ca);
      setImageAccentState(ia);
      setHighContrastState(hc);
      setBatterySaverState(bs);
      if (bc) setBrandColorState(bc);
    })().catch((err) => console.warn('Failed to load theme prefs:', err));
    return () => { mounted = false; };
  }, [settings]);

  // Persistance + état
  const persist = useCallback((key: string, value: string) => {
    settings?.setString(key, value).catch(() => {});
  }, [settings]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    persist('theme_mode', next);
  }, [persist]);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'system' ? 'dark' : prev === 'dark' ? 'light' : 'system';
      persist('theme_mode', next);
      return next;
    });
  }, [persist]);

  const setAccentId = useCallback((id: string) => {
    setAccentIdState(id);
    persist('theme_accent', id);
  }, [persist]);

  const setAccentMode = useCallback((am: AccentMode) => {
    setAccentModeState(am);
    persist('theme_accent_mode', am);
  }, [persist]);

  const setCustomAccent = useCallback((hex: string) => {
    setCustomAccentState(hex);
    persist('theme_custom_accent', hex);
  }, [persist]);

  const setImageAccent = useCallback((hex: string | null) => {
    setImageAccentState(hex);
    if (hex) persist('theme_image_accent', hex);
  }, [persist]);

  const setHighContrast = useCallback((enabled: boolean) => {
    setHighContrastState(enabled);
    persist('theme_high_contrast', enabled ? '1' : '0');
  }, [persist]);

  const setBatterySaver = useCallback((enabled: boolean) => {
    setBatterySaverState(enabled);
    persist('theme_battery_saver', enabled ? '1' : '0');
  }, [persist]);

  const setBrandColor = useCallback((hex: string) => {
    setBrandColorState(hex);
    persist('theme_brand_color', hex);
  }, [persist]);

  const isDark = mode === 'system'
    ? systemColorScheme === 'dark'
    : mode === 'dark';

  // Composition de la palette : accent → contraste → économiseur de batterie
  const theme = useMemo<Theme>(() => {
    let overrides: Partial<ColorPalette> = {};

    if (accentMode === 'preset') {
      const preset = getAccentPreset(accentId);
      overrides = rolesToPaletteOverrides(
        generateMaterialRoles(preset.seed, isDark, preset.seed2),
        isDark
      );
    } else if (accentMode === 'custom') {
      overrides = rolesToPaletteOverrides(
        generateMaterialRoles(customAccent, isDark),
        isDark
      );
    } else if (accentMode === 'image') {
      // Mode "image" : couleur extraite d'une photo/fond d'écran (stockée).
      const seed = imageAccent || customAccent || getAccentPreset(DEFAULT_ACCENT).seed;
      overrides = rolesToPaletteOverrides(
        generateMaterialRoles(seed, isDark),
        isDark
      );
    }

    if (highContrast) {
      overrides = { ...overrides, ...highContrastOverrides(isDark) };
    }
    if (batterySaver) {
      overrides = { ...overrides, ...batterySaverOverrides(isDark) };
    }

    return getTheme(isDark, overrides);
  }, [isDark, accentId, accentMode, customAccent, imageAccent, highContrast, batterySaver]);

  const value: ThemeContextValue = {
    theme,
    mode,
    isDark,
    setMode,
    toggleTheme,
    accentId,
    accentMode,
    customAccent,
    imageAccent,
    highContrast,
    batterySaver,
    setAccentId,
    setAccentMode,
    setCustomAccent,
    setImageAccent,
    setHighContrast,
    setBatterySaver,
    brandColor,
    setBrandColor,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}

// Ré-exporté pour les écrans de personnalisation du thème
export { ACCENT_PRESETS };
