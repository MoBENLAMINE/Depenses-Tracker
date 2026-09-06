// ============================================================
// Système typographique étendu — délègue à la table unique
// src/theme/typography.ts
// ============================================================

import { Text, type TextProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typeRoles, type TypeRole, resolveTypography } from '../../theme/typography';

export type TypographyVariant =
  | 'display'
  | 'h1' | 'h2' | 'h3' | 'h4'
  | 'body' | 'bodySmall' | 'caption'
  | 'overline'
  | 'label' | 'dense'
  | 'numeric' | 'numericDisplay' | 'numericSmall'
  | 'mono';

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  tone?: 'positive' | 'negative' | 'default';
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function Typography({
  variant = 'body',
  tone,
  color,
  align,
  style,
  children,
  ...props
}: TypographyProps) {
  const { theme } = useTheme();

  const resolved = resolveTypography(theme, variant, tone);
  const finalColor = color || resolved.color;

  const textStyle = {
    fontFamily: resolved.fontFamily,
    fontSize: resolved.fontSize,
    fontWeight: resolved.fontWeight,
    lineHeight: resolved.lineHeight,
    letterSpacing: resolved.letterSpacing,
    fontVariant: resolved.fontVariant,
    textTransform: resolved.textTransform,
    color: finalColor,
    textAlign: align || 'left',
  };

  return (
    <Text style={[textStyle, style]} {...props}>
      {children}
    </Text>
  );
}