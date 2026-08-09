import { useCallback, useEffect, useState } from 'react';
import { deleteUser } from 'firebase/auth';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  activateChildAccount,
  getChildActivationRequest,
  getTrustedTokenClaims,
  logOutUser,
  signInWithGoogle
} from '../firebase';
import { privacyErrorMessage } from '../privacy';
import './Privacy.css';

export default function ChildActivationPage({ token }) {
  const [request, setRequest] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const result = await getChildActivationRequest(token);
    setRequest(result);
  }, [token]);

  useEffect(() => {
    sessionStorage.setItem('child_activation_token', token);
    window.history.replaceState({}, '', window.location.pathname);
    refresh().catch((err) => setError(privacyErrorMessage(
      err,
      'This student activation link is invalid, expired, or already used.'
    )));
  }, [refresh, token]);

  const activate = async () => {
    let signInResult;
    setBusy(true);
    setError('');
    try {
      signInResult = await signInWithGoogle();
      if (!signInResult?.user) throw new Error('Google sign-in was not completed.');
      await activateChildAccount(token);
      const claims = await getTrustedTokenClaims(signInResult.user, true);
      if (claims?.privacyStatus !== 'PARENT_VERIFIED' || claims?.subjectType !== 'CHILD') {
        throw new Error('The student account authorization could not be confirmed.');
      }
      sessionStorage.removeItem('child_activation_token');
      window.history.replaceState({}, '', window.location.pathname);
      setCompleted(true);
    } catch (err) {
      if (signInResult?.isNewUser && signInResult.user) {
        await deleteUser(signInResult.user).catch(() => logOutUser());
      } else {
        await logOutUser();
      }
      setError(privacyErrorMessage(
        err,
        'Student activation could not be completed. Use the exact Google email approved by the parent.'
      ));
    } finally {
      setBusy(false);
    }
  };

  const continueToStudio = () => {
    sessionStorage.removeItem('child_activation_token');
    window.location.assign('/');
  };

  return (
    <main className="privacy-page-shell">
      <section className="privacy-centre-card">
        <div className="privacy-modal-title">
          <ShieldCheck size={30} />
          <div>
            <h1>Activate student account</h1>
            <p>Parent or guardian consent has been recorded for this under-18 account.</p>
          </div>
        </div>

        {error && <div className="privacy-error" role="alert">{error}</div>}
        {!request && !error && <p>Checking the secure activation link…</p>}

        {request && !completed && (
          <div>
            <div className="privacy-student-summary">
              <div>
                <strong>{request.childName}</strong>
                <span>{request.childEmailMasked}</span>
              </div>
            </div>
            <p>
              Continue with the Google account for the approved student email. A different Google
              account will be rejected.
            </p>
            {request.activationExpiresAt && (
              <small>
                Activation expires: {new Date(request.activationExpiresAt).toLocaleString('en-IN')}
              </small>
            )}
            <button className="btn btn-primary privacy-full-button" disabled={busy} onClick={activate}>
              {busy ? 'Activating securely…' : 'Continue with Google and activate'}
            </button>
          </div>
        )}

        {completed && (
          <div className="privacy-pending">
            <div className="privacy-success-icon"><CheckCircle2 size={30} /></div>
            <h2>Student account activated</h2>
            <p>Your account is now linked to the recorded parent consent. Saved progress is enabled.</p>
            <button className="btn btn-primary" onClick={continueToStudio}>Open CLAT Prep Studio</button>
          </div>
        )}

        {error && (
          <button className="btn btn-secondary" onClick={continueToStudio}>Return to CLAT Prep Studio</button>
        )}
      </section>
    </main>
  );
}
