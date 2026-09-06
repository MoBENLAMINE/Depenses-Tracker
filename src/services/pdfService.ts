// ============================================================
// Service de génération de rapports PDF
// ============================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Paths, File } from 'expo-file-system';
import type { ReportData } from '../types';
import { formatCurrency, fileTimestamp } from '../utils/format';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function buildReportHtml(data: ReportData): string {
  const { period, summary, categorySpending, budgets, topTransactions, totalBudget, totalSpent } = data;
  const monthLabel = MONTH_NAMES[period.month - 1];
  const dateLabel = `${monthLabel} ${period.year}`;

  const categoryRows = categorySpending
    .slice(0, 10)
    .map((cat) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${cat.category_color};margin-right:8px;"></span>
          ${cat.category_name}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(cat.total)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${cat.percentage.toFixed(1)}%</td>
      </tr>
    `).join('');

  const budgetRows = budgets
    .filter(b => b.amount > 0)
    .map((b) => {
      const pct = b.progress;
      const color = pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#22c55e';
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${b.category_name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(b.amount)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(b.spent)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: ${color};">${pct.toFixed(1)}%</td>
        </tr>
      `;
    }).join('');

  const topRows = topTransactions
    .slice(0, 10)
    .map((t) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${new Date(t.date).toLocaleDateString('fr-FR')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${t.category_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${t.description || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: ${t.type === 'income' ? '#22c55e' : '#ef4444'};">
          ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
        </td>
      </tr>
    `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
        .summary-grid { display: flex; gap: 12px; margin-bottom: 24px; }
        .summary-card { flex: 1; background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; }
        .summary-card .value { font-size: 20px; font-weight: 700; margin-top: 4px; }
        .summary-card .label { color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { padding: 8px; background: #f1f5f9; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; text-align: left; }
        td { font-size: 13px; }
        h2 { font-size: 16px; margin: 24px 0 12px; color: #0f172a; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div style="text-align:center;margin-bottom:24px;">
        <h1>Dépenses Tracker</h1>
        <div class="subtitle">Rapport mensuel — ${dateLabel}</div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">Revenus</div>
          <div class="value" style="color:#22c55e;">${formatCurrency(summary.income)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Dépenses</div>
          <div class="value" style="color:#ef4444;">${formatCurrency(summary.expense)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Solde</div>
          <div class="value" style="color:${summary.balance >= 0 ? '#22c55e' : '#ef4444'};">${formatCurrency(summary.balance)}</div>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">Budget total</div>
          <div class="value">${formatCurrency(totalBudget)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Dépensé</div>
          <div class="value" style="color:${totalSpent > totalBudget ? '#ef4444' : '#22c55e'};">${formatCurrency(totalSpent)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Utilisation</div>
          <div class="value" style="color:${totalBudget > 0 && totalSpent > totalBudget ? '#ef4444' : '#64748b'};">${totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}%</div>
        </div>
      </div>

      <h2>Dépenses par catégorie</h2>
      <table>
        <thead><tr><th>Catégorie</th><th style="text-align:right;">Montant</th><th style="text-align:right;">%</th></tr></thead>
        <tbody>${categoryRows || '<tr><td colspan="3" style="text-align:center;padding:16px;color:#94a3b8;">Aucune dépense ce mois-ci</td></tr>'}</tbody>
      </table>

      <h2>Budget vs Réel</h2>
      <table>
        <thead><tr><th>Catégorie</th><th style="text-align:right;">Budget</th><th style="text-align:right;">Dépensé</th><th style="text-align:right;">%</th></tr></thead>
        <tbody>${budgetRows || '<tr><td colspan="4" style="text-align:center;padding:16px;color:#94a3b8;">Aucun budget défini</td></tr>'}</tbody>
      </table>

      <h2>Top 10 transactions</h2>
      <table>
        <thead><tr><th>Date</th><th>Catégorie</th><th>Description</th><th style="text-align:right;">Montant</th></tr></thead>
        <tbody>${topRows || '<tr><td colspan="4" style="text-align:center;padding:16px;color:#94a3b8;">Aucune transaction</td></tr>'}</tbody>
      </table>

      <div class="footer">
        Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}<br>
        Dépenses Tracker
      </div>
    </body>
    </html>
  `;
}

/**
 * Génère un rapport PDF mensuel.
 * Retourne le chemin du fichier PDF généré.
 */
export async function generateMonthlyReport(data: ReportData): Promise<string> {
  const html = buildReportHtml(data);
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 }); // A4

  // Renomme le fichier selon la convention depenses-tracker_rapport_JJ-MM-AAAA_HH-MM-SS.pdf
  const dest = new File(Paths.cache, `depenses-tracker_rapport_${fileTimestamp()}.pdf`);
  await dest.write(await new File(uri).bytes());
  return dest.uri;
}

/**
 * Partage un rapport PDF.
 */
export async function shareReport(fileUri: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Partager le rapport',
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Le partage n\'est pas disponible sur cet appareil.');
  }
}

/**
 * Génère et partage un rapport PDF en une seule étape.
 */
export async function generateAndShareReport(data: ReportData): Promise<void> {
  const uri = await generateMonthlyReport(data);
  await shareReport(uri);
}
