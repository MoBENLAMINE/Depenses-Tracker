// ============================================================
// En-tête de l'application — logo + titre
// (l'avatar de profil est rendu séparément dans headerRight,
//  pour qu'il soit aligné au bord droit)
// ============================================================

import { View, Text, Image } from 'react-native';
import { useThemeContext } from '../../contexts/ThemeContext';

const logo = require('../../../assets/images/logo.png');

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const { theme, brandColor } = useThemeContext();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
      <View style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: brandColor,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
        <Image
          source={logo}
          resizeMode="contain"
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
          }}
        />
      </View>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: 20,
          fontFamily: theme.FONT_FAMILIES.bricolage,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </Text>
    </View>
  );
}
