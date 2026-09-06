// ============================================================
// Bouton de saisie vocale flottant
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Platform } from 'react-native';

interface VoiceInputButtonProps {
  onResult: (result: { transcript: string }) => void;
}

export function VoiceInputButton({ onResult }: VoiceInputButtonProps) {
  const { theme } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isListening, pulseAnim]);

  const handlePress = useCallback(() => {
    if (!isListening) {
      setIsListening(true);
      setTranscript('');

      // Simulation d'écoute — dans un environnement réel,
      // ceci appellerait l'API Speech-to-Text native.
      // On simule une reconnaissance après 2s.
      const timeout = setTimeout(() => {
        setTranscript('150 dirhams de courses chez Carrefour');
        setIsListening(false);
        onResult({ transcript: '150 dirhams de courses chez Carrefour' });
      }, 2000);
    }
  }, [isListening, onResult]);

  const handleCancel = useCallback(() => {
    setIsListening(false);
    setTranscript('');
  }, []);

  return (
    <>
      {/* Bouton flottant */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={{
          position: 'absolute',
          bottom: 90,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: isListening ? theme.colors.error : theme.colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
            },
            android: { elevation: 6 },
          }),
        }}
      >
        <Ionicons
          name={isListening ? 'mic' : 'mic-outline'}
          size={24}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {/* Modal d'écoute */}
      <Modal visible={isListening} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 24,
            padding: 32,
            alignItems: 'center',
            width: '80%',
          }}>
            <Animated.View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: theme.colors.primary + '20',
              justifyContent: 'center', alignItems: 'center',
              marginBottom: 16,
              transform: [{ scale: pulseAnim }],
            }}>
              <Ionicons name="mic" size={40} color={theme.colors.primary} />
            </Animated.View>

            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
              Écoute en cours...
            </Text>

            {transcript ? (
              <Text style={{
                color: theme.colors.text,
                fontSize: 15,
                textAlign: 'center',
                marginBottom: 16,
                fontStyle: 'italic',
              }}>
                "{transcript}"
              </Text>
            ) : (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginBottom: 16 }} />
            )}

            <TouchableOpacity
              onPress={handleCancel}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 24,
                borderRadius: 10,
                backgroundColor: theme.colors.error + '15',
              }}
            >
              <Text style={{ color: theme.colors.error, fontWeight: '600' }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
