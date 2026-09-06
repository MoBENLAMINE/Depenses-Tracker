// ============================================================
// Schéma de la base de données et migrations
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';

// DDL des transactions — partagé entre la création et la reconstruction (v5).
// SQLite ne permet pas de modifier un CHECK via ALTER TABLE : pour étendre le
// type enum, on reconstruit la table (rename → create → copy → drop).
const TRANSACTIONS_TABLE_DDL = `(
    id TEXT PRIMARY KEY NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    type TEXT NOT NULL CHECK(type IN ('income','expense','upcoming','subscription','debt','credit')),
    category_id TEXT NOT NULL,
    subcategory_id TEXT,
    description TEXT,
    merchant_name TEXT,
    date TEXT NOT NULL,
    receipt_uri TEXT,
    receipt_data TEXT,
    import_source TEXT NOT NULL DEFAULT 'manual',
    is_recurring INTEGER NOT NULL DEFAULT 0,
    predicted_category_id TEXT,
    account_id TEXT,
    goal_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
  )`;

const TRANSACTIONS_INDEXES_DDL = `
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date DESC);
  CREATE INDEX IF NOT EXISTS idx_transactions_subcategory ON transactions(subcategory_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_name);
  CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_goal ON transactions(goal_id);
`;

const GOALS_TABLE_DDL = `(
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'saving' CHECK(type IN ('saving', 'spending', 'debt_payoff', 'credit_collect')),
    target_amount REAL NOT NULL CHECK(target_amount > 0),
    current_amount REAL NOT NULL DEFAULT 0,
    deadline TEXT,
    account_id TEXT,
    category_id TEXT,
    color TEXT NOT NULL DEFAULT '#006C49',
    icon TEXT NOT NULL DEFAULT 'flag',
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  )`;

const RECURRING_CONFIG_TABLE_DDL = `(
    id TEXT PRIMARY KEY NOT NULL,
    description TEXT,
    amount REAL NOT NULL CHECK(amount > 0),
    type TEXT NOT NULL DEFAULT 'expense' CHECK(type IN ('income', 'expense')),
    category_id TEXT NOT NULL,
    subcategory_id TEXT,
    merchant_name TEXT,
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    interval INTEGER NOT NULL DEFAULT 1,
    next_due TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    end_date TEXT,
    account_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
  )`;

const SQL_CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    icon TEXT NOT NULL DEFAULT 'help-circle',
    color TEXT NOT NULL DEFAULT '#64748B',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subcategories (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'help-circle',
    color TEXT NOT NULL DEFAULT '#64748B',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories(category_id);

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'cash' CHECK(type IN ('cash', 'credit_card', 'chambre')),
    initial_balance REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'MAD',
    icon TEXT NOT NULL DEFAULT 'wallet',
    color TEXT NOT NULL DEFAULT '#006C49',
    is_archived INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS goals ${GOALS_TABLE_DDL};

  CREATE TABLE IF NOT EXISTS transactions ${TRANSACTIONS_TABLE_DDL};
  ${TRANSACTIONS_INDEXES_DDL}

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT NOT NULL,
    subcategory_id TEXT,
    type TEXT NOT NULL DEFAULT 'expense' CHECK(type IN ('expense', 'income')),
    month INTEGER NOT NULL CHECK(month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    alert_threshold REAL NOT NULL DEFAULT 0.8,
    alert_triggered INTEGER NOT NULL DEFAULT 0,
    rollover INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL,
    UNIQUE(category_id, month, year, type)
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT NOT NULL,
    due_time TEXT,
    repeat_type TEXT NOT NULL CHECK(repeat_type IN ('none', 'daily', 'weekly', 'monthly', 'yearly')) DEFAULT 'none',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS merchant_category_mappings (
    id TEXT PRIMARY KEY NOT NULL,
    merchant_keywords TEXT NOT NULL,
    category_id TEXT NOT NULL,
    subcategory_id TEXT,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_merchant_mappings_keywords ON merchant_category_mappings(merchant_keywords);
  CREATE INDEX IF NOT EXISTS idx_merchant_mappings_category ON merchant_category_mappings(category_id);

  CREATE TABLE IF NOT EXISTS llm_config (
    id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
    endpoint_url TEXT NOT NULL DEFAULT 'http://localhost:11434/api/generate',
    enabled INTEGER NOT NULL DEFAULT 0,
    model_name TEXT NOT NULL DEFAULT 'llama3',
    model_path TEXT NOT NULL DEFAULT 'llama-3.2-1b-q4.gguf',
    context_size INTEGER NOT NULL DEFAULT 4096,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recurring_config ${RECURRING_CONFIG_TABLE_DDL};

  CREATE INDEX IF NOT EXISTS idx_recurring_next_due ON recurring_config(next_due);
  CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_config(is_active);

  CREATE TABLE IF NOT EXISTS receipt_corrections (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'local-user',
    image_hash TEXT NOT NULL,
    predicted_json TEXT NOT NULL,
    corrected_json TEXT NOT NULL,
    fields_corrected TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_receipt_corrections_user_hash ON receipt_corrections(user_id, image_hash);

`;

export const CURRENT_DB_VERSION = 12;

// ============================================================
// Intégrité du schéma budgets : auto-réparation des colonnes manquantes.
// Certaines migrations (V11 pour account_id, V10 pour type, V2 pour les
// autres) enveloppent leur ALTER TABLE dans try/catch puis avancent quand même
// le db_version. Si un ALTER échoue sur l'appareil, la colonne n'est jamais
// recréée (les lancements suivants trouvent db_version≥N et sautent la
// migration) → toute requête ou INSERT budgets échoue avec "no such column",
// donnant des listes vides et des créations en échec, totalement silencieuses.
// Ce passe est exécuté à chaque lancement et ne fait rien si tout est en ordre.
// ============================================================
const BUDGETS_EXPECTED_COLUMNS: ReadonlyArray<{ name: string; ddl: string }> = [
  { name: 'account_id', ddl: 'TEXT REFERENCES accounts(id) ON DELETE SET NULL' },
  { name: 'type', ddl: "TEXT NOT NULL DEFAULT 'expense' CHECK(type IN ('expense', 'income'))" },
  { name: 'rollover', ddl: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'alert_triggered', ddl: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'alert_threshold', ddl: 'REAL NOT NULL DEFAULT 0.8' },
  { name: 'subcategory_id', ddl: 'TEXT REFERENCES subcategories(id) ON DELETE SET NULL' },
];

export async function ensureBudgetsColumns(db: SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(budgets)');
  const present = new Set(cols.map((c) => c.name));
  for (const { name, ddl } of BUDGETS_EXPECTED_COLUMNS) {
    if (present.has(name)) continue;
    try {
      await db.execAsync(`ALTER TABLE budgets ADD COLUMN ${name} ${ddl}`);
      console.log(`[schema] Colonne budgets manquante restaurée : ${name}`);
    } catch (e) {
      console.warn(`[schema] Impossible d'ajouter la colonne budgets ${name} :`, e);
    }
  }
}

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Créer toutes les tables d'abord
  await db.execAsync(SQL_CREATE_TABLES);

  // Lire la version actuelle
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'db_version'"
  );
  const currentVersion = row ? parseInt(row.value, 10) : 0;

  if (currentVersion < 1) {
    // Version 1 : déjà créée via SQL_CREATE_TABLES
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', '1')"
    );
  }

  if (currentVersion < 2) {
    // Migration V2 : ajouter les colonnes aux tables existantes
    try { await db.execAsync("ALTER TABLE transactions ADD COLUMN subcategory_id TEXT REFERENCES subcategories(id) ON DELETE SET NULL"); } catch (_) {}
    try { await db.execAsync("ALTER TABLE transactions ADD COLUMN merchant_name TEXT"); } catch (_) {}
    try { await db.execAsync("ALTER TABLE transactions ADD COLUMN receipt_data TEXT"); } catch (_) {}
    try { await db.execAsync("ALTER TABLE transactions ADD COLUMN import_source TEXT NOT NULL DEFAULT 'manual'"); } catch (_) {}
    try { await db.execAsync("ALTER TABLE transactions ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0"); } catch (_) {}
    try { await db.execAsync("ALTER TABLE transactions ADD COLUMN predicted_category_id TEXT"); } catch (_) {}

    try { await db.execAsync("ALTER TABLE budgets ADD COLUMN subcategory_id TEXT REFERENCES subcategories(id) ON DELETE SET NULL"); } catch (_) {}
    try { await db.execAsync("ALTER TABLE budgets ADD COLUMN alert_threshold REAL NOT NULL DEFAULT 0.8"); } catch (_) {}
    try { await db.execAsync("ALTER TABLE budgets ADD COLUMN alert_triggered INTEGER NOT NULL DEFAULT 0"); } catch (_) {}
    try { await db.execAsync("ALTER TABLE budgets ADD COLUMN rollover INTEGER NOT NULL DEFAULT 0"); } catch (_) {}

    try { await db.execAsync("CREATE INDEX IF NOT EXISTS idx_transactions_subcategory ON transactions(subcategory_id)"); } catch (_) {}
    try { await db.execAsync("CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_name)"); } catch (_) {}

    // Insérer la config LLM par défaut
    await db.runAsync(
      "INSERT OR IGNORE INTO llm_config (id) VALUES ('default')"
    );

    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', '2')"
    );
  }

  // Migration V3 : ajouter model_path à llm_config (pour modèles locaux)
  if (currentVersion < 3) {
    try { await db.execAsync("ALTER TABLE llm_config ADD COLUMN model_path TEXT NOT NULL DEFAULT 'llama-3.2-1b-q4.gguf'"); } catch (_) {}
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', '3')"
    );
  }

  // Migration V4 : palette + icônes de la refonte pour les catégories système
  if (currentVersion < 4) {
    const palette: Record<string, { color: string; icon: string }> = {
      'Alimentation': { color: '#006C49', icon: 'restaurant' },
      'Transport': { color: '#4059AA', icon: 'car' },
      'Logement': { color: '#006C49', icon: 'home' },
      'Services': { color: '#E29100', icon: 'flash' },
      'Loisirs': { color: '#855300', icon: 'game-controller' },
      'Santé': { color: '#BA1A1A', icon: 'medkit' },
      'Éducation': { color: '#4059AA', icon: 'book' },
      'Shopping': { color: '#BA1A1A', icon: 'bag-handle' },
      'Abonnements': { color: '#E29100', icon: 'film' },
      'Vêtements': { color: '#4059AA', icon: 'shirt' },
      'Cadeaux': { color: '#855300', icon: 'gift' },
      'Autres dépenses': { color: '#6C7A71', icon: 'ellipsis-horizontal' },
      'Salaire': { color: '#006C49', icon: 'cash' },
      'Freelance': { color: '#4059AA', icon: 'laptop' },
      'Ventes': { color: '#6FFBBE', icon: 'trending-up' },
      'Autres revenus': { color: '#6C7A71', icon: 'ellipsis-horizontal' },
    };
    for (const [name, cfg] of Object.entries(palette)) {
      try {
        await db.runAsync(
          "UPDATE categories SET color = ?, icon = ? WHERE name = ? AND is_system = 1",
          [cfg.color, cfg.icon, name]
        );
      } catch (_) {}
    }
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', '4')"
    );
  }

  // Migration V5 : multi-comptes + types de transactions étendus
  if (currentVersion < 5) {
    // Compte par défaut
    await db.runAsync(
      `INSERT OR IGNORE INTO accounts (id, name, type, initial_balance, currency, icon, color, is_archived, sort_order)
       VALUES ('account_main', 'Compte principal', 'cash', 0, 'MAD', 'wallet', '#006C49', 0, 0)`
    );

    // Reconstruire transactions pour le nouveau CHECK + colonnes account_id/goal_id.
    // Garde : vérifie la présence d'account_id (idempotent pour les bases neuves,
    // car SQL_CREATE_TABLES a déjà créé la nouvelle structure).
    const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transactions)');
    const hasAccountId = cols.some((c) => c.name === 'account_id');
    if (!hasAccountId) {
      // expo-sqlite ne force pas les foreign_keys par défaut → la reconstruction
      // (rename/create/copy/drop) est sûre. Elles seront activées après migration.
      await db.withExclusiveTransactionAsync(async (txn) => {
        await txn.execAsync('ALTER TABLE transactions RENAME TO transactions_old');
        await txn.execAsync(`CREATE TABLE transactions ${TRANSACTIONS_TABLE_DDL}`);
        await txn.execAsync(
          `INSERT INTO transactions (id, amount, type, category_id, subcategory_id, description, merchant_name, date, receipt_uri, receipt_data, import_source, is_recurring, predicted_category_id, account_id, goal_id, created_at, updated_at)
           SELECT id, amount, type, category_id, subcategory_id, description, merchant_name, date, receipt_uri, receipt_data, import_source, is_recurring, predicted_category_id, NULL, NULL, created_at, updated_at
           FROM transactions_old`
        );
        await txn.execAsync('DROP TABLE transactions_old');
        await txn.execAsync(TRANSACTIONS_INDEXES_DDL);
      });
    }

    // Rattacher les transactions existantes au compte principal
    await db.runAsync(
      "UPDATE transactions SET account_id = 'account_main' WHERE account_id IS NULL"
    );

    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', '5')"
    );
  }

  // Migration V6 : lier les transactions à un objectif (goals)
  if (currentVersion < 6) {
    try { await db.execAsync("ALTER TABLE transactions ADD COLUMN goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL"); } catch (_) {}
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', '6')"
    );
  }

  // Migration V7 : nouveau jeu de types de comptes (cash, credit_card, chambre)
  if (currentVersion < 7) {
    // Normaliser les anciens types supprimés vers des types valides (garde : idempotent)
    await db.runAsync("UPDATE accounts SET type = 'credit_card' WHERE type = 'bank'");
    await db.runAsync("UPDATE accounts SET type = 'cash' WHERE type = 'ewallet'");

    // SQLite ne permet pas de modifier un CHECK → reconstruire la table si besoin.
    // Garde : ne reconstruit que si le CHECK actuel n'a pas déjà 'chambre'
    // (base neuve déjà créée avec SQL_CREATE_TABLES → rien à faire).
    const accountsTable = await db.getFirstAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'accounts'"
    );
    if (accountsTable && !accountsTable.sql.includes('chambre')) {
      await db.withExclusiveTransactionAsync(async (txn) => {
        // Motif sûr : create_new → copy → drop → rename. On NE renomme PAS accounts
        // directement : ALTER TABLE ... RENAME réécrirait les FK des tables référentes
        // (transactions, goals, recurring_config) vers 'accounts_old', puis le DROP
        // les laisserait en échec ("no such table: accounts_old").
        await txn.execAsync(`CREATE TABLE accounts_v7_new (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'cash' CHECK(type IN ('cash', 'credit_card', 'chambre')),
          initial_balance REAL NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'MAD',
          icon TEXT NOT NULL DEFAULT 'wallet',
          color TEXT NOT NULL DEFAULT '#006C49',
          is_archived INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`);
        await txn.execAsync(
          `INSERT INTO accounts_v7_new (id, name, type, initial_balance, currency, icon, color, is_archived, sort_order, created_at, updated_at)
           SELECT id, name, type, initial_balance, currency, icon, color, is_archived, sort_order, created_at, updated_at FROM accounts`
        );
        await txn.execAsync('DROP TABLE accounts');
        await txn.execAsync('ALTER TABLE accounts_v7_new RENAME TO accounts');
      });
    }

    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', '7')"
    );
  }

  // Migration V8 : heure d'échéance des rappels (due_time, format HH:mm)
  if (currentVersion < 8) {
    try { await db.execAsync("ALTER TABLE reminders ADD COLUMN due_time TEXT"); } catch (_) {}
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', '8')"
    );
  }

  // Migration V9 : réparer les FK cassées par l'ancienne V7. Elle renommait
  // accounts → accounts_old (ce qui réécrit les FK des tables référentes vers
  // accounts_old) puis supprimait accounts_old → toute INSERT sur transactions/
  // goals/recurring_config échoue avec "no such table: main.accounts_old".
  // Garde : ne reconstruit que si une FK fait encore référence à accounts_old
  // (base neuve : rien à faire). Les listes de colonnes sont explicites car
  // goal_id a été ajoutée en dernier (V6) → SELECT * désalignerait les colonnes.
  if (currentVersion < 9) {
    const refs = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE sql LIKE '%accounts_old%'"
    );
    if (refs.length > 0) {
      await db.withExclusiveTransactionAsync(async (txn) => {
        // goals (référencée par transactions.goal_id)
        await txn.execAsync(`CREATE TABLE goals_v9_new ${GOALS_TABLE_DDL}`);
        await txn.execAsync(
          `INSERT INTO goals_v9_new (id, name, type, target_amount, current_amount, deadline, account_id, category_id, color, icon, is_archived, created_at, updated_at)
           SELECT id, name, type, target_amount, current_amount, deadline, account_id, category_id, color, icon, is_archived, created_at, updated_at FROM goals`
        );
        await txn.execAsync('DROP TABLE goals');
        await txn.execAsync('ALTER TABLE goals_v9_new RENAME TO goals');

        // recurring_config
        await txn.execAsync(`CREATE TABLE recurring_config_v9_new ${RECURRING_CONFIG_TABLE_DDL}`);
        await txn.execAsync(
          `INSERT INTO recurring_config_v9_new (id, description, amount, type, category_id, subcategory_id, merchant_name, frequency, interval, next_due, is_active, end_date, account_id, created_at, updated_at)
           SELECT id, description, amount, type, category_id, subcategory_id, merchant_name, frequency, interval, next_due, is_active, end_date, account_id, created_at, updated_at FROM recurring_config`
        );
        await txn.execAsync('DROP TABLE recurring_config');
        await txn.execAsync('ALTER TABLE recurring_config_v9_new RENAME TO recurring_config');
        await txn.execAsync(
          'CREATE INDEX IF NOT EXISTS idx_recurring_next_due ON recurring_config(next_due); ' +
          'CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_config(is_active);'
        );

        // transactions (goal_id ajoutée en V6 → dernière colonne sur disque)
        await txn.execAsync(`CREATE TABLE transactions_v9_new ${TRANSACTIONS_TABLE_DDL}`);
        await txn.execAsync(
          `INSERT INTO transactions_v9_new (id, amount, type, category_id, subcategory_id, description, merchant_name, date, receipt_uri, receipt_data, import_source, is_recurring, predicted_category_id, account_id, goal_id, created_at, updated_at)
           SELECT id, amount, type, category_id, subcategory_id, description, merchant_name, date, receipt_uri, receipt_data, import_source, is_recurring, predicted_category_id, account_id, goal_id, created_at, updated_at FROM transactions`
        );
        await txn.execAsync('DROP TABLE transactions');
        await txn.execAsync('ALTER TABLE transactions_v9_new RENAME TO transactions');
        await txn.execAsync(TRANSACTIONS_INDEXES_DDL);
      });
    }
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', '9')"
    );
  }

  // Migration V10 : ajouter le champ type aux budgets (expense/income pour les économies)
  if (currentVersion < 10) {
    try {
      await db.execAsync("ALTER TABLE budgets ADD COLUMN type TEXT NOT NULL DEFAULT 'expense' CHECK(type IN ('expense', 'income'))");
    } catch (_) {}
    // Mettre à jour la contrainte UNIQUE pour inclure le type
    // SQLite ne permet pas de modifier UNIQUE via ALTER → recréer la table si nécessaire
    const budgetsInfo = await db.getFirstAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'budgets'"
    );
    if (budgetsInfo && budgetsInfo.sql.includes('UNIQUE(category_id, month, year)') && !budgetsInfo.sql.includes('UNIQUE(category_id, month, year, type)')) {
      await db.withExclusiveTransactionAsync(async (txn) => {
        await txn.execAsync(`CREATE TABLE budgets_v10_new (
          id TEXT PRIMARY KEY NOT NULL,
          category_id TEXT NOT NULL,
          subcategory_id TEXT,
          type TEXT NOT NULL DEFAULT 'expense' CHECK(type IN ('expense', 'income')),
          month INTEGER NOT NULL CHECK(month >= 1 AND month <= 12),
          year INTEGER NOT NULL,
          amount REAL NOT NULL CHECK(amount > 0),
          alert_threshold REAL NOT NULL DEFAULT 0.8,
          alert_triggered INTEGER NOT NULL DEFAULT 0,
          rollover INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
          FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL,
          UNIQUE(category_id, month, year, type)
        )`);
        await txn.execAsync(
          `INSERT INTO budgets_v10_new (id, category_id, subcategory_id, type, month, year, amount, alert_threshold, alert_triggered, rollover, created_at, updated_at)
           SELECT id, category_id, subcategory_id, 'expense', month, year, amount, alert_threshold, alert_triggered, rollover, created_at, updated_at FROM budgets`
        );
        await txn.execAsync('DROP TABLE budgets');
        await txn.execAsync('ALTER TABLE budgets_v10_new RENAME TO budgets');
      });
    }
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', '10')"
    );
  }

  // Migration V11 : ajouter account_id aux budgets pour supporter les budgets par compte
  if (currentVersion < 11) {
    try {
      await db.execAsync("ALTER TABLE budgets ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL");
    } catch (_) {}
    // Mettre à jour la contrainte UNIQUE pour inclure account_id (optionnel - permet budgets globaux et par compte)
    const budgetsInfo = await db.getFirstAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'budgets'"
    );
    // Note: SQLite ne permet pas de modifier UNIQUE via ALTER, mais on peut accepter des budgets
    // avec le même category_id/month/year/type si account_id est différent (NULL vs un compte)
    // On garde l'UNIQUE existante, ce qui veut dire qu'on ne peut avoir qu'un budget par
    // category/month/year/type GLOBAL (account_id=NULL) OU par compte (account_id=X)
    // C'est le comportement souhaité.
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', '11')"
    );
  }

  // Migration V12 : table des corrections de reçus (100% locale).
  // Créée par SQL_CREATE_TABLES ; on n'a qu'à avancer la version.
  if (currentVersion < 12) {
    try {
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS receipt_corrections (" +
        "id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL DEFAULT 'local-user', " +
        "image_hash TEXT NOT NULL, predicted_json TEXT NOT NULL, corrected_json TEXT NOT NULL, " +
        "fields_corrected TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))"
      );
      await db.execAsync(
        "CREATE INDEX IF NOT EXISTS idx_receipt_corrections_user_hash ON receipt_corrections(user_id, image_hash)"
      );
    } catch (e) {
      console.warn('[schema] Migration V12 (scan de reçus) :', e);
    }
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', '12')"
    );
  }
}
