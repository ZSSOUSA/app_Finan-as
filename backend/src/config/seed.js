const { pool } = require('./database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🌱 Iniciando seed de dados demo...');

    // Usuário demo
    const hash = await bcrypt.hash('123456', 12);
    const { rows: [user] } = await client.query(`
      INSERT INTO users (name, email, password_hash, avatar_initials)
      VALUES ('João Silva', 'demo@financas.com', $1, 'JS')
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
      RETURNING id
    `, [hash]);
    const userId = user.id;
    console.log('✅ Usuário demo criado: demo@financas.com / 123456');

    // Categorias padrão
    const cats = [
      { name: 'Salário',       type: 'income',  icon: '💼', color: '#22c55e' },
      { name: 'Freelance',     type: 'income',  icon: '💻', color: '#10b981' },
      { name: 'Investimentos', type: 'income',  icon: '📈', color: '#6366f1' },
      { name: 'Alimentação',   type: 'expense', icon: '🛒', color: '#ef4444' },
      { name: 'Moradia',       type: 'expense', icon: '🏠', color: '#3b82f6' },
      { name: 'Transporte',    type: 'expense', icon: '🚗', color: '#f59e0b' },
      { name: 'Lazer',         type: 'expense', icon: '🎮', color: '#a855f7' },
      { name: 'Saúde',         type: 'expense', icon: '💊', color: '#ec4899' },
      { name: 'Educação',      type: 'expense', icon: '📚', color: '#0ea5e9' },
      { name: 'Assinaturas',   type: 'expense', icon: '📱', color: '#8b5cf6' },
      { name: 'Outros',        type: 'both',    icon: '📂', color: '#6b7280' },
    ];
    const catIds = {};
    for (const c of cats) {
      const { rows: [cat] } = await client.query(`
        INSERT INTO categories (user_id, name, type, icon, color, is_default)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT DO NOTHING RETURNING id, name
      `, [userId, c.name, c.type, c.icon, c.color]);
      if (cat) catIds[cat.name] = cat.id;
    }
    console.log('✅ Categorias padrão criadas');

    // Carteiras
    const { rows: wallets } = await client.query(`
      INSERT INTO wallets (user_id, name, type, balance, color, icon) VALUES
        ($1, 'Conta Corrente', 'checking',   5430.20, '#3b82f6', '🏦'),
        ($1, 'Poupança',       'savings',    3200.00, '#22c55e', '💵'),
        ($1, 'Cartão Crédito', 'credit',    -782.70,  '#a855f7', '💳'),
        ($1, 'Carteira',       'cash',       417.00,  '#f59e0b', '👛')
      ON CONFLICT DO NOTHING RETURNING id, name
    `, [userId]);
    const walletIds = {};
    wallets.forEach(w => walletIds[w.name] = w.id);
    console.log('✅ Carteiras criadas');

    // Transações dos últimos 3 meses
    const checkingId = walletIds['Conta Corrente'];
    const txs = [
      // Março
      { type:'income',  amt:4500.00, desc:'Salário mensal',        cat:'Salário',     date:'2026-03-05' },
      { type:'income',  amt:1200.00, desc:'Freelance - App design', cat:'Freelance',   date:'2026-03-05' },
      { type:'expense', amt:1200.00, desc:'Aluguel',               cat:'Moradia',     date:'2026-03-01' },
      { type:'expense', amt:187.40,  desc:'Supermercado Extra',     cat:'Alimentação', date:'2026-03-14' },
      { type:'expense', amt:64.90,   desc:'iFood - Jantar',         cat:'Alimentação', date:'2026-03-12' },
      { type:'expense', amt:55.90,   desc:'Netflix + Spotify',      cat:'Assinaturas', date:'2026-03-03' },
      { type:'expense', amt:180.00,  desc:'Combustível',            cat:'Transporte',  date:'2026-03-08' },
      { type:'expense', amt:95.00,   desc:'Farmácia',               cat:'Saúde',       date:'2026-03-11' },
      // Fevereiro
      { type:'income',  amt:4500.00, desc:'Salário mensal',        cat:'Salário',     date:'2026-02-05' },
      { type:'expense', amt:1200.00, desc:'Aluguel',               cat:'Moradia',     date:'2026-02-01' },
      { type:'expense', amt:320.50,  desc:'Supermercado',          cat:'Alimentação', date:'2026-02-15' },
      { type:'expense', amt:210.00,  desc:'Jantar fora',           cat:'Alimentação', date:'2026-02-20' },
      { type:'expense', amt:55.90,   desc:'Netflix + Spotify',     cat:'Assinaturas', date:'2026-02-03' },
      { type:'expense', amt:150.00,  desc:'Uber/99',               cat:'Transporte',  date:'2026-02-18' },
      // Janeiro
      { type:'income',  amt:4500.00, desc:'Salário mensal',        cat:'Salário',     date:'2026-01-05' },
      { type:'income',  amt:800.00,  desc:'Venda equipamento',     cat:'Outros',      date:'2026-01-22' },
      { type:'expense', amt:1200.00, desc:'Aluguel',               cat:'Moradia',     date:'2026-01-01' },
      { type:'expense', amt:280.00,  desc:'Supermercado',          cat:'Alimentação', date:'2026-01-14' },
      { type:'expense', amt:350.00,  desc:'Curso online',          cat:'Educação',    date:'2026-01-08' },
      { type:'expense', amt:55.90,   desc:'Netflix + Spotify',     cat:'Assinaturas', date:'2026-01-03' },
    ];
    for (const t of txs) {
      if (!catIds[t.cat]) continue;
      await client.query(`
        INSERT INTO transactions (user_id, wallet_id, category_id, type, amount, description, date)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [userId, checkingId, catIds[t.cat], t.type, t.amt, t.desc, t.date]);
    }
    console.log('✅ Transações demo criadas');

    // Metas
    await client.query(`
      INSERT INTO goals (user_id, name, target_amount, current_amount, deadline, icon, color) VALUES
        ($1, 'Viagem para Europa',        15000, 6750,  '2026-12-31', '🏖️', '#3b82f6'),
        ($1, 'Carro novo',                40000, 9200,  '2027-06-30', '🚗', '#f59e0b'),
        ($1, 'Entrada do apartamento',    80000, 9600,  '2028-12-31', '🏠', '#a855f7'),
        ($1, 'Fundo de emergência',       18000, 14040, '2026-06-30', '📈', '#22c55e')
      ON CONFLICT DO NOTHING
    `, [userId]);
    console.log('✅ Metas criadas');

    // Orçamentos março/2026
    const budgetsData = [
      { cat: 'Alimentação', limit: 800  },
      { cat: 'Moradia',     limit: 1400 },
      { cat: 'Transporte',  limit: 400  },
      { cat: 'Lazer',       limit: 300  },
      { cat: 'Saúde',       limit: 200  },
      { cat: 'Assinaturas', limit: 100  },
    ];
    for (const b of budgetsData) {
      if (!catIds[b.cat]) continue;
      await client.query(`
        INSERT INTO budgets (user_id, category_id, month, year, limit_amount)
        VALUES ($1,$2,3,2026,$3) ON CONFLICT DO NOTHING
      `, [userId, catIds[b.cat], b.limit]);
    }
    console.log('✅ Orçamentos criados');

    await client.query('COMMIT');
    console.log('\n✨ Seed concluído! Acesse com: demo@financas.com / 123456');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro no seed:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

seed().catch(() => process.exit(1));
