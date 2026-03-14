import { useState } from 'react';
import { useBudgets, useCategories } from '../hooks/useFinance';
import toast from 'react-hot-toast';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const now = new Date();

export default function Budgets() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [showModal, setShowModal] = useState(false);

  const { budgets, loading, saveBudget } = useBudgets(month, year);

  const totalLimit = budgets.reduce((s, b) => s + parseFloat(b.limit_amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + parseFloat(b.spent), 0);

  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Orçamento</h1>
          <p style={s.sub}>{months[month - 1]} {year}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select style={s.select} value={month} onChange={e => setMonth(+e.target.value)}>
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select style={s.select} value={year} onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button style={s.btnAdd} onClick={() => setShowModal(true)}>+ Definir limite</button>
        </div>
      </div>

      {/* Summary */}
      <div style={s.summaryGrid}>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Total orçado</p>
          <p style={{ ...s.summaryVal, color: '#3b82f6' }}>{fmt(totalLimit)}</p>
        </div>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Total gasto</p>
          <p style={{ ...s.summaryVal, color: totalSpent > totalLimit ? '#ef4444' : '#22c55e' }}>{fmt(totalSpent)}</p>
        </div>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Disponível</p>
          <p style={{ ...s.summaryVal, color: totalLimit - totalSpent < 0 ? '#ef4444' : '#e8edf5' }}>{fmt(totalLimit - totalSpent)}</p>
        </div>
      </div>

      {/* Overall bar */}
      {totalLimit > 0 && (
        <div style={s.overallCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '13px', fontWeight: '500' }}>Uso total do orçamento</span>
            <span style={{ fontSize: '13px', color: '#8b9ab8' }}>
              {Math.min(100, Math.round((totalSpent / totalLimit) * 100))}%
            </span>
          </div>
          <div style={s.bar}>
            <div style={{ ...s.barFill, width: `${Math.min(100, (totalSpent / totalLimit) * 100)}%`, background: totalSpent > totalLimit ? '#ef4444' : totalSpent / totalLimit > 0.8 ? '#f59e0b' : '#22c55e' }} />
          </div>
        </div>
      )}

      {/* Categories */}
      {loading ? (
        <p style={{ color: '#8b9ab8', textAlign: 'center', paddingTop: '2rem' }}>Carregando...</p>
      ) : budgets.length === 0 ? (
        <div style={s.emptyState}>
          <p style={{ fontSize: '32px', marginBottom: '1rem' }}>💡</p>
          <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '0.5rem' }}>Nenhum orçamento definido</p>
          <p style={{ fontSize: '13px', color: '#8b9ab8', marginBottom: '1.5rem' }}>Defina limites por categoria para controlar seus gastos</p>
          <button style={s.btnAdd} onClick={() => setShowModal(true)}>Definir orçamento →</button>
        </div>
      ) : (
        <div style={s.budgetList}>
          {budgets.map(b => {
            const pct = Math.min(100, (parseFloat(b.spent) / parseFloat(b.limit_amount)) * 100);
            const isOver    = pct >= 100;
            const isWarning = pct >= 80 && !isOver;
            const barColor  = isOver ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';
            return (
              <div key={b.id} style={s.budgetCard}>
                <div style={s.budgetTop}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ ...s.catIcon, background: `${b.color}22` }}>{b.icon}</div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500' }}>{b.name}</p>
                      <p style={{ fontSize: '11px', color: '#8b9ab8' }}>
                        {fmt(b.spent)} de {fmt(b.limit_amount)}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'monospace', color: barColor }}>
                      {Math.round(pct)}%
                    </p>
                    <p style={{ fontSize: '11px', color: isOver ? '#ef4444' : '#8b9ab8' }}>
                      {isOver ? `Excedeu ${fmt(parseFloat(b.spent) - parseFloat(b.limit_amount))}` : `Sobra ${fmt(parseFloat(b.limit_amount) - parseFloat(b.spent))}`}
                    </p>
                  </div>
                </div>
                <div style={s.bar}>
                  <div style={{ ...s.barFill, width: `${pct}%`, background: barColor }} />
                </div>
                {isOver && (
                  <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '0.4rem' }}>⚠ Limite excedido!</p>
                )}
                {isWarning && (
                  <p style={{ fontSize: '11px', color: '#f59e0b', marginTop: '0.4rem' }}>⚡ Atenção: 80% do limite atingido</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <BudgetModal
          month={month} year={year}
          onClose={() => setShowModal(false)}
          onSave={async (data) => { await saveBudget(data); setShowModal(false); }}
        />
      )}
    </div>
  );
}

function BudgetModal({ month, year, onClose, onSave }) {
  const { data: catData } = useCategories('expense');
  const cats = catData?.data || [];
  const [form, setForm] = useState({ category_id: '', limit_amount: '', month, year });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); }
    catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setSaving(false); }
  };

  return (
    <div style={m.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={m.box}>
        <div style={m.head}><span>Definir limite de orçamento</span><button style={m.close} onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div style={m.group}>
            <label style={m.label}>Categoria</label>
            <select style={m.input} value={form.category_id} onChange={set('category_id')} required>
              <option value="">Selecione...</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div style={m.group}>
            <label style={m.label}>Limite mensal (R$)</label>
            <input style={m.input} type="number" step="0.01" min="1" value={form.limit_amount} onChange={set('limit_amount')} placeholder="0,00" required />
          </div>
          <button type="submit" style={m.btn} disabled={saving}>{saving ? 'Salvando...' : 'Salvar orçamento'}</button>
        </form>
      </div>
    </div>
  );
}

const s = {
  header:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  title:       { fontSize: '22px', fontWeight: '600', color: '#e8edf5', marginBottom: '0.3rem' },
  sub:         { color: '#8b9ab8', fontSize: '13px' },
  btnAdd:      { background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: '8px', padding: '0.55rem 1.1rem', color: '#fff', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer' },
  select:      { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '8px', padding: '0.5rem 0.85rem', color: '#e8edf5', fontSize: '13px', fontFamily: 'inherit', outline: 'none' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '1.5rem' },
  summaryCard: { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '12px', padding: '1.2rem' },
  summaryLabel:{ fontSize: '11px', color: '#8b9ab8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' },
  summaryVal:  { fontSize: '22px', fontWeight: '600', fontFamily: 'monospace' },
  overallCard: { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '12px', padding: '1.3rem', marginBottom: '1.5rem' },
  bar:         { height: '6px', background: '#2a3550', borderRadius: '3px', overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: '3px', transition: 'width 0.5s ease' },
  budgetList:  { display: 'flex', flexDirection: 'column', gap: '1rem' },
  budgetCard:  { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '12px', padding: '1.3rem' },
  budgetTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  catIcon:     { width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' },
  emptyState:  { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#e8edf5' },
};
const m = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  box:     { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '400px' },
  head:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '17px', fontWeight: '600', color: '#e8edf5' },
  close:   { background: 'none', border: 'none', color: '#8b9ab8', cursor: 'pointer', fontSize: '18px' },
  group:   { marginBottom: '1.1rem' },
  label:   { fontSize: '12px', color: '#8b9ab8', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input:   { width: '100%', background: '#161b27', border: '1px solid #2a3550', borderRadius: '10px', padding: '0.7rem 1rem', color: '#e8edf5', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  btn:     { width: '100%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: '10px', padding: '0.85rem', color: '#fff', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer', marginTop: '0.5rem' },
};
