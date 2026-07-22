import React, { useState } from 'react';
import { User, Mail, Phone, Calendar, Target, CheckCircle2, ShieldCheck, X } from 'lucide-react';

export default function StudentProfileModal({ currentProfile, onSaveProfile, onClose, isOpen }) {
  const [formData, setFormData] = useState({
    name: currentProfile?.name || '',
    email: currentProfile?.email || '',
    phone: currentProfile?.phone || '',
    targetYear: currentProfile?.targetYear || 'CLAT 2027',
    targetNlu: currentProfile?.targetNlu || 'NLSIU Bengaluru (Top 5 NLU)'
  });

  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Please provide at least your Name and Email address.');
      return;
    }
    setError('');
    onSaveProfile(formData);
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
            Student Profile Registration
          </h2>
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
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          <div style={{ textAlign: 'left', background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.18)', borderRadius: 'var(--radius-md)', padding: '12px', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', margin: 0 }}>
              <input 
                type="checkbox"
                defaultChecked={false}
                required
                style={{ marginTop: '3px', accentColor: 'var(--accent-primary)', width: '15px', height: '15px' }}
              />
              <span style={{ lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} /> DPDPA 2023 Compliance Notice:
                </strong>{' '}
                I consent to the collection & processing of my name, contact, and mock test scores for educational progress tracking under the Digital Personal Data Protection Act, 2023.
              </span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '8px' }}>
            <CheckCircle2 size={18} /> Save & Continue Practice
          </button>
        </form>
      </div>
    </div>
  );
}
