import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout      from './components/Layout';
import Login       from './pages/Login';
import Dashboard   from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Wallets     from './pages/Wallets';
import Budgets     from './pages/Budgets';
import Goals       from './pages/Goals';
import Reports     from './pages/Reports';
import Profile     from './pages/Profile';

// Protege rotas que precisam de autenticação
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f1117', color:'#8b9ab8', fontSize:'14px' }}>
      Carregando...
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

// Redireciona usuário logado para fora do login
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="wallets"      element={<Wallets />} />
        <Route path="budgets"      element={<Budgets />} />
        <Route path="goals"        element={<Goals />} />
        <Route path="reports"      element={<Reports />} />
        <Route path="profile"      element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a2133', color: '#e8edf5', border: '1px solid #2a3550', fontSize: '13px' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#1a2133' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#1a2133' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
