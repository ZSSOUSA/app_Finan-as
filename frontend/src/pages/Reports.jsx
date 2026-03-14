import { useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Filler } from 'chart.js';
import jsPDF from 'jspdf';
import { useSummary } from '../hooks/useFinance';

Chart.register(ArcElement, Tooltip, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Filler);

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const now = new Date();

export default function Reports() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const { data, loading } = useSummary(month, year);

  const s = data?.summary || {};
  const byCategory = data?.by_category || [];
  const monthly    = data?.monthly    || [];

  // Build monthly series (last 6 months)
  const monthlyMap = {};
  monthly.forEach(r => {
    const k = `${r.year}-${String(r.month).padStart(2,'0')}`;
    if (!monthlyMap[k]) monthlyMap[k] = { label: MONTH_NAMES[r.month - 1], income: 0, expense: 0 };
    monthlyMap[k][r.type] = parseFloat(r.total);
  });
  const series = Object.values(monthlyMap).slice(-6);

  const generatePdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(18);
    doc.text('Relatório Financeiro', 40, 50);
    doc.setFontSize(11);
    doc.text(`Período: ${MONTH_NAMES[month - 1]} / ${year}`, 40, 72);

    doc.text(`Receitas: ${fmt(s.income)}`, 40, 100);
    doc.text(`Despesas: ${fmt(s.expense)}`, 40, 118);
    doc.text(`Saldo: ${fmt(s.balance)}`, 40, 136);
    doc.text(`Economia: ${s.income ? Math.round((s.balance / s.income) * 100) : 0}%`, 40, 154);

    let y = 190;
    doc.setFontSize(13);
    doc.text('Top categorias de despesas', 40, y);
    y += 18;

    const headerY = y + 8;
    doc.setFontSize(10);
    doc.text('Categoria', 40, headerY);
    doc.text('Total', 260, headerY);
    doc.text('%', 340, headerY);
    y = headerY + 12;

    byCategory.slice(0, 12).forEach((c, i) => {
      const pct = s.expense ? Math.round((c.total / s.expense) * 100) : 0;
      if (y > 760) { doc.addPage(); y = 40; }
      doc.text(`${c.icon} ${c.name}`, 40, y);
      doc.text(fmt(c.total), 260, y);
      doc.text(`${pct}%`, 340, y);
      y += 16;
    });

    const fileName = `relatorio-${year}-${String(month).padStart(2, '0')}.pdf`;
    doc.save(fileName);
  };

  return (
    <div>
      <div style={st.header}>
        <div><h1 style={st.title}>Relatórios</h1><p style={st.sub}>Análise detalhada das suas finanças</p></div>
        <div style={{ display: 'flex', gap: '8px', alignItems:'center' }}>
          <button style={st.btnPdf} onClick={generatePdf}>Exportar PDF</button>
          <select style={st.select} value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTH_NAMES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select style={st.select} value={year} onChange={e => setYear(+e.target.value)}>
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? <p style={{ color:'#8b9ab8', textAlign:'center', paddingTop:'4rem' }}>Carregando...</p> : (
        <>
          {/* KPIs */}
          <div style={st.kpiGrid}>
            {[
              { label:'Receitas',  val: s.income,              color:'#22c55e', icon:'↑' },
              { label:'Despesas',  val: s.expense,             color:'#ef4444', icon:'↓' },
              { label:'Saldo',     val: s.balance,             color: s.balance >= 0 ? '#22c55e':'#ef4444', icon:'=' },
              { label:'Economia',  val: s.income ? Math.round((s.balance / s.income) * 100) : 0, color:'#3b82f6', icon:'%', suffix:'%', noFmt:true },
            ].map(({ label, val, color, icon, suffix, noFmt }) => (
              <div key={label} style={st.kpiCard}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.4rem' }}>
                  <p style={st.kpiLabel}>{label}</p>
                  <span style={{ fontSize:'16px', color }}>{icon}</span>
                </div>
                <p style={{ ...st.kpiVal, color }}>
                  {noFmt ? `${val}${suffix || ''}` : fmt(val)}
                </p>
              </div>
            ))}
          </div>

          <div style={st.grid2}>
            {/* Bar - evolução mensal */}
            <div style={st.card}>
              <p style={st.cardTitle}>Receitas vs Despesas — últimos 6 meses</p>
              <div style={{ height:'220px' }}>
                {series.length > 0 ? (
                  <Bar
                    data={{
                      labels: series.map(r => r.label),
                      datasets: [
                        { label:'Receitas', data: series.map(r => r.income),  backgroundColor:'rgba(34,197,94,0.7)',  borderRadius:4 },
                        { label:'Despesas', data: series.map(r => r.expense), backgroundColor:'rgba(239,68,68,0.7)', borderRadius:4 },
                      ],
                    }}
                    options={{ responsive:true, maintainAspectRatio:false,
                      scales:{ x:{ ticks:{ color:'#8b9ab8' }, grid:{ color:'#2a3550' } }, y:{ ticks:{ color:'#8b9ab8', callback: v=>'R$'+v }, grid:{ color:'#2a3550' } } },
                      plugins:{ legend:{ display:false } } }}
                  />
                ) : <p style={{ color:'#8b9ab8', fontSize:'13px' }}>Sem dados</p>}
              </div>
              <div style={st.legend}>
                <span style={st.legendItem}><span style={{ ...st.legendDot, background:'rgba(34,197,94,0.7)' }} />Receitas</span>
                <span style={st.legendItem}><span style={{ ...st.legendDot, background:'rgba(239,68,68,0.7)' }} />Despesas</span>
              </div>
            </div>

            {/* Donut - por categoria */}
            <div style={st.card}>
              <p style={st.cardTitle}>Distribuição de despesas</p>
              {byCategory.length > 0 ? (
                <>
                  <div style={{ height:'180px', marginBottom:'1rem' }}>
                    <Doughnut
                      data={{
                        labels: byCategory.map(c => c.name),
                        datasets:[{ data: byCategory.map(c => parseFloat(c.total)), backgroundColor: byCategory.map(c => c.color), borderWidth:0 }],
                      }}
                      options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, cutout:'62%' }}
                    />
                  </div>
                  {byCategory.slice(0,5).map(c => {
                    const pct = s.expense ? Math.round((c.total / s.expense) * 100) : 0;
                    return (
                      <div key={c.id} style={st.catRow}>
                        <span style={{ ...st.catDot, background: c.color }} />
                        <span style={{ flex:1, fontSize:'12px' }}>{c.icon} {c.name}</span>
                        <span style={{ fontSize:'11px', color:'#8b9ab8' }}>{pct}%</span>
                        <span style={{ fontSize:'12px', fontFamily:'monospace', color:'#ef4444', marginLeft:'12px' }}>{fmt(c.total)}</span>
                      </div>
                    );
                  })}
                </>
              ) : <p style={{ color:'#8b9ab8', fontSize:'13px' }}>Nenhum gasto neste período</p>}
            </div>
          </div>

          {/* Line - saldo acumulado */}
          {series.length > 1 && (
            <div style={{ ...st.card, marginTop:'1.5rem' }}>
              <p style={st.cardTitle}>Tendência de saldo — últimos 6 meses</p>
              <div style={{ height:'200px' }}>
                <Line
                  data={{
                    labels: series.map(r => r.label),
                    datasets:[{
                      label:'Saldo',
                      data: series.map(r => r.income - r.expense),
                      borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.1)',
                      fill:true, tension:0.4, pointBackgroundColor:'#3b82f6', pointRadius:4,
                    }],
                  }}
                  options={{ responsive:true, maintainAspectRatio:false,
                    scales:{ x:{ ticks:{ color:'#8b9ab8' }, grid:{ color:'#2a3550' } }, y:{ ticks:{ color:'#8b9ab8', callback: v=>'R$'+v }, grid:{ color:'#2a3550' } } },
                    plugins:{ legend:{ display:false } } }}
                />
              </div>
            </div>
          )}

          {/* Top gastos */}
          {byCategory.length > 0 && (
            <div style={{ ...st.card, marginTop:'1.5rem' }}>
              <p style={st.cardTitle}>Top categorias de gasto</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                {byCategory.map((c, i) => {
                  const pct = s.expense ? Math.min(100,(c.total / s.expense) * 100) : 0;
                  return (
                    <div key={c.id}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                        <span style={{ fontSize:'13px' }}>{c.icon} {c.name}</span>
                        <span style={{ fontSize:'12px', fontFamily:'monospace', color:'#ef4444' }}>{fmt(c.total)}</span>
                      </div>
                      <div style={st.bar}><div style={{ ...st.barFill, width:`${pct}%`, background: c.color }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const st = {
  header:    { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' },
  title:     { fontSize:'22px', fontWeight:'600', color:'#e8edf5', marginBottom:'0.3rem' },
  sub:       { color:'#8b9ab8', fontSize:'13px' },
  select:    { background:'#1a2133', border:'1px solid #2a3550', borderRadius:'8px', padding:'0.5rem 0.85rem', color:'#e8edf5', fontSize:'13px', fontFamily:'inherit', outline:'none' },
  kpiGrid:   { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'1.5rem' },
  kpiCard:   { background:'#1a2133', border:'1px solid #2a3550', borderRadius:'12px', padding:'1.2rem' },
  kpiLabel:  { fontSize:'11px', color:'#8b9ab8', textTransform:'uppercase', letterSpacing:'0.5px' },
  kpiVal:    { fontSize:'22px', fontWeight:'600', fontFamily:'monospace', marginTop:'0.3rem' },
  grid2:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' },
  card:      { background:'#1a2133', border:'1px solid #2a3550', borderRadius:'12px', padding:'1.3rem' },
  cardTitle: { fontSize:'14px', fontWeight:'600', marginBottom:'1rem', color:'#e8edf5' },
  catRow:    { display:'flex', alignItems:'center', gap:'8px', padding:'0.4rem 0', borderBottom:'1px solid #2a3550' },
  catDot:    { width:'8px', height:'8px', borderRadius:'50%', flexShrink:0 },
  legend:    { display:'flex', gap:'16px', marginTop:'12px' },
  btnPdf:    { background:'#3b82f6', color:'#fff', border:'none', borderRadius:'8px', padding:'0.55rem 0.9rem', cursor:'pointer', fontWeight:'600', fontSize:'12px' },
  legendItem:{ display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'#8b9ab8' },
  legendDot: { width:'10px', height:'10px', borderRadius:'2px', display:'inline-block' },
  bar:       { height:'5px', background:'#2a3550', borderRadius:'3px', overflow:'hidden' },
  barFill:   { height:'100%', borderRadius:'3px' },
};
