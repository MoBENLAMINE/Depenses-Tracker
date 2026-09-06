// ============================================================
// Échelle typographique canonique unique — « Le Grand Livre »
// Cette table est LA source de vérité pour ThemedText + Typography.
// Toutes les valeurs codées en dur dans les composants sont remplacées par
// des références à cette table (via le thème).
// ============================================================

import type { FontVariant } from 'react-native';
import type { Theme } from './index';
import { fontSize } from './spacing';

export type TypeRole =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'overline'
  | 'label'
  | 'dense'
  | 'numeric'
  | 'numericDisplay'
  | 'numericSmall'
  | 'mono';

export interface TypeSpec {
  fontFamily: string;
  fontSize: number;
  fontWeight: '300' | '400' | '500' | '600' | '700';
  lineHeight: number;
  letterSpacing: number;
  // Pour les rôles numériques : figures tabulaires
  fontVariant?: FontVariant[];
  // Pour overline : majuscules forcées
  textTransform?: 'uppercase';
}

// Police chargée par `useAppFonts()` dans `app/_layout.tsx`
// Noms RN exacts des familles Google Fonts
export const FONT_FAMILIES = {
  display: 'BricolageGrotesque_700Bold',
  heading: 'BricolageGrotesque_600SemiBold',
  headingMedium: 'BricolageGrotesque_500Medium',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemibold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
  bodyLight: 'Figtree_300Light',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemibold: 'IBMPlexMono_600SemiBold',
  // Alias pratiques (rendu par défaut) utilisés par les widgets
  bricolage: 'BricolageGrotesque_600SemiBold',
  figtree: 'Figtree_400Regular',
} as const;

// Table canonique des rôles typographiques
export const typeRoles: Record<TypeRole, TypeSpec> = {
  // Héros / solde de la carte
  display: {
    fontFamily: FONT_FAMILIES.display,
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 46,
    letterSpacing: -1.0,
  },
  // Titre de page
  h1: {
    fontFamily: FONT_FAMILIES.heading,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  // Titre d'écran / section
  h2: {
    fontFamily: FONT_FAMILIES.heading,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  // Titre de carte / widget
  h3: {
    fontFamily: FONT_FAMILIES.headingMedium,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  // Titre de widget / sous-section
  h4: {
    fontFamily: FONT_FAMILIES.bodySemibold,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  // Corps standard
  body: {
    fontFamily: FONT_FAMILIES.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: 0,
  },
  // Sous-titres de lignes, métadonnées
  bodySmall: {
    fontFamily: FONT_FAMILIES.body,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
    letterSpacing: 0,
  },
  // Métadonnées, dates
  caption: {
    fontFamily: FONT_FAMILIES.bodyMedium,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  // Une seule fois par écran max : « SOLDE TOTAL »
  overline: {
    fontFamily: FONT_FAMILIES.monoSemibold,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // Libellés de champs, boutons de chip
  label: {
    fontFamily: FONT_FAMILIES.bodySemibold,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  // Composants compacts
  dense: {
    fontFamily: FONT_FAMILIES.bodyMedium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0,
  },
  // Montants de liste, valeurs de cellules
  numeric: {
    fontFamily: FONT_FAMILIES.mono,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  // Solde de la carte de solde
  numericDisplay: {
    fontFamily: FONT_FAMILIES.monoMedium,
    fontSize: 34,
    fontWeight: '500',
    lineHeight: 40,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  // Axes, pourcentages, petites valeurs
  numericSmall: {
    fontFamily: FONT_FAMILIES.mono,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  // Codes, identifiants
  mono: {
    fontFamily: FONT_FAMILIES.monoMedium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0,
  },
};

// Helper pour résoudre un rôle typographique + optionnellement une couleur de ton
export function resolveTypography(theme: Theme, role: TypeRole, tone?: 'positive' | 'negative' | 'default') {
  const spec = typeRoles[role];
  let color: string;
  if (tone === 'positive') color = theme.colors.income;
  else if (tone === 'negative') color = theme.colors.expense;
  else color = role === 'caption' || role === 'bodySmall' || role === 'overline' ? theme.colors.textSecondary : theme.colors.text;

  return {
    ...spec,
    color,
    // textTransform sur overline
    ...(spec.textTransform ? { textTransform: spec.textTransform } : {}),
  };
}

// Compatibilité : map l'ancien fontSize du thème vers la nouvelle table
export function legacyFontSize(role: keyof typeof fontSize): number {
  const map: Record<string, TypeRole> = {
    caption: 'caption',
    bodySmall: 'bodySmall',
    body: 'body',
    bodyLarge: 'body',
    subtitle: 'h4',
    label: 'label',
    h4: 'h4',
    h3: 'h3',
    h2: 'h2',
    h1: 'h1',
    display: 'display',
  };
  const r = map[role];
  return r ? typeRoles[r].fontSize : 13;
}