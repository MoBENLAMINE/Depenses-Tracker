// ============================================================
// ReceiptForm — formulaire éditable d'un reçu scanné
// Chaque champ affiche la prédiction + la confiance (couleur :
// vert >0.9, jaune 0.7-0.9, rouge <0.7). Correction → loguée
// (receipt_corrections) — aucune donnée réseau.
// ============================================================

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAccount } from '../contexts/AccountContext';
import { useDatabase } from '../contexts/DatabaseContext';
import { Button } from './ui/Button';
import type { ScannedReceipt, ReceiptItem, Category } from '../types';
import { confidenceLevel } from '../types';
import { categorizeMerchant } from '../lib/categorizer';

interface ReceiptFormProps {
  scan: ScannedReceipt;
  receiptUri: string;
  onDone: () => void;
}

/** Convertit une date libre en YYYY-MM-DD (formats courants de reçus). */
function toIsoDate(raw: string): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const fallback = new Date(s);
  if (!Number.isNaN(fallback.getTime())) return fallback.toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
}

function confidenceColor(theme: ReturnType<typeof useTheme>['theme'], conf: number): string {
  const lvl = confidenceLevel(conf);
  if (lvl === 'high') return theme.colors.success;
  if (lvl === 'medium') return theme.colors.warning;
  return theme.colors.error;
}

export function ReceiptForm({ scan, receiptUri, onDone }: ReceiptFormProps) {
  const { theme } = useTheme();
  const { add } = useTransactions();
  const { categories } = useCategories('expense');
  const { accounts, selectedAccountId } = useAccount();
  const { receiptCorrections } = useDatabase();

  // --- État éditable, initialisé depuis les prédictions ---
  const [merchant, setMerchant] = useState(scan.merchant.value);
  const [rawDate, setRawDate] = useState(scan.date.value);
  const [currency, setCurrency] = useState(scan.currency.value || 'MAD');
  const [items, setItems] = useState<ReceiptItem[]>(
    scan.items.length > 0
      ? scan.items
      : [{ name: '', quantity: 1, unitPrice: 0, totalPrice: 0, confidence: 0 }]
  );
  const [subtotal, setSubtotal] = useState(scan.subtotal.value ? String(scan.subtotal.value) : '');
  const [tax, setTax] = useState(scan.tax.value ? String(scan.tax.value) : '');
  const [total, setTotal] = useState(scan.total.value ? String(scan.total.value) : '');
  const [categoryName, setCategoryName] = useState(scan.category.value);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategorySearch, setShowCategorySearch] = useState(false);

  // Compte par défaut (sauf "all")
  const defaultAccountId =
    selectedAccountId !== 'all' ? selectedAccountId : accounts.find((a) => !a.is_archived)?.id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const applyHint = useMemo(() => {
    const hint = categorizeMerchant(merchant);
    return hint.categoryName;
  }, [merchant]);

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    const q = categorySearch.trim().toLowerCase();
    const list = q
      ? categories.filter((c) => c.name.toLowerCase().includes(q))
      : categories;
    return list.slice(0, 12);
  }, [categories, categorySearch]);

  const selectedCategory = useMemo<Category | null>(
    () =>
      (categories ?? []).find(
        (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase()
      ) ?? null,
    [categories, categoryName]
  );

  const updateItem = (index: number, patch: Partial<ReceiptItem>) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const next = { ...it, ...patch };
        // Recalcule total si l'une des dimensions a changé et pouf unchanged
        const q = next.quantity || 0;
        const p = next.unitPrice || 0;
        next.totalPrice = q * p;
        return next;
      })
    );
  };

  const logCorrection = async (
    field: string,
    predicted: string,
    corrected: string
  ) => {
    if (predicted === corrected) return;
    try {
      await receiptCorrections.log(
        scan.imageHash,
        scan as unknown as Record<string, unknown>,
        { ...scan, [field.replace(/\./g, '_')]: corrected } as unknown as Record<string, unknown>,
        [field]
      );
    } catch (e) {
      console.warn('Correction logging failed:', e);
    }
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(total.replace(',', '.')) || parseFloat(subtotal.replace(',', '.')) || 0;
    if (amountNum <= 0) {
      setError('Le montant total est requis');
      return;
    }

    const finalCategory = selectedCategory ??
      (categories ?? []).find((c) => c.name.toLowerCase() === (applyHint || '').toLowerCase()) ??
      (categories ?? []).find((c) => c.type === 'expense');

    if (!finalCategory) {
      setError('Veuillez sélectionner une catégorie');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const isoDate = toIsoDate(rawDate);

      // Loguer les corrections de champs (apprentissage)
      await logCorrection('merchant', scan.merchant.value, merchant.trim());
      await logCorrection('category', scan.category.value, finalCategory.name);
      if (scan.date.value !== isoDate) await logCorrection('date', scan.date.value, isoDate);
      if (total && scan.total.value !== amountNum) await logCorrection('total', String(scan.total.value), String(amountNum));

      await add({
        amount: amountNum,
        type: 'expense',
        category_id: finalCategory.id,
        merchant_name: merchant.trim() || undefined,
        description: items.filter((i) => i.name).map((i) => i.name).join(', ') || undefined,
        date: isoDate,
        receipt_uri: receiptUri,
        account_id: defaultAccountId,
        import_source: 'ocr',
      });

      onDone();
    } catch (e) {
      console.warn('Erreur enregistrement reçu:', e);
      setError("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
        {/* Marchand + confiance */}
        <FormField
          theme={theme}
          label="Marchand"
          confidence={scan.merchant.confidence}
          value={
            <TextInput
              value={merchant}
              onChangeText={setMerchant}
              placeholder="Nom du commerce"
              placeholderTextColor={theme.colors.textSecondary}
              style={inputStyle(theme)}
            />
          }
        />

        {/* Date + confiance */}
        <FormField
          theme={theme}
          label="Date"
          confidence={scan.date.confidence}
          value={
            <TextInput
              value={rawDate}
              onChangeText={setRawDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textSecondary}
              style={inputStyle(theme)}
            />
          }
        />

        {/* Devise + confiance */}
        <FormField
          theme={theme}
          label="Devise"
          confidence={scan.currency.confidence}
          value={
            <TextInput
              value={currency}
              onChangeText={setCurrency}
              placeholder="MAD"
              placeholderTextColor={theme.colors.textSecondary}
              style={inputStyle(theme)}
            />
          }
        />

        {/* Articles */}
        <Text style={sectionLabel(theme)}>Articles</Text>
        {items.map((item, idx) => (
          <View key={idx} style={itemRow(theme)}>
            <TextInput
              value={item.name}
              onChangeText={(name) => updateItem(idx, { name })}
              placeholder="Article"
              placeholderTextColor={theme.colors.textSecondary}
              style={[inputStyle(theme), { flex: 1 }]}
            />
            <TextInput
              value={item.quantity ? String(item.quantity) : ''}
              onChangeText={(q) => updateItem(idx, { quantity: parseFloat(q.replace(',', '.')) || 0 })}
              placeholder="Qté"
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textSecondary}
              style={[inputStyle(theme), { width: 52 }]}
            />
            <TextInput
              value={item.unitPrice ? String(item.unitPrice) : ''}
              onChangeText={(p) => updateItem(idx, { unitPrice: parseFloat(p.replace(',', '.')) || 0 })}
              placeholder="PU"
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.textSecondary}
              style={[inputStyle(theme), { width: 72 }]}
            />
            <TouchableOpacity
              onPress={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
              style={{ padding: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          onPress={() =>
            setItems((prev) => [...prev, { name: '', quantity: 1, unitPrice: 0, totalPrice: 0, confidence: 0 }])
          }
          style={addItemButton(theme)}
        >
          <Ionicons name="add" size={18} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Ajouter un article</Text>
        </TouchableOpacity>

        {/* Sous-total / taxes / total */}
        <FormField
          theme={theme}
          label="Sous-total"
          confidence={scan.subtotal.confidence}
          value={
            <TextInput
              value={subtotal}
              onChangeText={setSubtotal}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.textSecondary}
              style={inputStyle(theme)}
            />
          }
        />
        <FormField
          theme={theme}
          label="Taxes"
          confidence={scan.tax.confidence}
          value={
            <TextInput
              value={tax}
              onChangeText={setTax}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.textSecondary}
              style={inputStyle(theme)}
            />
          }
        />
        <FormField
          theme={theme}
          label="Total"
          confidence={scan.total.confidence}
          value={
            <TextInput
              value={total}
              onChangeText={setTotal}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.textSecondary}
              style={[inputStyle(theme), { fontWeight: '700', color: theme.colors.expense }]}
            />
          }
        />

        {/* Catégorie + confiance + recherche */}
        <FormField
          theme={theme}
          label="Catégorie"
          confidence={scan.category.confidence}
          value={
            <View>
              <TouchableOpacity
                onPress={() => setShowCategorySearch((v) => !v)}
                style={inputStyle(theme)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name={selectedCategory?.icon as any}
                    size={16}
                    color={selectedCategory?.color || theme.colors.primary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ color: selectedCategory ? theme.colors.text : theme.colors.textSecondary, flex: 1 }}>
                    {selectedCategory?.name || categoryName || 'Choisir une catégorie'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>
              {!selectedCategory && applyHint ? (
                <TouchableOpacity
                  onPress={() => setCategoryName(applyHint)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: theme.colors.primary + '15',
                    padding: 8,
                    borderRadius: 8,
                    marginTop: 6,
                  }}
                >
                  <Ionicons name="bulb" size={14} color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.primary, fontSize: 13 }}>
                    Suggestion : {applyHint} — appuyer pour appliquer
                  </Text>
                </TouchableOpacity>
              ) : null}
              {showCategorySearch ? (
                <View style={{ marginTop: 6 }}>
                  <TextInput
                    value={categorySearch}
                    onChangeText={setCategorySearch}
                    placeholder="Rechercher…"
                    placeholderTextColor={theme.colors.textSecondary}
                    style={[inputStyle(theme), { marginBottom: 6 }]}
                    autoFocus
                  />
                  {filteredCategories.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => {
                        setCategoryName(c.name);
                        setShowCategorySearch(false);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 }}
                    >
                      <Ionicons name={c.icon as any} size={16} color={c.color} />
                      <Text style={{ color: theme.colors.text, fontSize: 15 }}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          }
        />

        {error ? (
          <View style={{ padding: 12, backgroundColor: theme.colors.error + '15', borderRadius: 10, marginBottom: 16 }}>
            <Text style={{ color: theme.colors.error, fontSize: 14 }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 40 }}>
          <View style={{ flex: 1 }}>
            <Button title="Annuler" onPress={onDone} variant="outlined" />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Enregistrer" onPress={handleSubmit} loading={loading} color={theme.colors.primary} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- Elements ------------------------------------------------

function FormField({
  theme,
  label,
  confidence,
  value,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  label: string;
  confidence: number;
  value: React.ReactNode;
}) {
  const color = confidenceColor(theme, confidence);
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500', flex: 1 }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text style={{ color: color, fontSize: 12, fontWeight: '600' }}>
            {Math.round(confidence * 100)}%
          </Text>
        </View>
      </View>
      {value}
    </View>
  );
}

const inputStyle = (theme: ReturnType<typeof useTheme>['theme']) => ({
  backgroundColor: theme.colors.surface,
  color: theme.colors.text,
  fontSize: 15,
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: theme.colors.border,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
});

const sectionLabel = (theme: ReturnType<typeof useTheme>['theme']) => ({
  color: theme.colors.text,
  fontSize: 14,
  fontWeight: '600' as const,
  marginBottom: 8,
  marginTop: 4,
});

const itemRow = (theme: ReturnType<typeof useTheme>['theme']) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  marginBottom: 8,
});

const addItemButton = (theme: ReturnType<typeof useTheme>['theme']) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
  padding: 12,
  borderRadius: 12,
  borderWidth: 1.5,
  borderStyle: 'dashed' as const,
  borderColor: theme.colors.primary + '60',
  marginBottom: 20,
});