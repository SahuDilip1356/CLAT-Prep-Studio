import { useEffect, useState } from 'react';
import {
  Download, Eraser, FileCheck2, KeyRound, LifeBuoy, PencilLine, RefreshCw, ShieldCheck, X
} from 'lucide-react';
import { createRightsRequest, PRIVACY_STATUS, privacyErrorMessage } from '../privacy';
import './Privacy.css';

const REQUEST_TYPES = {
  ACCESS: {
    title: 'Access my information',
    description: 'Request a summary of personal data, purposes and processors.',
    icon: Download
  },
  CORRECTION: {
    title: 'Correct or update data',
    description: 'Correct inaccurate information, complete missing data or update an old value.',
    icon: PencilLine
  },
  ERASURE: {
    title: 'Request erasure',
    description: 'Request account closure and erasure, subject to necessary lawful retention.',
    icon: Eraser
  },
  WITHDRAWAL: {
    title: 'Withdraw consent',
    description: 'Stop optional processing or request closure when core consent is withdrawn.',
    icon: KeyRound
  },
  GRIEVANCE: {
    title: 'Raise a grievance',
    description: 'Tell our privacy contact if you believe information has been handled incorrectly.',
    icon: LifeBuoy
  },
  NOMINATION: {
    title: 'Privacy nominee',
    description: 'Record a person who may exercise rights in the event of death or incapacity.',
    icon: FileCheck2
  }
};

export default function PrivacyCentre({
  privacyState,
  studentProfile,
  requests = [],
  onSubmitRequest,
  onRefreshRequests
}) {
  const [activeType, setActiveType] = useState(null);
  const [details, setDetails] = useState('');
  const [changes, setChanges] = useState({
    name: studentProfile?.name || '',
    email: studentProfile?.email || '',
    targetYear: studentProfile?.targetYear || '',
    targetNlu: studentProfile?.targetNlu || ''
  });
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requestError, setRequestError] = useState('');
  const isChild = privacyState?.ageBand === 'CHILD';
  const requesterRole = isChild ? 'VERIFIED_PARENT' : 'STUDENT';

  const refresh = async () => {
    if (!onRefreshRequests) return;
    setRefreshing(true);
    setRequestError('');
    try {
      await onRefreshRequests();
    } catch (error) {
      setRequestError(privacyErrorMessage(error, 'Request status could not be refreshed.'));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 30000);
    return () => window.clearInterval(interval);
    // Refresh when the signed-in account changes; the callback itself is intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privacyState?.status]);

  const submit = async (event) => {
    event.preventDefault();
    if (!activeType) return;
    if ((activeType === 'ERASURE' || activeType === 'WITHDRAWAL') && !confirmed) return;

    const requestedChanges = activeType === 'CORRECTION' ? changes : null;
    const request = createRightsRequest({
      type: activeType,
      requesterRole,
      details,
      requestedChanges
    });
    setBusy(true);
    setRequestError('');
    try {
      await onSubmitRequest(request);
      setActiveType(null);
      setDetails('');
      setConfirmed(false);
    } catch (error) {
      setRequestError(privacyErrorMessage(error, 'The privacy request could not be submitted.'));
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = privacyState?.status === PRIVACY_STATUS.PARENT_VERIFIED
    ? 'Parent verified'
    : privacyState?.status === PRIVACY_STATUS.ADULT_CONSENTED
      ? 'Adult consent recorded'
      : 'Private session mode';

  return (
    <div className="privacy-centre">
      <section className="privacy-centre-hero">
        <div>
          <div className="privacy-eyebrow">Student & parent privacy centre</div>
          <h1>Your information, your choices</h1>
          <p>
            Review the account’s privacy status and make an access, correction, erasure or grievance request.
            {isChild && ' A verified parent or lawful guardian acts for this child account.'}
          </p>
        </div>
        <span className="privacy-status-badge">{statusLabel}</span>
      </section>

      <div className="privacy-centre-grid">
        {Object.entries(REQUEST_TYPES).map(([type, item]) => {
          const Icon = item.icon;
          return (
            <article className="glass-card privacy-right-card" key={type}>
              <h2><Icon size={18} /> {item.title}</h2>
              <p>{item.description}</p>
              <button
                className={`btn ${type === 'ERASURE' ? 'privacy-danger-button' : 'btn-secondary'}`}
                onClick={() => {
                  setActiveType(type);
                  setConfirmed(false);
                }}
              >
                Start request
              </button>
            </article>
          );
        })}
      </div>

      <section className="glass-panel privacy-request-list">
        <div className="privacy-request-list-heading">
          <h2>Your requests</h2>
          <button className="btn btn-secondary" disabled={refreshing} onClick={refresh}>
            <RefreshCw size={15} /> {refreshing ? 'Refreshing…' : 'Refresh status'}
          </button>
        </div>
        {requestError && <div className="privacy-error" role="alert">{requestError}</div>}
        {requests.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No privacy requests submitted yet.</p>
        ) : requests.map((request) => (
          <div className="privacy-request-item" key={request.requestId}>
            <div>
              <strong>{REQUEST_TYPES[request.type]?.title || request.type}</strong><br />
              <small>{request.requestId} · Submitted {new Date(request.submittedAt).toLocaleDateString('en-IN')}</small>
            </div>
            <span className="privacy-status-badge">{request.status}</span>
          </div>
        ))}
      </section>

      {activeType && (
        <div className="privacy-modal-backdrop">
          <form className="privacy-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="rights-request-title">
            <button type="button" className="privacy-icon-button privacy-modal-close" onClick={() => setActiveType(null)} aria-label="Close request">
              <X size={20} />
            </button>
            <div className="privacy-modal-title">
              <ShieldCheck size={28} />
              <div>
                <h2 id="rights-request-title">{REQUEST_TYPES[activeType].title}</h2>
                <p>Request ID and a 30-day internal target date will be created when you submit.</p>
              </div>
            </div>
            {requestError && <div className="privacy-error" role="alert">{requestError}</div>}

            {activeType === 'CORRECTION' && (
              <>
                <div className="privacy-grid-two">
                  <label className="privacy-field">
                    <span>Correct name</span>
                    <input value={changes.name} onChange={(e) => setChanges({ ...changes, name: e.target.value })} required />
                  </label>
                  <label className="privacy-field">
                    <span>Correct email</span>
                    <input type="email" value={changes.email} onChange={(e) => setChanges({ ...changes, email: e.target.value })} required />
                    <small>Email changes require control of the new address before becoming authoritative.</small>
                  </label>
                  <label className="privacy-field">
                    <span>Target year</span>
                    <input value={changes.targetYear} onChange={(e) => setChanges({ ...changes, targetYear: e.target.value })} />
                  </label>
                  <label className="privacy-field">
                    <span>Target NLU</span>
                    <input value={changes.targetNlu} onChange={(e) => setChanges({ ...changes, targetNlu: e.target.value })} />
                  </label>
                </div>
              </>
            )}

            <label className="privacy-field">
              <span>{activeType === 'CORRECTION' ? 'What needs correcting?' : 'Tell us what you need'}</span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add enough detail for the privacy team to locate and handle the request."
                required
              />
            </label>

            {(activeType === 'ERASURE' || activeType === 'WITHDRAWAL') && (
              <label className="privacy-consent-row">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>
                  I understand this may stop cloud sync and access to saved progress. Data that must be retained
                  for a specified purpose or applicable law will be identified in the response.
                </span>
              </label>
            )}

            <button className="btn btn-primary privacy-full-button" disabled={busy} type="submit">
              {busy ? 'Verifying and submitting…' : 'Submit privacy request'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
