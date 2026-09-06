// ============================================================
// Sélecteur de date modal
// ============================================================

import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatMonth } from '../../utils/format';

interface DatePickerProps {
  visible: boolean;
  date: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
}

export function DatePicker({ visible, date, onSelect, onClose }: DatePickerProps) {
  const { theme } = useTheme();
  const parsed = date ? new Date(date + 'T00:00:00') : new Date();
  const [selectedDay, setSelectedDay] = useState(parsed.getDate());
  const [selectedMonth, setSelectedMonth] = useState(parsed.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(parsed.getFullYear());

  const today = new Date();
  const currentYear = today.getFullYear();

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const handleSelect = (day: number) => {
    const formatted = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelect(formatted);
    onClose();
  };

  const setToday = () => {
    const d = new Date();
    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    onSelect(formatted);
    onClose();
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Préparer la grille des jours
  const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();
  const days: (number | null)[] = Array(firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1).fill(null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 30,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>
              Choisir une date
            </Text>
            <TouchableOpacity onPress={setToday}>
              <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '600' }}>
                Aujourd'hui
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sélecteur mois/année */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 12,
          }}>
            <TouchableOpacity onPress={handlePrevMonth} style={{ padding: 8 }}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>
              {formatMonth(selectedMonth)} {selectedYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={{ padding: 8 }}>
              <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Jours de la semaine */}
          <View style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            marginBottom: 8,
          }}>
            {dayNames.map((name) => (
              <View key={name} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' }}>
                  {name}
                </Text>
              </View>
            ))}
          </View>

          {/* Grille des jours */}
          <ScrollView style={{ maxHeight: 280, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {days.map((day, index) => {
                if (day === null) {
                  return <View key={`empty-${index}`} style={{ flexBasis: '14.28%', padding: 4 }} />;
                }

                const isSelected = day === selectedDay
                  && selectedMonth === parsed.getMonth() + 1
                  && selectedYear === parsed.getFullYear();

                const isToday = day === today.getDate()
                  && selectedMonth === today.getMonth() + 1
                  && selectedYear === today.getFullYear();

                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => handleSelect(day)}
                    style={{
                      flexBasis: '14.28%',
                      padding: 4,
                    }}
                  >
                    <View style={{
                      width: '100%',
                      aspectRatio: 1,
                      borderRadius: 20,
                      backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: isToday && !isSelected ? 1.5 : 0,
                      borderColor: theme.colors.primary,
                    }}>
                      <Text style={{
                        color: isSelected ? '#FFFFFF' : theme.colors.text,
                        fontSize: 14,
                        fontWeight: isSelected ? '700' : '400',
                      }}>
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
