import { lightColors, darkColors, type ColorPalette } from './colors';
import { spacing, borderRadius, fontSize, lineHeight } from './spacing';
import { typeRoles, type TypeRole, FONT_FAMILIES, resolveTypography, legacyFontSize } from './typography';

export interface Theme {
  colors: ColorPalette;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  fontSize: typeof fontSize;
  lineHeight: typeof lineHeight;
  isDark: boolean;
  // Nouvelles tables typographiques
  typeRoles: typeof typeRoles;
  FONT_FAMILIES: typeof FONT_FAMILIES;
}

export function getTheme(isDark: boolean, colorOverrides: Partial<ColorPalette> = {}): Theme {
  const base = isDark ? darkColors : lightColors;
  return {
    colors: { ...base, ...colorOverrides },
    spacing,
    borderRadius,
    fontSize,
    lineHeight,
    isDark,
    typeRoles,
    FONT_FAMILIES,
  };
}

export { lightColors, darkColors, spacing, borderRadius, fontSize, lineHeight };
export type { ColorPalette };
export { typeRoles, type TypeRole, FONT_FAMILIES, resolveTypography, legacyFontSize };
