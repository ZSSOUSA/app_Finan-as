import { useState } from 'react';
import { useGoals } from '../hooks/useFinance';
import toast from 'react-hot-toast';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const ICONS = ['🏖️','🚗','🏠','📈','✈️','💻','🎓','💒','👶','🏥','🎯','💰'];
const COLORS = ['#3b82f6','#22c55e','#a855f7','#ef4444','#f59e0b','#0ea5e9','#ec4899','#10b981'];

export default function Goals() {
  const { goals, loading, createGoal, updateGoal, deleteGoal } = useGoals();
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [showDeposit, setShowDeposit] = useState(null);

  if (loading) return <p style={{ color: '#8b9ab8', textAlign: 'center', paddingTop: '4rem' }}>Carregando...</p>;

  const active    = goals.filter(g => !g.is_completed);
  const completed = goals.filter(g => g.is_completed);

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Metas financeiras</h1>
          <p style={s.sub}>{active.length} ativas · {completed.length} concluídas</p>
        </div>
        <button style={s.btnAdd} onClick={() => { setEditGoal(null); setShowModal(true); }}>+ Nova meta</button>
      </div>

      {goals.length === 0 ? (
        <div style={s.empty}>
          <p style={{ fontSize: '40px', marginBottom: '1rem' }}>🎯</p>
          <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '0.5rem' }}>Nenhuma meta criada</p>
          <p style={{ fontSize: '13px', color: '#8b9ab8', marginBottom: '1.5rem' }}>Defina objetivos financeiros e acompanhe seu progresso</p>
          <button style={s.btnAdd} onClick={() => setShowModal(true)}>Criar primeira meta →</button>
        </div>
      ) : (
        <>
          <div style={s.grid}>
            {active.map(g => (
              <GoalCard key={g.id} goal={g}
                onEdit={() => { setEditGoal(g); setShowModal(true); }}
                onDelete={() => { if (confirm('Remover meta?')) deleteGoal(g.id); }}
                onDeposit={() => setShowDeposit(g)}
                onComplete={() => updateGoal(g.id, { ...g, is_completed: true })}
              />
            ))}
          </div>

          {completed.length > 0 && (
            <>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#8b9ab8', margin: '2rem 0 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✅ Metas concluídas ({completed.length})
              </p>
              <div style={s.grid}>
                {completed.map(g => (
                  <GoalCard key={g.id} goal={g} completed
                    onDelete={() => { if (confirm('Remover meta?')) deleteGoal(g.id); }}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {showModal && (
        <GoalModal
          goal={editGoal}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            if (editGoal) { await updateGoal(editGoal.id, data); }
            else          { await createGoal(data); }
            setShowModal(false);
          }}
        />
      )}

      {showDeposit && (
        <DepositModal
          goal={showDeposit}
          onClose={() => setShowDeposit(null)}
          onSave={async (amount) => {
            const newAmt = parseFloat(showDeposit.current_amount) + parseFloat(amount);
            const isCompleted = newAmt >= parseFloat(showDeposit.target_amount);
            await updateGoal(showDeposit.id, { ...showDeposit, current_amount: newAmt, is_completed: isCompleted });
            if (isCompleted) toast.success('🎉 Meta concluída! Parabéns!');
            setShowDeposit(null);
          }}
        />
      )}
    </div>
  );
}

function GoalCard({ goal: g, onEdit, onDelete, onDeposit, onComplete, completed }) {
  const pct = Math.min(100, (parseFloat(g.current_amount) / parseFloat(g.target_amount)) * 100);
  const remaining = parseFloat(g.target_amount) - parseFloat(g.current_amount);
  const deadline = g.deadline ? new Date(g.deadline).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : null;

  return (
    <div style={{ ...s.card, opacity: completed ? 0.7 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '28px' }}>{g.icon}</span>
        {!completed && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button style={s.actBtn} onClick={onEdit} title="Editar">✏</button>
            <button style={{ ...s.actBtn, color: '#ef4444' }} onClick={onDelete} title="Remover">✕</button>
          </div>
        )}
        {completed && <span style={{ fontSize: '20px' }}>✅</span>}
      </div>

      <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '0.2rem' }}>{g.name}</p>
      {deadline && <p style={{ fontSize: '11px', color: '#8b9ab8', marginBottom: '1rem' }}>Prazo: {deadline}</p>}

      <div style={s.bar}>
        <div style={{ ...s.barFill, width: `${pct}%`, background: g.color || '#3b82f6' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '12px', color: g.color || '#3b82f6', fontWeight: '500' }}>{Math.round(pct)}%</span>
        <span style={{ fontSize: '11px', color: '#8b9ab8' }}>{fmt(remaining)} restante</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <p style={{ fontSize: '18px', fontWeight: '600', fontFamily: 'monospace' }}>{fmt(g.current_amount)}</p>
          <p style={{ fontSize: '11px', color: '#8b9ab8' }}>de {fmt(g.target_amount)}</p>
        </div>
        {!completed && (
          <button style={{ ...s.actBtn, padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '12px', width: 'auto', height: 'auto', color: '#3b82f6', borderColor: '#3b82f6' }}
            onClick={onDeposit}>
            + Depositar
          </button>
        )}
      </div>
    </div>
  );
}

function GoalModal({ goal, onClose, onSave }) {
  const [form, setForm] = useState(goal ? {
    name: goal.name, target_amount: goal.target_amount,
    current_amount: goal.current_amount, deadline: goal.deadline?.split('T')[0] || '',
    icon: goal.icon, color: goal.color,
  } : { name: '', target_amount: '', current_amount: 0, deadline: '', icon: '🎯', color: '#3b82f6' });
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
        <div style={m.head}><span>{goal ? 'Editar' : 'Nova'} meta</span><button style={m.close} onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div style={m.group}>
            <label style={m.label}>Nome da meta</label>
            <input style={m.input} value={form.name} onChange={set('name')} placeholder="Ex: Viagem, Carro..." required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={m.group}>
              <label style={m.label}>Valor alvo (R$)</label>
              <input style={m.input} type="number" step="0.01" min="1" value={form.target_amount} onChange={set('target_amount')} placeholder="0,00" required />
            </div>
            <div style={m.group}>
              <label style={m.label}>Já guardei (R$)</label>
              <input style={m.input} type="number" step="0.01" min="0" value={form.current_amount} onChange={set('current_amount')} placeholder="0,00" />
            </div>
          </div>
          <div style={m.group}>
            <label style={m.label}>Prazo (opcional)</label>
            <input style={m.input} type="date" value={form.deadline} onChange={set('deadline')} />
          </div>
          <div style={m.group}>
            <label style={m.label}>Ícone</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ICONS.map(ic => (
                <span key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  style={{ fontSize: '20px', cursor: 'pointer', padding: '4px', borderRadius: '6px', background: form.icon === ic ? '#2a3550' : 'transparent' }}>
                  {ic}
                </span>
              ))}
            </div>
          </div>
          <div style={m.group}>
            <label style={m.label}>Cor</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid #fff' : '3px solid transparent' }} />
              ))}
            </div>
          </div>
          <button type="submit" style={m.btn} disabled={saving}>{saving ? 'Salvando...' : 'Salvar meta'}</button>
        </form>
      </div>
    </div>
  );
}

function DepositModal({ goal, onClose, onSave }) {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(amount); }
    finally { setSaving(false); }
  };
  return (
    <div style={m.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={m.box}>
        <div style={m.head}><span>Depositar na meta</span><button style={m.close} onClick={onClose}>✕</button></div>
        <p style={{ color: '#8b9ab8', fontSize: '13px', marginBottom: '1.5rem' }}>
          {goal.icon} {goal.name} · {fmt(goal.current_amount)} / {fmt(goal.target_amount)}
        </p>
        <form onSubmit={handleSubmit}>
          <div style={m.group}>
            <label style={m.label}>Valor a adicionar (R$)</label>
            <input style={m.input} type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" required autoFocus />
          </div>
          <button type="submit" style={m.btn} disabled={saving}>{saving ? 'Salvando...' : '+ Adicionar à meta'}</button>
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
  grid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' },
  card:   { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '14px', padding: '1.4rem' },
  bar:    { height: '6px', background: '#2a3550', borderRadius: '3px', overflow: 'hidden' },
  barFill:{ height: '100%', borderRadius: '3px', transition: 'width 0.5s ease' },
  actBtn: { width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #2a3550', background: 'transparent', color: '#8b9ab8', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  empty:  { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '12px', padding: '4rem', textAlign: 'center', color: '#e8edf5' },
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
