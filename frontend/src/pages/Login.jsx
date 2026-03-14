import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: 'demo@financas.com', password: '123456' });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Bem-vindo de volta!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>💰</div>
          <div>
            <h1 style={styles.logoName}>FinançasPro</h1>
            <span style={styles.logoSub}>// smart money</span>
          </div>
        </div>

        <div style={styles.tabs}>
          {['login','register'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}>
              {t === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <h2 style={styles.title}>{tab === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta'}</h2>
          <p style={styles.sub}>{tab === 'login' ? 'Acesse sua conta para continuar' : 'Comece a controlar suas finanças'}</p>

          {tab === 'register' && (
            <div style={styles.group}>
              <label style={styles.label}>Nome completo</label>
              <input style={styles.input} value={form.name} onChange={set('name')} placeholder="João Silva" required />
            </div>
          )}

          <div style={styles.group}>
            <label style={styles.label}>E-mail</label>
            <input style={styles.input} type="email" value={form.email} onChange={set('email')} placeholder="seu@email.com" required />
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Senha</label>
            <input style={styles.input} type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
          </div>

          {tab === 'login' && (
            <div style={{ textAlign:'right', marginBottom:'1rem' }}>
              <Link to="/reset" style={{ color:'#3b82f6', fontSize:'12px' }}>Esqueceu a senha?</Link>
            </div>
          )}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar →' : 'Criar conta →'}
          </button>

          {tab === 'login' && (
            <p style={{ textAlign:'center', marginTop:'0.75rem', fontSize:'12px', color:'#4a5a7a' }}>
              Demo: demo@financas.com / 123456
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f1117', padding:'2rem' },
  card: { background:'#1a2133', border:'1px solid #2a3550', borderRadius:'20px', padding:'2.5rem', width:'100%', maxWidth:'420px' },
  logo: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'2rem' },
  logoIcon: { width:'40px', height:'40px', borderRadius:'10px', background:'linear-gradient(135deg,#3b82f6,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' },
  logoName: { fontSize:'20px', fontWeight:'600', color:'#e8edf5', margin:0 },
  logoSub: { color:'#3b82f6', fontSize:'11px', fontFamily:'monospace' },
  tabs: { display:'flex', gap:'4px', background:'#161b27', borderRadius:'10px', padding:'4px', marginBottom:'1.8rem' },
  tab: { flex:1, textAlign:'center', padding:'0.5rem', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'500', color:'#8b9ab8', border:'none', background:'transparent', fontFamily:'inherit' },
  tabActive: { background:'#1a2133', color:'#e8edf5' },
  title: { fontSize:'22px', fontWeight:'600', color:'#e8edf5', marginBottom:'0.3rem' },
  sub: { color:'#8b9ab8', fontSize:'13px', marginBottom:'1.8rem' },
  group: { marginBottom:'1.2rem' },
  label: { fontSize:'12px', color:'#8b9ab8', marginBottom:'0.5rem', display:'block', fontWeight:'500', textTransform:'uppercase', letterSpacing:'0.5px' },
  input: { width:'100%', background:'#161b27', border:'1px solid #2a3550', borderRadius:'10px', padding:'0.75rem 1rem', color:'#e8edf5', fontSize:'14px', fontFamily:'inherit', outline:'none', boxSizing:'border-box' },
  btn: { width:'100%', background:'linear-gradient(135deg,#3b82f6,#6366f1)', border:'none', borderRadius:'10px', padding:'0.85rem', color:'#fff', fontSize:'14px', fontWeight:'600', fontFamily:'inherit', cursor:'pointer', marginTop:'0.5rem' },
};
