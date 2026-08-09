import { useEffect, useState } from 'react';
import { User, CheckCircle2, X } from 'lucide-react';

const profileFormData = (currentProfile, currentUser) => ({
  name: currentProfile?.name || currentUser?.displayName || '',
  email: currentProfile?.email || currentUser?.email || '',
  phone: currentProfile?.phone || '',
  targetYear: currentProfile?.targetYear || 'CLAT 2027',
  targetNlu: currentProfile?.targetNlu || 'NLSIU Bengaluru (Top 5 NLU)'
});

export default function StudentProfileModal({ currentProfile, currentUser, onSaveProfile, onClose, isOpen }) {
  const [formData, setFormData] = useState({
    ...profileFormData(currentProfile, currentUser)
  });

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setFormData(profileFormData(currentProfile, currentUser));
  }, [isOpen, currentProfile, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Please provide at least your Name and Email address.');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      await onSaveProfile(formData);
    } catch (saveError) {
      setError(saveError?.message || 'Your profile could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '520px', width: '100%', padding: '32px',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
        position: 'relative', background: 'var(--bg-card)'
      }}>
        {onClose && (
          <button 
            onClick={onClose}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex', padding: '12px', borderRadius: '50%',
            background: 'var(--accent-success-bg)', color: 'var(--accent-primary)',
            marginBottom: '12px'
          }}>
            <User size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Complete student profile
          </h2>
          <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Your verified Google details are filled automatically. Confirm your name to continue.
          </p>
        </div>

        {error && (
          <div style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Full Student Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Dilip Sahu"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email Address *</label>
            <input 
              type="email" 
              placeholder="e.g. student@clatprep.com"
              value={formData.email}
              readOnly={Boolean(currentUser?.email)}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', opacity: currentUser?.email ? 0.8 : 1 }}
              required
            />
            {currentUser?.email && (
              <small style={{ display: 'block', marginTop: '6px', color: 'var(--text-muted)' }}>
                Verified by Google and used for this account.
              </small>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '8px' }}>
            <CheckCircle2 size={18} /> {isSaving ? 'Saving profile…' : 'Save & Continue Practice'}
          </button>
        </form>
      </div>
    </div>
  );
}
