import { useState } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, BarElement, CategoryScale, LinearScale, Legend } from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { useSummary } from '../hooks/useFinance';

Chart.register(ArcElement, Tooltip, BarElement, CategoryScale, LinearScale, Legend);

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v || 0);
const now = new Date();

export default function Dashboard() {
  const { user } = useAuth();
  const [month] = useState(now.getMonth() + 1);
  const [year]  = useState(now.getFullYear());
  const { data, loading } = useSummary(month, year);

  if (loading) return <p style={{ color:'#8b9ab8', textAlign:'center', paddingTop:'4rem' }}>Carregando...</p>;

  const s = data?.summary || {};
  const byCategory = data?.by_category || [];
  const monthly = data?.monthly || [];

  // Monta dados do gráfico mensal
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const monthlyMap = {};
  monthly.forEach(r => {
    const k = `${r.year}-${r.month}`;
    if (!monthlyMap[k]) monthlyMap[k] = { month: r.month, year: r.year, income:0, expense:0 };
    monthlyMap[k][r.type] = parseFloat(r.total);
  });
  const monthlyRows = Object.values(monthlyMap).slice(-6);

  return (
    <div>
      <h1 style={t.title}>Olá, {user?.name?.split(' ')[0] || 'Usuário'}! 👋</h1>
      <p style={t.sub}>Aqui está o resumo das suas finanças deste mês</p>

      {/* Balance card */}
      <div style={t.balanceCard}>
        <p style={t.balLabel}>Saldo do mês</p>
        <p style={{ ...t.balValue, color: s.balance >= 0 ? '#22c55e' : '#ef4444' }}>{fmt(s.balance)}</p>
        <div style={t.balRow}>
          <div style={t.balItem}>
            <span style={{ ...t.dot, background:'#22c55e' }} />
            <span style={t.balSub}>Receitas: </span>
            <span style={t.balNum}>{fmt(s.income)}</span>
          </div>
          <div style={t.balItem}>
            <span style={{ ...t.dot, background:'#ef4444' }} />
            <span style={t.balSub}>Despesas: </span>
            <span style={t.balNum}>{fmt(s.expense)}</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={t.metricGrid}>
        {[
          { label:'Transações', val: s.income_count + s.expense_count, color:'#3b82f6', suffix:' registros' },
          { label:'Maior receita',  val: s.income,  color:'#22c55e', prefix:'R$' },
          { label:'Total gastos',   val: s.expense, color:'#ef4444', prefix:'R$' },
        ].map(({ label, val, color, prefix, suffix }) => (
          <div key={label} style={t.metricCard}>
            <p style={t.metricLabel}>{label}</p>
            <p style={{ ...t.metricVal, color }}>
              {prefix ? fmt(val) : val}{suffix || ''}
            </p>
          </div>
        ))}
      </div>

      <div style={t.grid2}>
        {/* Categoria donut */}
        <div style={t.card}>
          <p style={t.cardTitle}>Gastos por categoria</p>
          {byCategory.length > 0 ? (
            <>
              <div style={{ height:'200px', marginBottom:'1rem' }}>
                <Doughnut
                  data={{
                    labels: byCategory.map(c => c.name),
                    datasets: [{ data: byCategory.map(c => parseFloat(c.total)), backgroundColor: byCategory.map(c => c.color), borderWidth: 0 }],
                  }}
                  options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, cutout:'65%' }}
                />
              </div>
              {byCategory.map(c => (
                <div key={c.id} style={t.catRow}>
                  <span style={{ ...t.catDot, background: c.color }} />
                  <span style={{ flex:1, fontSize:'12px', color:'#e8edf5' }}>{c.icon} {c.name}</span>
                  <span style={{ fontSize:'12px', color:'#ef4444', fontFamily:'monospace' }}>{fmt(c.total)}</span>
                </div>
              ))}
            </>
          ) : <p style={{ color:'#8b9ab8', fontSize:'13px' }}>Nenhum gasto registrado</p>}
        </div>

        {/* Evolução mensal */}
        <div style={t.card}>
          <p style={t.cardTitle}>Evolução mensal</p>
          {monthlyRows.length > 0 ? (
            <div style={{ height:'260px' }}>
              <Bar
                data={{
                  labels: monthlyRows.map(r => months[r.month - 1]),
                  datasets: [
                    { label:'Receitas', data: monthlyRows.map(r => r.income),  backgroundColor:'rgba(34,197,94,0.7)',  borderRadius:4 },
                    { label:'Despesas', data: monthlyRows.map(r => r.expense), backgroundColor:'rgba(239,68,68,0.7)', borderRadius:4 },
                  ],
                }}
                options={{
                  responsive:true, maintainAspectRatio:false,
                  scales:{
                    x:{ ticks:{ color:'#8b9ab8' }, grid:{ color:'#2a3550' } },
                    y:{ ticks:{ color:'#8b9ab8', callback: v => 'R$'+v }, grid:{ color:'#2a3550' } },
                  },
                  plugins:{ legend:{ display:false } },
                }}
              />
            </div>
          ) : <p style={{ color:'#8b9ab8', fontSize:'13px' }}>Sem dados históricos</p>}
          <div style={{ display:'flex', gap:'16px', marginTop:'12px' }}>
            <span style={t.legendItem}><span style={{ ...t.legendDot, background:'rgba(34,197,94,0.7)' }} />Receitas</span>
            <span style={t.legendItem}><span style={{ ...t.legendDot, background:'rgba(239,68,68,0.7)' }} />Despesas</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const t = {
  title: { fontSize:'22px', fontWeight:'600', marginBottom:'0.3rem', color:'#e8edf5' },
  sub: { color:'#8b9ab8', fontSize:'13px', marginBottom:'1.8rem' },
  balanceCard: { background:'linear-gradient(135deg,#1a3a6e,#1e2d5a)', border:'1px solid #2a4a8a', borderRadius:'16px', padding:'1.8rem', marginBottom:'1.5rem' },
  balLabel: { fontSize:'12px', color:'#7aa0d0', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'0.5rem' },
  balValue: { fontSize:'36px', fontWeight:'600', fontFamily:'monospace', marginBottom:'1.2rem' },
  balRow: { display:'flex', gap:'2rem' },
  balItem: { display:'flex', alignItems:'center', gap:'6px', fontSize:'13px' },
  dot: { width:'8px', height:'8px', borderRadius:'50%', display:'inline-block' },
  balSub: { color:'#7aa0d0' },
  balNum: { color:'#c0d8f0', fontFamily:'monospace' },
  metricGrid: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'1.5rem' },
  metricCard: { background:'#1a2133', border:'1px solid #2a3550', borderRadius:'12px', padding:'1.2rem' },
  metricLabel: { fontSize:'11px', color:'#8b9ab8', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'0.4rem' },
  metricVal: { fontSize:'22px', fontWeight:'600', fontFamily:'monospace' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' },
  card: { background:'#1a2133', border:'1px solid #2a3550', borderRadius:'12px', padding:'1.3rem' },
  cardTitle: { fontSize:'14px', fontWeight:'600', marginBottom:'1rem', color:'#e8edf5' },
  catRow: { display:'flex', alignItems:'center', gap:'8px', padding:'0.4rem 0', borderBottom:'1px solid #2a3550' },
  catDot: { width:'8px', height:'8px', borderRadius:'50%', flexShrink:0 },
  legendItem: { display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'#8b9ab8' },
  legendDot: { width:'10px', height:'10px', borderRadius:'2px', display:'inline-block' },
};
