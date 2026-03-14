import { useState } from 'react';
import { useTransactions, useCategories, useWallets } from '../hooks/useFinance';
import toast from 'react-hot-toast';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const FILTERS = [
  { label: 'Todos',     value: '' },
  { label: 'Receitas',  value: 'income' },
  { label: 'Despesas',  value: 'expense' },
];

export default function Transactions() {
  const now = new Date();
  const [filters, setFilters] = useState({ month: now.getMonth() + 1, year: now.getFullYear(), type: '' });
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState(null);

  const { data, loading, createTx, deleteTx, updateTx } = useTransactions({
    ...filters,
    ...(search ? { search } : {}),
  });

  const transactions = data?.data || [];
  const pagination = data?.pagination;

  const openCreate = () => { setEditTx(null); setShowModal(true); };
  const openEdit   = (tx) => { setEditTx(tx); setShowModal(true); };

  const handleDelete = async (id) => {
    if (!confirm('Remover esta transação?')) return;
    await deleteTx(id);
  };

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Transações</h1>
          <p style={s.sub}>{pagination?.total || 0} registros encontrados</p>
        </div>
        <button style={s.btnAdd} onClick={openCreate}>+ Nova transação</button>
      </div>

      {/* Filter bar */}
      <div style={s.filterRow}>
        <div style={s.chips}>
          {FILTERS.map(f => (
            <button key={f.value} style={{ ...s.chip, ...(filters.type === f.value ? s.chipActive : {}) }}
              onClick={() => setFilters(p => ({ ...p, type: f.value }))}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          style={s.search}
          placeholder="Buscar descrição..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={s.select}
          value={`${filters.year}-${filters.month}`}
          onChange={e => {
            const [y, m] = e.target.value.split('-');
            setFilters(p => ({ ...p, year: y, month: m }));
          }}>
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear(), m = d.getMonth() + 1;
            return (
              <option key={i} value={`${y}-${m}`}>
                {d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </option>
            );
          })}
        </select>
      </div>

      {/* Table */}
      <div style={s.table}>
        <div style={s.tableHead}>
          <span>Descrição</span>
          <span>Categoria</span>
          <span>Carteira</span>
          <span>Data</span>
          <span style={{ textAlign: 'right' }}>Valor</span>
          <span />
        </div>

        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#8b9ab8' }}>Carregando...</p>
        ) : transactions.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#8b9ab8' }}>Nenhuma transação encontrada</p>
        ) : transactions.map(tx => (
          <div key={tx.id} style={s.row}>
            <div style={s.rowDesc}>
              <div style={{ ...s.txIcon, background: `${tx.category_color || '#6b7280'}22` }}>
                {tx.category_icon || '📂'}
              </div>
              <span style={{ fontSize: '13px' }}>{tx.description}</span>
            </div>
            <span>
              <span style={{ ...s.badge, background: `${tx.category_color}22`, color: tx.category_color || '#8b9ab8' }}>
                {tx.category_name || 'Sem categoria'}
              </span>
            </span>
            <span style={{ fontSize: '12px', color: '#8b9ab8' }}>{tx.wallet_icon} {tx.wallet_name}</span>
            <span style={{ fontSize: '12px', color: '#8b9ab8' }}>
              {new Date(tx.date).toLocaleDateString('pt-BR')}
            </span>
            <span style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', fontWeight: '500', color: tx.type === 'income' ? '#22c55e' : '#ef4444' }}>
              {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
            </span>
            <div style={s.actions}>
              <button style={s.actBtn} onClick={() => openEdit(tx)} title="Editar">✏</button>
              <button style={{ ...s.actBtn, color: '#ef4444' }} onClick={() => handleDelete(tx.id)} title="Remover">✕</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <TxModal
          tx={editTx}
          onClose={() => setShowModal(false)}
          onSave={async (payload) => {
            if (editTx) { await updateTx(editTx.id, payload); }
            else        { await createTx(payload); }
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function TxModal({ tx, onClose, onSave }) {
  const { data: catData } = useCategories();
  const { wallets } = useWallets();
  const categories = catData?.data || [];
  const now = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState(tx ? {
    type: tx.type, amount: tx.amount, description: tx.description,
    category_id: tx.category_id, wallet_id: tx.wallet_id,
    date: tx.date?.split('T')[0] || now, notes: tx.notes || '',
  } : { type: 'expense', amount: '', description: '', category_id: '', wallet_id: wallets[0]?.id || '', date: now, notes: '' });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.wallet_id) return toast.error('Selecione uma carteira');
    setSaving(true);
    try { await onSave(form); }
    catch (err) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const filteredCats = categories.filter(c => c.type === form.type || c.type === 'both');

  return (
    <div style={m.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={m.box}>
        <div style={m.head}>
          <span>{tx ? 'Editar' : 'Nova'} transação</span>
          <button style={m.close} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={m.typeToggle}>
            {['expense', 'income'].map(tp => (
              <button key={tp} type="button"
                style={{ ...m.typeBtn, ...(form.type === tp ? (tp === 'income' ? m.typeBtnIncome : m.typeBtnExpense) : {}) }}
                onClick={() => setForm(f => ({ ...f, type: tp, category_id: '' }))}>
                {tp === 'income' ? '↑ Receita' : '↓ Despesa'}
              </button>
            ))}
          </div>

          {[
            { label: 'Descrição',  key: 'description', type: 'text',   placeholder: 'Ex: Aluguel, Salário...' },
            { label: 'Valor (R$)', key: 'amount',       type: 'number', placeholder: '0,00', step: '0.01', min: '0.01' },
          ].map(({ label, key, ...rest }) => (
            <div key={key} style={m.group}>
              <label style={m.label}>{label}</label>
              <input style={m.input} value={form[key]} onChange={set(key)} required {...rest} />
            </div>
          ))}

          <div style={m.group}>
            <label style={m.label}>Categoria</label>
            <select style={m.input} value={form.category_id} onChange={set('category_id')} required>
              <option value="">Selecione...</option>
              {filteredCats.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div style={m.group}>
            <label style={m.label}>Carteira</label>
            <select style={m.input} value={form.wallet_id} onChange={set('wallet_id')} required>
              <option value="">Selecione...</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
              ))}
            </select>
          </div>

          <div style={m.group}>
            <label style={m.label}>Data</label>
            <input style={m.input} type="date" value={form.date} onChange={set('date')} required />
          </div>

          <div style={m.group}>
            <label style={m.label}>Observações (opcional)</label>
            <textarea style={{ ...m.input, resize: 'vertical', minHeight: '70px' }}
              value={form.notes} onChange={set('notes')} placeholder="Detalhes adicionais..." />
          </div>

          <button type="submit" style={m.btn} disabled={saving}>
            {saving ? 'Salvando...' : tx ? 'Salvar alterações' : 'Adicionar transação'}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' },
  title:  { fontSize: '22px', fontWeight: '600', color: '#e8edf5', marginBottom: '0.3rem' },
  sub:    { color: '#8b9ab8', fontSize: '13px' },
  btnAdd: { background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: '8px', padding: '0.55rem 1.1rem', color: '#fff', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer' },
  filterRow: { display: 'flex', gap: '10px', marginBottom: '1.2rem', flexWrap: 'wrap', alignItems: 'center' },
  chips: { display: 'flex', gap: '6px' },
  chip:  { padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #2a3550', background: '#1a2133', color: '#8b9ab8', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' },
  chipActive: { background: 'rgba(59,130,246,0.15)', borderColor: '#3b82f6', color: '#3b82f6' },
  search: { flex: 1, minWidth: '160px', background: '#1a2133', border: '1px solid #2a3550', borderRadius: '8px', padding: '0.5rem 0.85rem', color: '#e8edf5', fontSize: '13px', fontFamily: 'inherit', outline: 'none' },
  select: { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '8px', padding: '0.5rem 0.85rem', color: '#e8edf5', fontSize: '13px', fontFamily: 'inherit', outline: 'none' },
  table:     { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '12px', overflow: 'hidden' },
  tableHead: { display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 1fr 60px', padding: '0.75rem 1rem', background: '#161b27', borderBottom: '1px solid #2a3550', fontSize: '11px', color: '#8b9ab8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  row:     { display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 1fr 60px', padding: '0.8rem 1rem', borderBottom: '1px solid #2a3550', alignItems: 'center' },
  rowDesc: { display: 'flex', alignItems: 'center', gap: '10px' },
  txIcon:  { width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 },
  badge:   { padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '11px', fontWeight: '500' },
  actions: { display: 'flex', gap: '4px', justifyContent: 'flex-end' },
  actBtn:  { width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #2a3550', background: 'transparent', color: '#8b9ab8', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};

const m = {
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  box:          { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' },
  head:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '17px', fontWeight: '600', color: '#e8edf5' },
  close:        { background: 'none', border: 'none', color: '#8b9ab8', cursor: 'pointer', fontSize: '18px' },
  typeToggle:   { display: 'flex', gap: '4px', background: '#161b27', borderRadius: '10px', padding: '4px', marginBottom: '1.2rem' },
  typeBtn:      { flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'transparent', color: '#8b9ab8', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' },
  typeBtnIncome:  { background: 'rgba(34,197,94,0.15)',  color: '#22c55e' },
  typeBtnExpense: { background: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  group:  { marginBottom: '1.1rem' },
  label:  { fontSize: '12px', color: '#8b9ab8', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500' },
  input:  { width: '100%', background: '#161b27', border: '1px solid #2a3550', borderRadius: '10px', padding: '0.7rem 1rem', color: '#e8edf5', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  btn:    { width: '100%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: '10px', padding: '0.85rem', color: '#fff', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer', marginTop: '0.5rem' },
};
