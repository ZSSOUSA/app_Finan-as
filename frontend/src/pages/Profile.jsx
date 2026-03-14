import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    currency: user?.currency || 'BRL',
    email_notifications: user?.email_notifications ?? true,
    budget_alerts: user?.budget_alerts ?? true,
    two_factor: user?.two_factor ?? false,
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggle = k => () => setForm(f => ({ ...f, [k]: !f[k] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await profileService.update(form);
      setUser(prev => ({ ...prev, ...data.data }));
      toast.success('Perfil atualizado!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <h1 style={s.title}>Perfil</h1>
      <p style={s.sub}>Gerencie sua conta e preferências</p>

      {/* Header card */}
      <div style={s.profileCard}>
        <div style={s.avatar}>{user?.initials || 'U'}</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '20px', fontWeight: '600' }}>{user?.name}</p>
          <p style={{ color: '#8b9ab8', fontSize: '13px' }}>{user?.email}</p>
        </div>
      </div>

      {/* Edit form */}
      <div style={s.card}>
        <p style={s.cardTitle}>Informações pessoais</p>
        <div style={s.group}>
          <label style={s.label}>Nome completo</label>
          <input style={s.input} value={form.name} onChange={set('name')} />
        </div>
        <div style={s.group}>
          <label style={s.label}>E-mail</label>
          <input style={{ ...s.input, opacity: 0.5 }} value={user?.email} disabled />
        </div>
        <div style={s.group}>
          <label style={s.label}>Moeda padrão</label>
          <select style={s.input} value={form.currency} onChange={set('currency')}>
            <option value="BRL">🇧🇷 Real Brasileiro (BRL)</option>
            <option value="USD">🇺🇸 Dólar Americano (USD)</option>
            <option value="EUR">🇪🇺 Euro (EUR)</option>
          </select>
        </div>
        <button style={s.btnSave} onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

      {/* Notifications */}
      <div style={s.card}>
        <p style={s.cardTitle}>Notificações</p>
        {[
          { key: 'email_notifications', label: 'Notificações por e-mail', sub: 'Receba alertas de gastos e resumos mensais' },
          { key: 'budget_alerts',       label: 'Alertas de orçamento',    sub: 'Aviso ao atingir 80% do limite de cada categoria' },
          { key: 'two_factor',          label: 'Autenticação em 2 fatores', sub: 'Maior segurança ao fazer login' },
        ].map(({ key, label, sub }) => (
          <div key={key} style={s.settingItem}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500' }}>{label}</p>
              <p style={{ fontSize: '11px', color: '#8b9ab8' }}>{sub}</p>
            </div>
            <div style={{ ...s.toggle, background: form[key] ? '#3b82f6' : '#2a3550' }} onClick={toggle(key)}>
              <div style={{ ...s.toggleThumb, left: form[key] ? '18px' : '3px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div style={s.card}>
        <p style={s.cardTitle}>Dados e segurança</p>
        <div style={s.settingItem}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '500' }}>Exportar meus dados</p>
            <p style={{ fontSize: '11px', color: '#8b9ab8' }}>Baixe todas as suas transações em CSV</p>
          </div>
          <button style={s.btnSecondary}>Exportar .CSV</button>
        </div>
        <div style={s.settingItem}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '500', color: '#ef4444' }}>Excluir conta</p>
            <p style={{ fontSize: '11px', color: '#8b9ab8' }}>Ação irreversível — todos os dados serão apagados</p>
          </div>
          <button style={{ ...s.btnSecondary, color: '#ef4444', borderColor: '#ef4444' }}>Excluir</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  title:       { fontSize: '22px', fontWeight: '600', color: '#e8edf5', marginBottom: '0.3rem' },
  sub:         { color: '#8b9ab8', fontSize: '13px', marginBottom: '1.8rem' },
  profileCard: { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '16px', padding: '1.8rem', display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' },
  avatar:      { width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '600', color: '#fff', flexShrink: 0 },
  card:        { background: '#1a2133', border: '1px solid #2a3550', borderRadius: '12px', padding: '1.3rem', marginBottom: '1rem' },
  cardTitle:   { fontSize: '14px', fontWeight: '600', marginBottom: '1.2rem', color: '#e8edf5' },
  group:       { marginBottom: '1.1rem' },
  label:       { fontSize: '12px', color: '#8b9ab8', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500' },
  input:       { width: '100%', background: '#161b27', border: '1px solid #2a3550', borderRadius: '10px', padding: '0.7rem 1rem', color: '#e8edf5', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  btnSave:     { background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: '8px', padding: '0.65rem 1.4rem', color: '#fff', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer' },
  btnSecondary:{ background: 'transparent', border: '1px solid #2a3550', borderRadius: '8px', padding: '0.4rem 0.9rem', color: '#8b9ab8', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' },
  settingItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid #2a3550' },
  toggle:      { width: '40px', height: '22px', borderRadius: '11px', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 },
  toggleThumb: { position: 'absolute', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', top: '3px', transition: 'left 0.2s' },
};
