// ============================================================
// Texte thématisé — source unique : src/theme/typography.ts
// ============================================================

import { Text, type TextProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typeRoles, type TypeRole, resolveTypography } from '../../theme/typography';

export type ThemedTextVariant =
  | 'display'
  | 'h1' | 'h2' | 'h3' | 'h4'
  | 'body' | 'bodySmall' | 'caption'
  | 'overline'
  | 'label' | 'dense'
  | 'numeric' | 'numericDisplay' | 'numericSmall'
  | 'mono';

interface ThemedTextProps extends TextProps {
  variant?: ThemedTextVariant;
  tone?: 'positive' | 'negative' | 'default';
  color?: string;
}

export function ThemedText({
  children,
  variant = 'body',
  tone,
  color,
  style,
  ...props
}: ThemedTextProps) {
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
  };

  return (
    <Text style={[textStyle, style]} {...props}>
      {children}
    </Text>
  );
}