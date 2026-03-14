const { query } = require('../config/database');

// GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1, limit = 20,
      type, category_id, wallet_id,
      start_date, end_date,
      month, year,
      search,
    } = req.query;

    const conditions = ['t.user_id = $1'];
    const params = [userId];
    let p = 2;

    if (type)        { conditions.push(`t.type = $${p++}`);                    params.push(type); }
    if (category_id) { conditions.push(`t.category_id = $${p++}`);             params.push(category_id); }
    if (wallet_id)   { conditions.push(`t.wallet_id = $${p++}`);               params.push(wallet_id); }
    if (start_date)  { conditions.push(`t.date >= $${p++}`);                   params.push(start_date); }
    if (end_date)    { conditions.push(`t.date <= $${p++}`);                   params.push(end_date); }
    if (month && year) {
      conditions.push(`EXTRACT(MONTH FROM t.date) = $${p++}`);  params.push(month);
      conditions.push(`EXTRACT(YEAR  FROM t.date) = $${p++}`);  params.push(year);
    }
    if (search) { conditions.push(`t.description ILIKE $${p++}`); params.push(`%${search}%`); }

    const where = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const { rows: transactions } = await query(`
      SELECT
        t.id, t.type, t.amount, t.description, t.date, t.notes, t.recurring,
        c.id   AS category_id,   c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
        w.id   AS wallet_id,     w.name AS wallet_name,   w.icon AS wallet_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets     w ON t.wallet_id   = w.id
      WHERE ${where}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT $${p++} OFFSET $${p++}
    `, [...params, limit, offset]);

    const { rows: [count] } = await query(
      `SELECT COUNT(*) FROM transactions t WHERE ${where}`,
      params.slice(0, p - 2)
    );

    res.json({
      data: transactions,
      pagination: {
        total: parseInt(count.count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count.count / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
};

// GET /api/transactions/summary
const getSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    const { rows } = await query(`
      SELECT
        type,
        SUM(amount) AS total,
        COUNT(*)    AS count
      FROM transactions
      WHERE user_id = $1
        AND EXTRACT(MONTH FROM date) = $2
        AND EXTRACT(YEAR  FROM date) = $3
      GROUP BY type
    `, [userId, month, year]);

    const summary = { income: 0, expense: 0, balance: 0, income_count: 0, expense_count: 0 };
    rows.forEach(r => {
      if (r.type === 'income')  { summary.income  = parseFloat(r.total); summary.income_count  = parseInt(r.count); }
      if (r.type === 'expense') { summary.expense = parseFloat(r.total); summary.expense_count = parseInt(r.count); }
    });
    summary.balance = summary.income - summary.expense;

    // Gastos por categoria
    const { rows: byCategory } = await query(`
      SELECT
        c.id, c.name, c.icon, c.color,
        SUM(t.amount) AS total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
        AND t.type = 'expense'
        AND EXTRACT(MONTH FROM t.date) = $2
        AND EXTRACT(YEAR  FROM t.date) = $3
      GROUP BY c.id, c.name, c.icon, c.color
      ORDER BY total DESC
    `, [userId, month, year]);

    // Evolução mensal (últimos 6 meses)
    const { rows: monthly } = await query(`
      SELECT
        EXTRACT(MONTH FROM date)::int AS month,
        EXTRACT(YEAR  FROM date)::int AS year,
        type,
        SUM(amount) AS total
      FROM transactions
      WHERE user_id = $1
        AND date >= NOW() - INTERVAL '6 months'
      GROUP BY month, year, type
      ORDER BY year, month
    `, [userId]);

    res.json({ summary, by_category: byCategory, monthly });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
};

// POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { wallet_id, category_id, type, amount, description, date, notes, recurring, recurring_period } = req.body;

    const { rows: [tx] } = await query(`
      INSERT INTO transactions (user_id, wallet_id, category_id, type, amount, description, date, notes, recurring, recurring_period)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [userId, wallet_id, category_id, type, amount, description, date, notes || null, recurring || false, recurring_period || null]);

    // Atualiza saldo da carteira
    const delta = type === 'income' ? amount : -amount;
    await query('UPDATE wallets SET balance = balance + $1 WHERE id = $2 AND user_id = $3', [delta, wallet_id, userId]);

    res.status(201).json({ data: tx, message: 'Transação criada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar transação' });
  }
};

// PUT /api/transactions/:id
const updateTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { category_id, type, amount, description, date, notes } = req.body;

    // Reverte saldo antigo
    const { rows: [old] } = await query('SELECT * FROM transactions WHERE id=$1 AND user_id=$2', [id, userId]);
    if (!old) return res.status(404).json({ error: 'Transação não encontrada' });

    const oldDelta = old.type === 'income' ? -old.amount : old.amount;
    await query('UPDATE wallets SET balance = balance + $1 WHERE id=$2', [oldDelta, old.wallet_id]);

    // Aplica novo saldo
    const newDelta = type === 'income' ? parseFloat(amount) : -parseFloat(amount);
    await query('UPDATE wallets SET balance = balance + $1 WHERE id=$2', [newDelta, old.wallet_id]);

    const { rows: [tx] } = await query(`
      UPDATE transactions
      SET category_id=$1, type=$2, amount=$3, description=$4, date=$5, notes=$6
      WHERE id=$7 AND user_id=$8 RETURNING *
    `, [category_id, type, amount, description, date, notes, id, userId]);

    res.json({ data: tx, message: 'Transação atualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
};

// DELETE /api/transactions/:id
const deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { rows: [tx] } = await query('SELECT * FROM transactions WHERE id=$1 AND user_id=$2', [id, userId]);
    if (!tx) return res.status(404).json({ error: 'Transação não encontrada' });

    const delta = tx.type === 'income' ? -tx.amount : tx.amount;
    await query('UPDATE wallets SET balance = balance + $1 WHERE id=$2', [delta, tx.wallet_id]);
    await query('DELETE FROM transactions WHERE id=$1', [id]);

    res.json({ message: 'Transação removida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover transação' });
  }
};

module.exports = { getTransactions, getSummary, createTransaction, updateTransaction, deleteTransaction };
