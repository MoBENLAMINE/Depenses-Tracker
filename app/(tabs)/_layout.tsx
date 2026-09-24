// ============================================================
// Navigation par onglets — style de la refonte
// (tab bar avec blur, icône remplie à l'actif, header dégradé)
// ============================================================

import { View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useThemeContext } from '../../src/contexts/ThemeContext';
import { AppHeader } from '../../src/components/layout/AppHeader';
import { ProfileAvatar } from '../../src/components/layout/ProfileAvatar';
import { AccountSwitcher } from '../../src/components/layout/AccountSwitcher';
import { FloatingBottomNav } from '../../src/components/layout/FloatingBottomNav';

// Sélecteur de compte + avatar alignés au bord droit du header (headerRight)
function HeaderRight() {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <AccountSwitcher />
      <ProfileAvatar
        size={36}
        onPress={() => router.push('/(tabs)/settings')}
        style={{ marginRight: 4 }}
      />
    </View>
  );
}

export default function TabLayout() {
  const { theme } = useThemeContext();
  const c = theme.colors as any;

  return (
    <Tabs
      tabBar={(props) => <FloatingBottomNav state={props.state} navigation={props.navigation} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: c.background,
        },
        headerTintColor: c.text,
        headerShadowVisible: false,
        // Marge droite = padding gauche du logo pour symétrie visuelle
        headerRightContainerStyle: { marginRight: 16 },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSecondary,
      } as any}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: () => <AppHeader title="Dépenses Tracker" />,
          headerRight: () => <HeaderRight />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          headerTitle: () => <AppHeader title="Dépenses Tracker" />,
          headerRight: () => <HeaderRight />,
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          headerTitle: () => <AppHeader title="Dépenses Tracker" />,
          headerRight: () => <HeaderRight />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analyses',
          headerTitle: () => <AppHeader title="Dépenses Tracker" />,
          headerRight: () => <HeaderRight />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          headerTitle: () => <AppHeader title="Paramètres" />,
          headerRight: () => <HeaderRight />,
        }}
      />
    </Tabs>
  );
}
