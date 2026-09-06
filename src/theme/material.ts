// ============================================================
// Palettes tonales Material-3 "inspirées" (HCT-lite)
// Génère un jeu de rôles light/dark à partir d'une couleur d'accent.
// Identité « Le Grand Livre » : l'encre et la règle.
// ============================================================

import type { ColorPalette } from './colors';

// --- Helpers couleur (hex / rgb / hsl) ---

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return [(rgb[0] + m) * 255, (rgb[1] + m) * 255, (rgb[2] + m) * 255];
}

/** Modifie la luminosité (0-1) en préservant teinte et saturation. */
export function adjustLightness(hex: string, targetL: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s] = rgbToHsl(r, g, b);
  return rgbToHex(hslToRgb(h, s, Math.max(0, Math.min(1, targetL))));
}

/** Rotation de teinte (~120°) pour une couleur secondaire complémentaire. */
export function shiftHue(hex: string, degrees = 120): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return rgbToHex(hslToRgb(h + degrees, s, l));
}

/** Mélange linéaire de deux couleurs hex (t dans [0,1] : part de `b`). */
export function blendHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex([
    ar + (br - ar) * t,
    ag + (bg - ag) * t,
    ab + (bb - ab) * t,
  ]);
}

/** Couleur d'encre pour le dégradé signature : le seed fondu dans l'encre du livre. */
export function inkGradientEnd(seed: string, isDark: boolean): string {
  return blendHex(seed, isDark ? '#486560' : '#18352F', isDark ? 0.55 : 0.62);
}

// --- Accents prédéfinis ---

export interface AccentPreset {
  id: string;
  name: string;
  seed: string;   // primaire (mode clair)
  seed2: string;  // secondaire
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'palmier', name: 'Encre & Safran', seed: '#0E5A4C', seed2: '#946000' },
  { id: 'safran', name: 'Safran', seed: '#946000', seed2: '#0E5A4C' },
  { id: 'zellige', name: 'Zellige', seed: '#1E4E9B', seed2: '#0E5A4C' },
  { id: 'grenade', name: 'Grenade', seed: '#A22B23', seed2: '#0E5A4C' },
  { id: 'argan', name: 'Argan', seed: '#7A4A12', seed2: '#0E5A4C' },
  { id: 'améthyste', name: 'Améthyste', seed: '#5A3E9E', seed2: '#0E5A4C' },
];

export const DEFAULT_ACCENT = 'palmier';

export function getAccentPreset(id: string): AccentPreset {
  return ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0];
}

// --- Rôles Material ---

export interface MaterialRoles {
  primary: string;
  onPrimary: string;
  primaryLight: string;
  primaryDark: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryLight: string;
  secondaryDark: string;
  secondaryContainer: string;
  tertiary: string;
  surface: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  error: string;
  onError: string;
  errorContainer: string;
  success: string;
  successContainer: string;
  warning: string;
  warningContainer: string;
}

/**
 * Génère le jeu de rôles Material-3 inspiré d'une couleur d'accent.
 * `secondarySeed` est optionnel (par défaut : rotation de teinte du seed).
 */
export function generateMaterialRoles(seed: string, isDark: boolean, secondarySeed?: string): MaterialRoles {
  const s2 = secondarySeed ?? shiftHue(seed, 120);

  const primary = isDark ? adjustLightness(seed, 0.72) : seed;
  const primaryLight = adjustLightness(seed, isDark ? 0.85 : 0.82);
  const primaryDark = adjustLightness(seed, isDark ? 0.55 : 0.30);
  const primaryContainer = adjustLightness(seed, isDark ? 0.30 : 0.90);
  const onPrimaryContainer = adjustLightness(seed, isDark ? 0.90 : 0.12);

  const secondary = isDark ? adjustLightness(s2, 0.72) : s2;
  const secondaryLight = adjustLightness(s2, isDark ? 0.85 : 0.78);
  const secondaryDark = adjustLightness(s2, isDark ? 0.55 : 0.30);
  const secondaryContainer = adjustLightness(s2, isDark ? 0.30 : 0.92);

  // Neutres fixes, froids : la feuille et le bureau du grand livre.
  // Jamais de crème ni de beige : la feuille est un blanc bleuté-vert.
  const neutrals = isDark
    ? {
        surface: '#151B19',
        surfaceContainerLowest: '#0F1412',
        surfaceContainerLow: '#1A211F',
        surfaceContainer: '#202725',
        surfaceContainerHigh: '#262E2B',
        surfaceContainerHighest: '#2C3532',
        onSurface: '#E6EAE8',
        onSurfaceVariant: '#B7C2BD',
        outline: '#8A9891',
        outlineVariant: '#3A4541',
      }
    : {
        surface: '#FBFCFC',
        surfaceContainerLowest: '#FFFFFF',
        surfaceContainerLow: '#F3F6F5',
        surfaceContainer: '#EEF1F0',
        surfaceContainerHigh: '#E8ECEB',
        surfaceContainerHighest: '#E2E7E5',
        onSurface: '#17211D',
        onSurfaceVariant: '#4A5650',
        outline: '#6B7871',
        outlineVariant: '#C8D0CC',
      };

  return {
    primary,
    onPrimary: isDark ? adjustLightness(seed, 0.14) : '#FFFFFF',
    primaryLight,
    primaryDark,
    primaryContainer,
    onPrimaryContainer,
    secondary,
    onSecondary: isDark ? adjustLightness(s2, 0.14) : '#FFFFFF',
    secondaryLight,
    secondaryDark,
    secondaryContainer,
    tertiary: secondary,
    ...neutrals,
    error: isDark ? '#FFB4AB' : '#BA1A1A',
    onError: isDark ? '#690005' : '#FFFFFF',
    errorContainer: isDark ? '#93000A' : '#F6DAD5',
    success: isDark ? '#54D6A8' : seed,
    successContainer: isDark ? '#123229' : '#D8EAE3',
    warning: isDark ? '#FFC97A' : '#7A4A12',
    warningContainer: isDark ? '#33240A' : '#F5E2C8',
  };
}

// --- Cartographie rôles → palette ColorPalette ---

export function rolesToPaletteOverrides(roles: MaterialRoles, isDark: boolean): Partial<ColorPalette> {
  return {
    primary: roles.primary,
    onPrimary: roles.onPrimary,
    primaryLight: roles.primaryLight,
    primaryDark: roles.primaryDark,
    primaryContainer: roles.primaryContainer,
    onPrimaryContainer: roles.onPrimaryContainer,
    secondary: roles.secondary,
    secondaryLight: roles.secondaryLight,
    secondaryDark: roles.secondaryDark,
    surface: roles.surface,
    surfaceContainerLowest: roles.surfaceContainerLowest,
    surfaceContainerLow: roles.surfaceContainerLow,
    surfaceContainer: roles.surfaceContainer,
    surfaceContainerHigh: roles.surfaceContainerHigh,
    surfaceContainerHighest: roles.surfaceContainerHighest,
    text: roles.onSurface,
    textSecondary: roles.onSurfaceVariant,
    textTertiary: roles.outline,
    border: roles.outlineVariant,
    outline: roles.outline,
    outlineVariant: roles.outlineVariant,
    error: roles.error,
    success: roles.success,
    warning: roles.warning,
    // Dégradé signature : la graine vers l'encre du livre (plus jamais émeraude → indigo)
    gradientStart: roles.primary,
    gradientEnd: inkGradientEnd(roles.primary, isDark),
    elevation1: roles.surfaceContainerLow,
    elevation2: roles.surfaceContainer,
    tabBar: roles.surface,
    tabBarBorder: roles.outlineVariant,
  };
}

// --- Modes spéciaux ---

/** Renforce les contrastes texte / bordures (mode haute lisibilité). */
export function highContrastOverrides(isDark: boolean): Partial<ColorPalette> {
  return isDark
    ? {
        text: '#FFFFFF',
        textSecondary: '#E4E8E6',
        textTertiary: '#C2C9C5',
        border: '#9AA29D',
        outline: '#C4CAC7',
        outlineVariant: '#9AA29D',
        surface: '#0B0D0C',
        background: '#0B0D0C',
        error: '#FF6B5E',
        success: '#5CF2AE',
        warning: '#FFC069',
      }
    : {
        text: '#000000',
        textSecondary: '#202822',
        textTertiary: '#354039',
        border: '#4A554F',
        outline: '#2E3732',
        outlineVariant: '#4A554F',
        surface: '#FFFFFF',
        background: '#FFFFFF',
        error: '#C00000',
        success: '#0B4A3E',
        warning: '#5F3A0E',
      };
}

/** Aplatit dégradés et ombres quand l'économiseur de batterie est actif. */
export function batterySaverOverrides(isDark: boolean): Partial<ColorPalette> {
  const solid = isDark ? '#54D6A8' : '#0E5A4C';
  return {
    cardShadow: 'rgba(0,0,0,0)',
    gradientStart: solid,
    gradientEnd: solid,
    greenAccent: solid,
  };
}
