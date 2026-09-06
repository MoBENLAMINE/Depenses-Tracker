// ============================================================
// Avatar de profil — photo utilisateur ou icône grise par défaut
// ============================================================

import { View, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useDatabase } from '../../contexts/DatabaseContext';

interface ProfileAvatarProps {
  size?: number;
  onPress?: () => void;
}

export function ProfileAvatar({ size = 36, onPress }: ProfileAvatarProps) {
  const { theme } = useThemeContext();
  const { avatarUri } = useDatabase();
  const radius = size / 2;

  const circle = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: theme.colors.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.primary + '30',
        overflow: 'hidden',
      }}
    >
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={{ width: size, height: size }} />
      ) : (
        <Ionicons name="person" size={size * 0.55} color={theme.colors.textSecondary} />
      )}
    </View>
  );

  // Pastille verte de présence
  const dot = (
    <View
      style={{
        position: 'absolute',
        right: -1,
        bottom: -1,
        width: size * 0.38,
        height: size * 0.38,
        borderRadius: size * 0.19,
        backgroundColor: theme.colors.primary,
        borderWidth: 2,
        borderColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="checkmark" size={size * 0.2} color="#FFF" />
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={{ position: 'relative' }}>
        {circle}
        {dot}
      </Pressable>
    );
  }

  return (
    <View style={{ position: 'relative' }}>
      {circle}
      {dot}
    </View>
  );
}
