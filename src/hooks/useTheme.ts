// ============================================================
// Hook : Thème (raccourci)
// ============================================================

import { useThemeContext } from '../contexts/ThemeContext';

export function useTheme() {
  return useThemeContext();
}