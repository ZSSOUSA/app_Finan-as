import { useState } from 'react';
import { useWallets } from '../hooks/useFinance';
import toast from 'react-hot-toast';
import { walletService } from '../services/api';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const TYPES = [
  { value: 'checking',   label: 'Conta Corrente', icon: '🏦' },
  { value: 'savings',    label: 'Poupança',       icon: '💵' },
  { value: 'credit',     label: 'Cartão Crédito', icon: '💳' },
  { value: 'investment', label: 'Investimento',   icon: '📈' },
  { value: 'cash',       label: 'Dinheiro',       icon: '👛' },
];

const COLORS = ['#3b82f6','#22c55e','#a855f7','#ef4444','#f59e0b','#0ea5e9','#ec4899'];

export default function Wallets() {
  const { wallets, loading, refetch, doTransfer } = useWallets();
  const [showAdd, setShowAdd] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const totalBalance = wallets
    .filter(w => w.type !== 'credit')
    .reduce((sum, w) => sum + parseFloat(w.balance), 0);

  if (loading) return <p style={{ color: '#8b9ab8', textAlign: 'center', paddingTop: '4rem' }}>Carregando...</p>;

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Carteiras</h1>
          <p style={s.sub}>Saldo total: <strong style={{ color: '#22c55e' }}>{fmt(totalBalance)}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={s.btnSecondary} onClick={() => setShowTransfer(true)}>↔ Transferir</button>
          <button style={s.btnAdd} onClick={() => setShowAdd(true)}>+ Nova carteira</button>
        </div>
      </div>

      <div style={s.grid}>
        {wallets.map(w => (
          <WalletCard key={w.id} wallet={w} />
        ))}
      </div>

      {showAdd && <AddWalletModal onClose={() => setShowAdd(false)} onSave={async (data) => {
        await walletService.create(data);
        toast.success('Carteira criada!');
        refetch();
        setShowAdd(false);
      }} />}

      {showTransfer && (
        <TransferModal
          wallets={wallets}
          onClose={() => setShowTransfer(false)}
          onSave={async (data) => {
            await doTransfer(data);
            setShowTransfer(false);
          }}
        />
      )}
    </div>
  );
}

function WalletCard({ wallet: w }) {
  const isNegative = parseFloat(w.balance) < 0;
  const bgMap = {
    checking:   'linear-gradient(135deg,#1a3a6e,#1e2d5a)',
    savings:    'linear-gradient(135deg,#1a4e2e,#162e1f)',
    credit:     'linear-gradient(135deg,#3a1e5e,#251342)',
    investment: 'linear-gradient(135deg,#3a2e1e,#2a2010)',
    cash:       'linear-gradient(135deg,#3a3a1e,#252510)',
  };
  return (
    <div style={{ ...s.walletCard, background: bgMap[w.type] || bgMap.checking }}>
      <div style={s.walletIcon}>{w.icon}</div>
      <p style={s.walletLabel}>{w.name}</p>
      <p style={{ ...s.walletVal, color: isNegative ? '#ef4444' : '#e8f0ff' }}>{fmt(w.balance)}</p>
      <p style={s.walletType}>{TYPES.find(t => t.value === w.type)?.label || w.type}</p>
    </div>
  );
}

function AddWalletModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', type: 'checking', balance: 0, color: COLORS[0], icon: '🏦' });
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
        <div style={m.head}><span>Nova carteira</span><button style={m.close} onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div style={m.group}>
            <label style={m.label}>Nome</label>
            <input style={m.input} value={form.name} onChange={set('name')} placeholder="Ex: Nubank, Carteira..." required />
          </div>
          <div style={m.group}>
            <label style={m.label}>Tipo</label>
            <select style={m.input} value={form.type} onChange={set('type')}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div style={m.group}>
            <label style={m.label}>Saldo inicial (R$)</label>
            <input style={m.input} type="number" step="0.01" value={form.balance} onChange={set('balance')} />
          </div>
          <div style={m.group}>
            <label style={m.label}>Ícone</label>
            <input style={m.input} value={form.icon} onChange={set('icon')} placeholder="🏦" maxLength={4} />
          </div>
          <div style={m.group}>
            <label style={m.label}>Cor</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid #fff' : '3px solid transparent' }} />
              ))}
            </div>
          </div>
          <button type="submit" style={m.btn} disabled={saving}>{saving ? 'Salvando...' : 'Criar carteira'}</button>
        </form>
      </div>
    </div>
  );
}

function TransferModal({ wallets, onClose, onSave }) {
  const [form, setForm] = useState({
    from_wallet_id: wallets[0]?.id || '',
    to_wallet_id:   wallets[1]?.id || '',
    amount: '', description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.from_wallet_id === form.to_wallet_id) return toast.error('Selecione carteiras diferentes');
    setSaving(true);
    try { await onSave(form); }
    catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setSaving(false); }
  };

  return (
    <div style={m.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={m.box}>
        <div style={m.head}><span>Transferência</span><button style={m.close} onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'end', marginBottom: '1.2rem' }}>
            <div>
              <label style={m.label}>De</label>
              <select style={m.input} value={form.from_wallet_id} onChange={set('from_wallet_id')}>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
              </select>
            </div>
            <span style={{ fontSize: '20px', color: '#3b82f6', paddingBottom: '0.5rem' }}>→</span>
            <div>
              <label style={m.label}>Para</label>
              <select style={m.input} value={form.to_wallet_id} onChange={set('to_wallet_id')}>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
              </select>
            </div>
          </div>
          <div style={m.group}>
            <label style={m.label}>Valor (R$)</label>
            <input style={m.input} type="number" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} placeholder="0,00" required />
          </div>
          <div style={m.group}>
            <label style={m.label}>Descrição (opcional)</label>
            <input style={m.input} value={form.description} onChange={set('description')} placeholder="Motivo da transferência" />
          </div>
          <div style={m.group}>
            <label style={m.label}>Data</label>
            <input style={m.input} type="date" value={form.date} onChange={set('date')} required />
          </div>
          <button type="submit" style={m.btn} disabled={saving}>{saving ? 'Transferindo...' : 'Confirmar transferência'}</button>
        </form>
      </div>
    </div>
  );
}

const s = {
  header:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' },
  title:       { fontSize: '22px', fontWeight: '600', color: '#e8edf5', marginBottom: '0.3rem' },
  sub:         { color: '#8b9ab8', fontSize: '13px' },
  btnAdd:      { background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: '8px', padding: '0.55rem 1.1rem', color: '#fff', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer' },
  btnSecondary:{ background: 'transparent', border: '1px solid #2a3550', borderRadius: '8px', padding: '0.55rem 1.1rem', color: '#8b9ab8', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' },
  walletCard:  { borderRadius: '14px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' },
  walletIcon:  { fontSize: '24px', marginBottom: '0.8rem' },
  walletLabel: { fontSize: '12px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' },
  walletVal:   { fontSize: '24px', fontWeight: '600', fontFamily: 'monospace', marginBottom: '0.3rem' },
  walletType:  { fontSize: '11px', color: 'rgba(255,255,255,0.4)' },
};
const m = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  box:     { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' },
  head:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '17px', fontWeight: '600', color: '#e8edf5' },
  close:   { background: 'none', border: 'none', color: '#8b9ab8', cursor: 'pointer', fontSize: '18px' },
  group:   { marginBottom: '1.1rem' },
  label:   { fontSize: '12px', color: '#8b9ab8', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input:   { width: '100%', background: '#161b27', border: '1px solid #2a3550', borderRadius: '10px', padding: '0.7rem 1rem', color: '#e8edf5', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  btn:     { width: '100%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: '10px', padding: '0.85rem', color: '#fff', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer', marginTop: '0.5rem' },
};
