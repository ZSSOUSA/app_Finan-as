const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = uuidv4();
  return { accessToken, refreshToken };
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    const { rows: [user] } = await query(
      `INSERT INTO users (name, email, password_hash, avatar_initials)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, avatar_initials`,
      [name, email, passwordHash, initials]
    );

    // Cria carteiras padrão para o novo usuário
    await query(`
      INSERT INTO wallets (user_id, name, type, balance, color, icon) VALUES
        ($1, 'Conta Corrente', 'checking', 0, '#3b82f6', '🏦'),
        ($1, 'Poupança',       'savings',  0, '#22c55e', '💵'),
        ($1, 'Carteira',       'cash',     0, '#f59e0b', '👛')
    `, [user.id]);

    // Cria categorias padrão
    const defaultCats = [
      ['Salário','income','💼','#22c55e'],['Freelance','income','💻','#10b981'],
      ['Alimentação','expense','🛒','#ef4444'],['Moradia','expense','🏠','#3b82f6'],
      ['Transporte','expense','🚗','#f59e0b'],['Lazer','expense','🎮','#a855f7'],
      ['Saúde','expense','💊','#ec4899'],['Outros','both','📂','#6b7280'],
    ];
    for (const [name, type, icon, color] of defaultCats) {
      await query(
        'INSERT INTO categories (user_id,name,type,icon,color,is_default) VALUES ($1,$2,$3,$4,$5,true)',
        [user.id, name, type, icon, color]
      );
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
      [user.id, refreshToken, expiresAt]
    );

    res.status(201).json({
      message: 'Conta criada com sucesso',
      user: { id: user.id, name: user.name, email: user.email, initials: user.avatar_initials },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await query(
      'SELECT id, name, email, password_hash, avatar_initials, currency FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

    const { accessToken, refreshToken } = generateTokens(user.id);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
      [user.id, refreshToken, expiresAt]
    );

    res.json({
      message: 'Login realizado com sucesso',
      user: { id: user.id, name: user.name, email: user.email, initials: user.avatar_initials, currency: user.currency },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token obrigatório' });

    const { rows } = await query(
      'SELECT * FROM refresh_tokens WHERE token=$1 AND expires_at > NOW()',
      [refreshToken]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Refresh token inválido ou expirado' });

    await query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(rows[0].user_id);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
      [rows[0].user_id, newRefreshToken, expiresAt]
    );

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);
    res.json({ message: 'Logout realizado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { register, login, refresh, logout, me };
