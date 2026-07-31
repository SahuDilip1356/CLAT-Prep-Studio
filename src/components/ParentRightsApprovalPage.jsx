import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  approveChildRightsRequest, getChildRightsApproval, logOutUser, signInWithGoogle
} from '../firebase';
import { privacyErrorMessage } from '../privacy';
import './Privacy.css';

const LABELS = {
  ACCESS: 'access a copy and summary of the child’s data',
  CORRECTION: 'correct or update the child’s data',
  ERASURE: 'erase the child account and personal data',
  WITHDRAWAL: 'withdraw consent and close the child account',
  GRIEVANCE: 'raise a privacy grievance',
  NOMINATION: 'record a privacy nominee'
};

export default function ParentRightsApprovalPage({ token }) {
  const [request, setRequest] = useState(null);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    sessionStorage.setItem('rights_approval_token', token);
    window.history.replaceState({}, '', window.location.pathname);
    getChildRightsApproval(token)
      .then(setRequest)
      .catch((err) => setError(privacyErrorMessage(
        err,
        'This approval link could not be verified. It may be invalid or expired.'
      )));
  }, [token]);

  const approve = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await signInWithGoogle();
      if (!result?.user) throw new Error('Google sign-in was not completed.');
      await approveChildRightsRequest(token);
      await logOutUser();
      sessionStorage.removeItem('rights_approval_token');
      setApproved(true);
    } catch (err) {
      setError(privacyErrorMessage(err, 'Approval could not be recorded.'));
    } finally {
      setBusy(false);
    }
  };

  const returnToStudio = async () => {
    sessionStorage.removeItem('rights_approval_token');
    await logOutUser();
    window.location.assign('/');
  };

  return (
    <main className="privacy-page-shell">
      <section className="privacy-centre-card">
        <div className="privacy-modal-title">
          <ShieldCheck size={30} />
          <div>
            <h1>Approve a child privacy request</h1>
            <p>Only the parent or guardian verified during onboarding can authorize this action.</p>
          </div>
        </div>
        {error && (
          <>
            <div className="privacy-error" role="alert">{error}</div>
            <button className="btn btn-secondary" onClick={returnToStudio}>Return to CLAT Prep Studio</button>
          </>
        )}
        {!request && !error && <p>Checking the secure approval link…</p>}
        {request && !approved && (
          <div>
            <p>The request asks us to <strong>{LABELS[request.type] || request.type}</strong>.</p>
            <p>Sign in with the same Google account used for the original parent verification.</p>
            <button className="btn btn-primary" disabled={busy || request.status !== 'PENDING_GUARDIAN_AUTHORIZATION'} onClick={approve}>
              {busy ? 'Authenticating and approving…' : 'Authenticate and approve'}
            </button>
          </div>
        )}
        {approved && (
          <div className="privacy-pending">
            <CheckCircle2 size={30} />
            <h2>Request authorized</h2>
            <p>It has entered the verified processing queue and will be handled under the published service target.</p>
            <button className="btn btn-secondary" onClick={returnToStudio}>Return to CLAT Prep Studio</button>
          </div>
        )}
      </section>
    </main>
  );
}
