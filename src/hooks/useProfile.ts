// ============================================================
// Hook photo de profil — picker + copie persistante + suppression
// ============================================================

import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system';
import { useDatabase } from '../contexts/DatabaseContext';

const AVATAR_DIR = new Directory(Paths.document, 'avatars');
const AVATAR_FILE = new File(AVATAR_DIR, 'avatar.jpg');

export function useProfile() {
  const { profile, refreshAvatar, setAvatarUri } = useDatabase();
  const [picking, setPicking] = useState(false);

  /** Choisir une photo (galerie) et la copier en stockage persistant. */
  const pickImage = useCallback(async () => {
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (result.canceled || !result.assets[0]?.uri) return;

      // Copier vers un emplacement persistant (l'URI du picker est temporaire)
      if (!AVATAR_DIR.exists) AVATAR_DIR.create({ intermediates: true, idempotent: true });
      if (AVATAR_FILE.exists) AVATAR_FILE.delete();
      await new File(result.assets[0].uri).copy(AVATAR_FILE);

      await profile.setAvatar(AVATAR_FILE.uri);
      setAvatarUri(AVATAR_FILE.uri);
    } catch (err) {
      console.warn('Failed to set profile picture:', err);
    } finally {
      setPicking(false);
    }
  }, [profile, setAvatarUri]);

  /** Supprimer la photo de profil. */
  const removeImage = useCallback(async () => {
    try {
      if (AVATAR_FILE.exists) AVATAR_FILE.delete();
      await profile.setAvatar(null);
      setAvatarUri(null);
    } catch (err) {
      console.warn('Failed to remove profile picture:', err);
    }
  }, [profile, setAvatarUri]);

  return { pickImage, removeImage, picking, refreshAvatar };
}
