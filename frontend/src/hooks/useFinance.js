import { useState, useEffect, useCallback } from 'react';
import { transactionService, walletService, goalService, budgetService, categoryService } from '../services/api';
import toast from 'react-hot-toast';

// Hook genérico para fetch com loading/error
const useFetch = (fetchFn, deps = []) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchFn();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
};

// Dashboard summary
export const useSummary = (month, year) =>
  useFetch(() => transactionService.summary({ month, year }), [month, year]);

// Transactions
export const useTransactions = (filters = {}) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transactionService.list(filters);
      setData(res.data);
    } catch (_) {
      toast.error('Erro ao carregar transações');
    } finally { setLoading(false); }
  }, [JSON.stringify(filters)]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const createTx = async (payload) => {
    const res = await transactionService.create(payload);
    toast.success('Transação adicionada!');
    load();
    return res.data;
  };

  const deleteTx = async (id) => {
    await transactionService.delete(id);
    toast.success('Transação removida');
    load();
  };

  const updateTx = async (id, payload) => {
    await transactionService.update(id, payload);
    toast.success('Transação atualizada');
    load();
  };

  return { data, loading, refetch: load, createTx, deleteTx, updateTx };
};

// Wallets
export const useWallets = () => {
  const { data, loading, refetch } = useFetch(() => walletService.list());
  const wallets = data?.data || [];

  const doTransfer = async (payload) => {
    await walletService.transfer(payload);
    toast.success('Transferência realizada!');
    refetch();
  };

  return { wallets, loading, refetch, doTransfer };
};

// Goals
export const useGoals = () => {
  const { data, loading, refetch } = useFetch(() => goalService.list());
  const goals = data?.data || [];

  const createGoal = async (payload) => {
    await goalService.create(payload);
    toast.success('Meta criada!');
    refetch();
  };

  const updateGoal = async (id, payload) => {
    await goalService.update(id, payload);
    toast.success('Meta atualizada!');
    refetch();
  };

  const deleteGoal = async (id) => {
    await goalService.delete(id);
    toast.success('Meta removida');
    refetch();
  };

  return { goals, loading, refetch, createGoal, updateGoal, deleteGoal };
};

// Budgets
export const useBudgets = (month, year) => {
  const { data, loading, refetch } = useFetch(
    () => budgetService.list({ month, year }), [month, year]
  );
  const budgets = data?.data || [];

  const saveBudget = async (payload) => {
    await budgetService.upsert(payload);
    toast.success('Orçamento salvo!');
    refetch();
  };

  return { budgets, loading, refetch, saveBudget };
};

// Categories
export const useCategories = (type) =>
  useFetch(() => categoryService.list(type ? { type } : {}), [type]);
