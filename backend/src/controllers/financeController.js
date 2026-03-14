const { query } = require('../config/database');

// ─── WALLETS ──────────────────────────────────────────────────────────────────

const getWallets = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM wallets WHERE user_id=$1 AND is_active=true ORDER BY created_at',
      [req.user.id]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar carteiras' });
  }
};

const createWallet = async (req, res) => {
  try {
    const { name, type, balance = 0, color = '#3b82f6', icon = '🏦' } = req.body;
    const { rows: [w] } = await query(
      'INSERT INTO wallets (user_id,name,type,balance,color,icon) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.user.id, name, type, balance, color, icon]
    );
    res.status(201).json({ data: w });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar carteira' });
  }
};

const updateWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;
    const { rows: [w] } = await query(
      'UPDATE wallets SET name=$1,color=$2,icon=$3 WHERE id=$4 AND user_id=$5 RETURNING *',
      [name, color, icon, id, req.user.id]
    );
    if (!w) return res.status(404).json({ error: 'Carteira não encontrada' });
    res.json({ data: w });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar carteira' });
  }
};

const transfer = async (req, res) => {
  const client = require('../config/database').pool;
  const conn = await client.connect();
  try {
    const { from_wallet_id, to_wallet_id, amount, description, date } = req.body;
    const userId = req.user.id;

    await conn.query('BEGIN');
    await conn.query('UPDATE wallets SET balance=balance-$1 WHERE id=$2 AND user_id=$3', [amount, from_wallet_id, userId]);
    await conn.query('UPDATE wallets SET balance=balance+$1 WHERE id=$2 AND user_id=$3', [amount, to_wallet_id, userId]);
    const { rows: [t] } = await conn.query(
      'INSERT INTO transfers (user_id,from_wallet_id,to_wallet_id,amount,description,date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [userId, from_wallet_id, to_wallet_id, amount, description || 'Transferência', date || new Date().toISOString().split('T')[0]]
    );
    await conn.query('COMMIT');
    res.status(201).json({ data: t, message: 'Transferência realizada' });
  } catch (err) {
    await conn.query('ROLLBACK');
    res.status(500).json({ error: 'Erro na transferência' });
  } finally {
    conn.release();
  }
};

const getTotalBalance = async (req, res) => {
  try {
    const { rows: [r] } = await query(
      "SELECT COALESCE(SUM(balance),0) AS total FROM wallets WHERE user_id=$1 AND is_active=true AND type != 'credit'",
      [req.user.id]
    );
    res.json({ total: parseFloat(r.total) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao calcular saldo' });
  }
};

// ─── GOALS ────────────────────────────────────────────────────────────────────

const getGoals = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar metas' });
  }
};

const createGoal = async (req, res) => {
  try {
    const { name, target_amount, current_amount = 0, deadline, icon = '🎯', color = '#3b82f6', wallet_id } = req.body;
    const { rows: [g] } = await query(
      'INSERT INTO goals (user_id,name,target_amount,current_amount,deadline,icon,color,wallet_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [req.user.id, name, target_amount, current_amount, deadline, icon, color, wallet_id || null]
    );
    res.status(201).json({ data: g });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
};

const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, target_amount, current_amount, deadline, icon, color, is_completed } = req.body;
    const { rows: [g] } = await query(`
      UPDATE goals SET name=$1,target_amount=$2,current_amount=$3,deadline=$4,icon=$5,color=$6,is_completed=$7
      WHERE id=$8 AND user_id=$9 RETURNING *
    `, [name, target_amount, current_amount, deadline, icon, color, is_completed, id, req.user.id]);
    if (!g) return res.status(404).json({ error: 'Meta não encontrada' });
    res.json({ data: g });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
};

const deleteGoal = async (req, res) => {
  try {
    await query('DELETE FROM goals WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Meta removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover meta' });
  }
};

// ─── BUDGETS ──────────────────────────────────────────────────────────────────

const getBudgets = async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
    const { rows } = await query(`
      SELECT
        b.id, b.month, b.year, b.limit_amount,
        c.id AS category_id, c.name, c.icon, c.color,
        COALESCE(SUM(t.amount),0) AS spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t
        ON t.category_id = c.id AND t.user_id = b.user_id
        AND t.type = 'expense'
        AND EXTRACT(MONTH FROM t.date) = $2
        AND EXTRACT(YEAR  FROM t.date) = $3
      WHERE b.user_id=$1 AND b.month=$2 AND b.year=$3
      GROUP BY b.id, c.id, c.name, c.icon, c.color
      ORDER BY c.name
    `, [req.user.id, month, year]);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar orçamentos' });
  }
};

const upsertBudget = async (req, res) => {
  try {
    const { category_id, month, year, limit_amount } = req.body;
    const { rows: [b] } = await query(`
      INSERT INTO budgets (user_id,category_id,month,year,limit_amount)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (user_id,category_id,month,year)
      DO UPDATE SET limit_amount=$5 RETURNING *
    `, [req.user.id, category_id, month, year, limit_amount]);
    res.json({ data: b });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar orçamento' });
  }
};

const getCategories = async (req, res) => {
  try {
    const { type } = req.query;
    let q = 'SELECT * FROM categories WHERE user_id=$1';
    const params = [req.user.id];
    if (type) { q += ' AND (type=$2 OR type=\'both\')'; params.push(type); }
    q += ' ORDER BY is_default DESC, name';
    const { rows } = await query(q, params);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, currency, email_notifications, budget_alerts, two_factor } = req.body;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const { rows: [u] } = await query(`
      UPDATE users SET name=$1,avatar_initials=$2,currency=$3,
        email_notifications=$4,budget_alerts=$5,two_factor=$6
      WHERE id=$7 RETURNING id,name,email,avatar_initials,currency,email_notifications,budget_alerts,two_factor
    `, [name, initials, currency || 'BRL', email_notifications, budget_alerts, two_factor, req.user.id]);
    res.json({ data: u, message: 'Perfil atualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
};

module.exports = {
  getWallets, createWallet, updateWallet, transfer, getTotalBalance,
  getGoals, createGoal, updateGoal, deleteGoal,
  getBudgets, upsertBudget,
  getCategories,
  updateProfile,
};
