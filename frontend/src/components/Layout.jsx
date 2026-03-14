import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard',    icon: '◾', label: 'Dashboard'   },
  { to: '/transactions', icon: '↔', label: 'Transações'  },
  { to: '/wallets',      icon: '◈', label: 'Carteiras'   },
  { to: '/budgets',      icon: '◧', label: 'Orçamento'   },
  { to: '/goals',        icon: '◎', label: 'Metas'       },
  { to: '/reports',      icon: '▦', label: 'Relatórios'  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Até logo!');
    navigate('/login');
  };

  return (
    <div style={s.root}>
      <div style={s.topBar}>
        <div style={s.topLogo}>
          <div style={s.logoDot} />
          FinançasPro
        </div>
        <div style={s.topActions}>
          <div style={s.notifBtn} title="Notificações">🔔</div>
          <NavLink to="/profile" style={s.avatar}>{user?.initials || 'U'}</NavLink>
        </div>
      </div>

      <div style={s.body}>
        <nav style={s.sidebar}>
          {navItems.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({ ...s.navItem, ...(isActive ? s.navActive : {}) })}>
              <span style={s.navIcon}>{icon}</span> {label}
            </NavLink>
          ))}
          <div style={s.sep} />
          <NavLink to="/profile" style={({ isActive }) => ({ ...s.navItem, ...(isActive ? s.navActive : {}) })}>
            <span style={s.navIcon}>◯</span> Perfil
          </NavLink>
          <button onClick={handleLogout} style={s.logoutBtn}>
            <span style={s.navIcon}>→</span> Sair
          </button>
        </nav>

        <main style={s.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const s = {
  root: { display:'flex', flexDirection:'column', minHeight:'100vh', background:'#0f1117', color:'#e8edf5', fontFamily:"'Sora', sans-serif" },
  topBar: { background:'#1a2133', borderBottom:'1px solid #2a3550', padding:'0 1.5rem', height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 },
  topLogo: { display:'flex', alignItems:'center', gap:'8px', fontWeight:'600', fontSize:'15px', color:'#e8edf5', textDecoration:'none' },
  logoDot: { width:'8px', height:'8px', borderRadius:'50%', background:'#3b82f6' },
  topActions: { display:'flex', alignItems:'center', gap:'12px' },
  notifBtn: { width:'34px', height:'34px', borderRadius:'8px', background:'#161b27', border:'1px solid #2a3550', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'16px' },
  avatar: { width:'34px', height:'34px', borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'600', color:'#fff', textDecoration:'none', cursor:'pointer' },
  body: { display:'flex', flex:1 },
  sidebar: { width:'220px', background:'#1a2133', borderRight:'1px solid #2a3550', padding:'1.5rem 1rem', display:'flex', flexDirection:'column', gap:'4px', flexShrink:0 },
  navItem: { display:'flex', alignItems:'center', gap:'10px', padding:'0.65rem 0.85rem', borderRadius:'10px', cursor:'pointer', color:'#8b9ab8', fontSize:'13px', fontWeight:'500', textDecoration:'none', transition:'all 0.2s' },
  navActive: { background:'rgba(59,130,246,0.12)', color:'#3b82f6' },
  navIcon: { fontSize:'16px', width:'20px', textAlign:'center' },
  sep: { height:'1px', background:'#2a3550', margin:'0.5rem 0' },
  logoutBtn: { display:'flex', alignItems:'center', gap:'10px', padding:'0.65rem 0.85rem', borderRadius:'10px', cursor:'pointer', color:'#8b9ab8', fontSize:'13px', fontWeight:'500', border:'none', background:'transparent', fontFamily:'inherit', width:'100%', marginTop:'auto' },
  main: { flex:1, padding:'2rem', overflowY:'auto', background:'#0f1117' },
};
