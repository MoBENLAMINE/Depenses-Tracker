// Palette « Le Grand Livre » : la feuille, le bureau, l'encre, le safran.
// Les clés précédées de * dans la spec sont écrasées à l'exécution par l'engine
// d'accent (material.ts). Les valeurs ci-dessous sont celles du preset `palmier`.

export const lightColors = {
  // Brand — pin-encre (primaire) + safran (secondaire)
  primary: '#0E5A4C',
  primaryLight: '#2E7D6A',
  primaryDark: '#063B30',
  secondary: '#946000',
  secondaryLight: '#C79100',
  secondaryDark: '#6E4500',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#F5E2C8',
  // Surfaces & fonds
  background: '#E9EDEB',   // bureau (fond de scroll)
  surface: '#FBFCFC',      // feuille
  surfaceVariant: '#EEF1F0',
  // Texte
  text: '#17211D',         // encre
  textSecondary: '#4A5650',
  textTertiary: '#66726B',
  // Bordures & filets
  border: '#C8D0CC',
  borderLight: '#E2E7E5',
  // Sémantique
  error: '#BA1A1A',
  success: '#0E5A4C',
  warning: '#7A4A12',
  info: '#1E4E9B',
  income: '#0E5A4C',
  expense: '#B42318',
  // Barre d'onglets
  tabBar: '#FBFCFC',
  tabBarBorder: '#C8D0CC',
  // Ombres & overlays
  cardShadow: 'rgba(23, 33, 29, 0.08)',
  overlay: 'rgba(12, 18, 16, 0.5)',
  // Couleurs de graphiques (analyses)
  chart1: '#0E5A4C',   // pin
  chart2: '#C79100',   // safran
  chart3: '#1E4E9B',   // zellige
  chart4: '#B42318',   // grenade
  chart5: '#0B6E78',   // teck
  chart6: '#7A4A12',   // argan
  chart7: '#5A3E9E',   // améthyste
  // Variants sémantiques teintés
  successLight: '#D8EAE3',
  warningLight: '#F5E2C8',
  errorLight: '#F6DAD5',
  infoLight: '#DCE6F6',
  // Signature safran (seule couleur chaude du produit)
  saffron: '#C79100',
  saffronLight: '#F2C14E',
  saffronDark: '#6E4500',
  // Niveaux d'élévation de surface
  elevation1: '#EEF1F0',
  elevation2: '#F3F6F5',
  // Material-3 : contraste sur primaire + surfaces de conteneur
  onPrimary: '#FFFFFF',
  primaryContainer: '#D8EAE3',
  onPrimaryContainer: '#0A2B23',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F3F6F5',
  surfaceContainer: '#EEF1F0',
  surfaceContainerHigh: '#E8ECEB',
  surfaceContainerHighest: '#E2E7E5',
  outline: '#6B7871',
  outlineVariant: '#C8D0CC',
  // Couleurs par type de transaction étendu
  typeUpcoming: '#946000',
  typeUpcomingLight: '#F5E2C8',
  typeSubscription: '#5A3E9E',
  typeSubscriptionLight: '#E8DEF6',
  typeDebt: '#B42318',
  typeDebtLight: '#F6DAD5',
  typeCredit: '#0B6E78',
  typeCreditLight: '#D6F1F4',
  currencyBadge: '#0E5A4C',
  currencyBadgeLight: '#D8EAE3',
  goalProgress: '#0E5A4C',
  goalProgressLight: '#D8EAE3',
  // Dégradé signature (cartes solde / budget / logo) : pin → encre
  gradientStart: '#0E5A4C',
  gradientEnd: '#18352F',
  greenAccent: '#7BE3B8',
};

export const darkColors = {
  primary: '#AAC5C0',
  primaryLight: '#C8E0DA',
  primaryDark: '#86A8A1',
  secondary: '#F2C14E',
  secondaryLight: '#FFD980',
  secondaryDark: '#C79100',
  onSecondary: '#221A00',
  secondaryContainer: '#4A3A10',
  background: '#0F1412',
  surface: '#151B19',
  surfaceVariant: '#202725',
  text: '#E6EAE8',
  textSecondary: '#B7C2BD',
  textTertiary: '#8A9891',
  border: '#3A4541',
  borderLight: '#262E2B',
  error: '#FFB4AB',
  success: '#54D6A8',
  warning: '#FFC97A',
  info: '#8FB3E8',
  income: '#54D6A8',
  expense: '#FFB4AB',
  tabBar: '#151B19',
  tabBarBorder: '#3A4541',
  cardShadow: 'rgba(0, 0, 0, 0.35)',
  overlay: 'rgba(4, 8, 6, 0.7)',
  chart1: '#54D6A8',
  chart2: '#F2C14E',
  chart3: '#8FB3E8',
  chart4: '#FF9A8A',
  chart5: '#5CD0E0',
  chart6: '#C9A36B',
  chart7: '#C3A8E8',
  successLight: '#123229',
  warningLight: '#33240A',
  errorLight: '#3A1412',
  infoLight: '#1A2740',
  saffron: '#F2C14E',
  saffronLight: '#FFD980',
  saffronDark: '#C79100',
  elevation1: '#1A211F',
  elevation2: '#202725',
  onPrimary: '#0E2A24',
  primaryContainer: '#23534A',
  onPrimaryContainer: '#D3EAE3',
  surfaceContainerLowest: '#0F1412',
  surfaceContainerLow: '#1A211F',
  surfaceContainer: '#202725',
  surfaceContainerHigh: '#262E2B',
  surfaceContainerHighest: '#2C3532',
  outline: '#8A9891',
  outlineVariant: '#3A4541',
  typeUpcoming: '#FFC97A',
  typeUpcomingLight: '#33240A',
  typeSubscription: '#C6BEFF',
  typeSubscriptionLight: '#332D6B',
  typeDebt: '#FFB4AB',
  typeDebtLight: '#3A1412',
  typeCredit: '#4DD8DB',
  typeCreditLight: '#0B3A3D',
  currencyBadge: '#54D6A8',
  currencyBadgeLight: '#123229',
  goalProgress: '#54D6A8',
  goalProgressLight: '#123229',
  gradientStart: '#0E5A4C',
  gradientEnd: '#486560',
  greenAccent: '#7BE3B8',
};

export type ColorPalette = typeof lightColors;
