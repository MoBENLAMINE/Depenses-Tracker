// ============================================================
// Service d'export CSV
// ============================================================

import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { TransactionWithCategory } from '../types';
import { fileTimestamp } from '../utils/format';
import { EXPORT_FILENAME } from '../utils/constants';

/**
 * Exporte les transactions au format CSV et ouvre le partage
 */
export async function exportTransactionsCSV(transactions: TransactionWithCategory[]): Promise<string> {
  // En-têtes CSV
  const headers = [
    'Date',
    'Type',
    'Catégorie',
    'Description',
    'Montant',
    'Solde',
  ].join(',');

  // Lignes
  const rows = transactions.map((t) => {
    const amount = t.type === 'expense' ? -t.amount : t.amount;
    const escapedDesc = t.description
      ? `"${t.description.replace(/"/g, '""')}"`
      : '';

    return [
      t.date,
      t.type === 'expense' ? 'Dépense' : 'Revenu',
      `"${t.category_name}"`,
      escapedDesc,
      amount.toFixed(2).replace('.', ','),
    ].join(',');
  });

  const csvContent = '﻿' + [headers, ...rows].join('\n'); // BOM pour Excel (UTF-8)

  const fileName = `${EXPORT_FILENAME}_${fileTimestamp()}.csv`;
  const exportFile = new File(Paths.cache, fileName);
  const filePath = exportFile.uri;

  await exportFile.write(csvContent);

  // Partager
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Exporter les transactions',
    });
  }

  return filePath;
}

/**
 * Génère le contenu CSV sous forme de string
 */
export function generateCSVContent(transactions: TransactionWithCategory[]): string {
  const headers = ['Date', 'Type', 'Catégorie', 'Description', 'Montant'].join(',');

  const rows = transactions.map((t) => {
    const amount = t.type === 'expense' ? -t.amount : t.amount;
    const desc = t.description ? `"${t.description.replace(/"/g, '""')}"` : '';
    return [t.date, t.type === 'expense' ? 'Dépense' : 'Revenu', `"${t.category_name}"`, desc, amount.toFixed(2).replace('.', ',')].join(',');
  });

  return '﻿' + [headers, ...rows].join('\n');
}