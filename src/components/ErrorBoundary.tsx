// ============================================================
// ErrorBoundary global - Capture les erreurs JS à l'écran
// ============================================================

import React, { Component, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.warn('ErrorBoundary caught:', error.message, errorInfo?.componentStack);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error;
      return (
        <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
            ⚠ Erreur
          </Text>
          <Text style={{ color: '#F8FAFC', fontSize: 14, marginBottom: 16 }}>
            {err.name}: {err.message}
          </Text>

          {err.stack && (
            <ScrollView style={{ maxHeight: 300, backgroundColor: '#1E293B', borderRadius: 8, padding: 12 }}>
              <Text style={{ color: '#94A3B8', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                {err.stack}
              </Text>
            </ScrollView>
          )}

          <TouchableOpacity
            onPress={() => this.setState({ error: null })}
            style={{
              backgroundColor: '#006C49',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              marginTop: 24,
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              Réessayer
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
