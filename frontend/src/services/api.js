import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Injeta o token em toda requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token quando expirar
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        localStorage.setItem('accessToken',  data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── SERVIÇOS ─────────────────────────────────────────────────────────────────

export const authService = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout:   ()     => api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }),
  me:       ()     => api.get('/auth/me'),
};

export const transactionService = {
  list:    (params) => api.get('/transactions', { params }),
  summary: (params) => api.get('/transactions/summary', { params }),
  create:  (data)   => api.post('/transactions', data),
  update:  (id, data) => api.put(`/transactions/${id}`, data),
  delete:  (id)     => api.delete(`/transactions/${id}`),
};

export const walletService = {
  list:     ()       => api.get('/wallets'),
  balance:  ()       => api.get('/wallets/balance'),
  create:   (data)   => api.post('/wallets', data),
  update:   (id, d)  => api.put(`/wallets/${id}`, d),
  transfer: (data)   => api.post('/wallets/transfer', data),
};

export const goalService = {
  list:   ()          => api.get('/goals'),
  create: (data)      => api.post('/goals', data),
  update: (id, data)  => api.put(`/goals/${id}`, data),
  delete: (id)        => api.delete(`/goals/${id}`),
};

export const budgetService = {
  list:   (params) => api.get('/budgets', { params }),
  upsert: (data)   => api.post('/budgets', data),
};

export const categoryService = {
  list: (params) => api.get('/categories', { params }),
};

export const profileService = {
  update: (data) => api.put('/profile', data),
};

export default api;
