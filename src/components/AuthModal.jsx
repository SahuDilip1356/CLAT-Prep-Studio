import React, { useState } from 'react';
import { LogIn, User, Mail, Sparkles, ShieldCheck, Smartphone, Globe, X, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onGoogleSignIn, onEmailLogin, onGuestContinue }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dpdpaConsent, setDpdpaConsent] = useState(false);
  const [loginMode, setLoginMode] = useState('QUICK');

  if (!isOpen) return null;

  const handleQuickLoginSubmit = (e) => {
    e.preventDefault();
    if (!dpdpaConsent) {
      alert('Please check the DPDPA 2023 consent box to proceed with sign in.');
      return;
    }
    if (!name.trim() || !email.trim()) return;
    onEmailLogin({
      name: name.trim(),
      email: email.trim(),
      targetYear: 'CLAT 2027',
      targetNlu: 'NLSIU Bengaluru',
      dpdpaConsentedAt: new Date().toISOString()
    });
  };

  const handleGoogleClick = () => {
    if (!dpdpaConsent) {
      alert('Please check the DPDPA 2023 consent box to proceed with Google sign in.');
      return;
    }
    onGoogleSignIn();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '500px', width: '100%', padding: '32px',
        borderRadius: 'var(--radius-lg)', textAlign: 'center',
        background: 'var(--bg-card)', position: 'relative'
      }}>
        {onClose && (
          <button 
            onClick={onClose}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        )}

        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'rgba(37, 99, 235, 0.12)', color: 'var(--accent-primary)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '14px'
        }}>
          <Globe size={28} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
          Student Sign In & Progress Sync
        </h2>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', background: 'var(--bg-primary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <button 
            className={`nav-tab-btn ${loginMode === 'QUICK' ? 'active' : ''}`}
            onClick={() => setLoginMode('QUICK')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <User size={16} /> Instant Sign In
          </button>
          <button 
            className={`nav-tab-btn ${loginMode === 'GOOGLE' ? 'active' : ''}`}
            onClick={() => setLoginMode('GOOGLE')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Google Sign In
          </button>
        </div>

        {loginMode === 'QUICK' ? (
          <form onSubmit={handleQuickLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Full Student Name"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px 10px 40px',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)', color: 'var(--text-primary)',
                  fontSize: '0.9rem', outline: 'none'
                }}
                required
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                placeholder="Email Address (e.g. dilip@clatprep.com)"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px 10px 40px',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)', color: 'var(--text-primary)',
                  fontSize: '0.9rem', outline: 'none'
                }}
                required
              />
            </div>

            <div style={{ textAlign: 'left', background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.18)', borderRadius: 'var(--radius-md)', padding: '12px', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', margin: 0 }}>
                <input 
                  type="checkbox"
                  checked={dpdpaConsent}
                  onChange={e => setDpdpaConsent(e.target.checked)}
                  style={{ marginTop: '3px', accentColor: 'var(--accent-primary)', width: '15px', height: '15px' }}
                />
                <span style={{ lineHeight: 1.4 }}>
                  <strong style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={13} /> DPDPA 2023 Data Privacy Notice:
                  </strong>{' '}
                  I consent to the collection & processing of my name, email, and mock test performance metrics for educational progress tracking under DPDPA 2023.
                </span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              Sign In & Sync Progress <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            <button 
              onClick={handleGoogleClick}
              className="btn"
              style={{
                width: '100%', padding: '12px', justifyContent: 'center',
                background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem',
                marginBottom: '14px', borderRadius: 'var(--radius-md)'
              }}
            >
              Continue with Google Account
            </button>

            <div style={{ textAlign: 'left', background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.18)', borderRadius: 'var(--radius-md)', padding: '12px', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', margin: 0 }}>
                <input 
                  type="checkbox"
                  checked={dpdpaConsent}
                  onChange={e => setDpdpaConsent(e.target.checked)}
                  style={{ marginTop: '3px', accentColor: 'var(--accent-primary)', width: '15px', height: '15px' }}
                />
                <span style={{ lineHeight: 1.4 }}>
                  <strong style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={13} /> DPDPA 2023 Data Privacy Notice:
                  </strong>{' '}
                  I consent to the collection & processing of my Google account details for educational progress tracking under DPDPA 2023.
                </span>
              </label>
            </div>
          </div>
        )}

        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} /> Encrypted & DPDPA 2023 Compliant
          </span>
          <button onClick={onGuestContinue} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
