const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middlewares/auth');
const auth = require('../controllers/authController');
const tx = require('../controllers/transactionController');
const fin = require('../controllers/financeController');

const router = express.Router();

// ─── AUTH ─────────────────────────────────────────────────────────────────────
router.post('/auth/register', [
  body('name').trim().notEmpty().withMessage('Nome obrigatório'),
  body('email').isEmail().withMessage('E-mail inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha mínima: 6 caracteres'),
], auth.register);

router.post('/auth/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], auth.login);

router.post('/auth/refresh', auth.refresh);
router.post('/auth/logout',  auth.logout);
router.get('/auth/me', authenticate, auth.me);

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
router.get('/transactions',         authenticate, tx.getTransactions);
router.get('/transactions/summary', authenticate, tx.getSummary);
router.post('/transactions', authenticate, [
  body('wallet_id').isUUID(),
  body('type').isIn(['income','expense']),
  body('amount').isFloat({ gt: 0 }),
  body('description').trim().notEmpty(),
  body('date').isDate(),
], tx.createTransaction);
router.put('/transactions/:id',    authenticate, tx.updateTransaction);
router.delete('/transactions/:id', authenticate, tx.deleteTransaction);

// ─── WALLETS ──────────────────────────────────────────────────────────────────
router.get('/wallets',         authenticate, fin.getWallets);
router.get('/wallets/balance', authenticate, fin.getTotalBalance);
router.post('/wallets',        authenticate, fin.createWallet);
router.put('/wallets/:id',     authenticate, fin.updateWallet);
router.post('/wallets/transfer', authenticate, [
  body('from_wallet_id').isUUID(),
  body('to_wallet_id').isUUID(),
  body('amount').isFloat({ gt: 0 }),
], fin.transfer);

// ─── GOALS ────────────────────────────────────────────────────────────────────
router.get('/goals',        authenticate, fin.getGoals);
router.post('/goals',       authenticate, fin.createGoal);
router.put('/goals/:id',    authenticate, fin.updateGoal);
router.delete('/goals/:id', authenticate, fin.deleteGoal);

// ─── BUDGETS & CATEGORIES ─────────────────────────────────────────────────────
router.get('/budgets',     authenticate, fin.getBudgets);
router.post('/budgets',    authenticate, fin.upsertBudget);
router.get('/categories',  authenticate, fin.getCategories);

// ─── PROFILE ──────────────────────────────────────────────────────────────────
router.put('/profile', authenticate, fin.updateProfile);

module.exports = router;
