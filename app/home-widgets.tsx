// ============================================================
// Personnaliser l'accueil (visibilité + ordre des widgets)
// ============================================================

import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeContext } from '../src/contexts/ThemeContext';
import { useHomeWidgets } from '../src/hooks/useHomeWidgets';
import { HOME_WIDGETS } from '../src/utils/homeWidgets';

export default function HomeWidgetsScreen() {
  const { theme } = useThemeContext();
  const { order, hidden, setHidden, move } = useHomeWidgets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>
          Personnaliser l'accueil
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
          Masquez les widgets que vous n'utilisez pas et réorganisez-les selon vos préférences.
        </Text>

        {order.map((id, index) => {
          const meta = HOME_WIDGETS.find((w) => w.id === id);
          if (!meta) return null;
          const isHidden = hidden.has(id);
          const canMoveUp = index > 0;
          const canMoveDown = index < order.length - 1;

          return (
            <View
              key={id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 14,
                marginBottom: 10,
                opacity: isHidden ? 0.5 : 1,
              }}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.colors.primary + '18',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name={meta.icon as any} size={20} color={theme.colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>
                  {meta.title}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 1 }}>
                  {meta.subtitle}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
                <TouchableOpacity
                  disabled={!canMoveUp}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    move(id, -1);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  style={{ opacity: canMoveUp ? 1 : 0.3, padding: 4 }}
                >
                  <Ionicons name="arrow-up" size={18} color={theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={!canMoveDown}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    move(id, 1);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  style={{ opacity: canMoveDown ? 1 : 0.3, padding: 4 }}
                >
                  <Ionicons name="arrow-down" size={18} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <Switch
                value={!isHidden}
                onValueChange={(v) => {
                  Haptics.selectionAsync().catch(() => {});
                  setHidden(id, !v);
                }}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
