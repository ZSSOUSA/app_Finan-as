const { pool } = require('./database');
require('dotenv').config();

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🚀 Iniciando migrations...');

    // USERS
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_initials VARCHAR(5),
        currency VARCHAR(10) DEFAULT 'BRL',
        email_notifications BOOLEAN DEFAULT true,
        budget_alerts BOOLEAN DEFAULT true,
        two_factor BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela users criada');

    // WALLETS (carteiras/contas)
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(30) NOT NULL CHECK (type IN ('checking','savings','credit','investment','cash')),
        balance NUMERIC(15,2) DEFAULT 0.00,
        color VARCHAR(20) DEFAULT '#3b82f6',
        icon VARCHAR(10) DEFAULT '🏦',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela wallets criada');

    // CATEGORIES
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(80) NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense','both')),
        icon VARCHAR(10) DEFAULT '📁',
        color VARCHAR(20) DEFAULT '#6b7280',
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela categories criada');

    // TRANSACTIONS
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense','transfer')),
        amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
        description VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        recurring BOOLEAN DEFAULT false,
        recurring_period VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela transactions criada');

    // GOALS
    await client.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
        name VARCHAR(150) NOT NULL,
        target_amount NUMERIC(15,2) NOT NULL,
        current_amount NUMERIC(15,2) DEFAULT 0.00,
        deadline DATE,
        icon VARCHAR(10) DEFAULT '🎯',
        color VARCHAR(20) DEFAULT '#3b82f6',
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela goals criada');

    // BUDGETS (orçamentos por categoria)
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
        year INTEGER NOT NULL,
        limit_amount NUMERIC(15,2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, category_id, month, year)
      );
    `);
    console.log('✅ Tabela budgets criada');

    // TRANSFERS (transferências entre carteiras)
    await client.query(`
      CREATE TABLE IF NOT EXISTS transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        from_wallet_id UUID NOT NULL REFERENCES wallets(id),
        to_wallet_id UUID NOT NULL REFERENCES wallets(id),
        amount NUMERIC(15,2) NOT NULL,
        description VARCHAR(255),
        date DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela transfers criada');

    // REFRESH TOKENS
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(512) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela refresh_tokens criada');

    // INDEXES para performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
      CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month, year);
    `);
    console.log('✅ Indexes criados');

    // TRIGGER: atualiza updated_at automaticamente
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);
    for (const tbl of ['users','wallets','transactions','goals','budgets']) {
      await client.query(`
        DROP TRIGGER IF EXISTS trg_${tbl}_updated_at ON ${tbl};
        CREATE TRIGGER trg_${tbl}_updated_at
          BEFORE UPDATE ON ${tbl}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      `);
    }
    console.log('✅ Triggers criados');

    await client.query('COMMIT');
    console.log('\n✨ Migrations concluídas com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

migrate().catch(() => process.exit(1));
