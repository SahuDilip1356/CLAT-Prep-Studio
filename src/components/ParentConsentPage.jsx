import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import PrivacyNotice from './PrivacyNotice';
import {
  authenticateParentForConsent,
  captureParentConsent,
  getParentConsentRequest,
  logOutUser,
  signInWithGoogle,
  startParentAdultVerification
} from '../firebase';
import {
  CONSENT_VERSION, PRIVACY_NOTICE_VERSION, privacyErrorMessage
} from '../privacy';
import './Privacy.css';

export default function ParentConsentPage({ token }) {
  const [request, setRequest] = useState(null);
  const [relationship, setRelationship] = useState('PARENT');
  const [declaration, setDeclaration] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const result = await getParentConsentRequest(token);
    setRequest(result);
  }, [token]);

  useEffect(() => {
    sessionStorage.setItem('parent_consent_token', token);
    window.history.replaceState({}, '', window.location.pathname);
    refresh().catch((err) => setError(privacyErrorMessage(
      err,
      'This invitation could not be verified. It may be invalid, expired, or the verification service may be unavailable.'
    )));
  }, [refresh, token]);

  const authenticate = async () => {
    setBusy(true);
    setError('');
    try {
      const signInResult = await signInWithGoogle();
      if (!signInResult?.user) throw new Error('Google sign-in was cancelled.');
      const authenticationResult = await authenticateParentForConsent(token);
      setRequest((current) => ({ ...current, ...authenticationResult }));
      const verificationResult = await startParentAdultVerification(token);
      window.location.assign(verificationResult.redirectUrl);
    } catch (err) {
      setError(privacyErrorMessage(
        err,
        'We could not continue parent confirmation. The student can still use the learning platform without an account.'
      ));
    } finally {
      setBusy(false);
    }
  };

  const startVerification = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await startParentAdultVerification(token);
      window.location.assign(result.redirectUrl);
    } catch (err) {
      setError(privacyErrorMessage(err, 'Adult verification is not available.'));
      setBusy(false);
    }
  };

  const consent = async () => {
    if (!declaration) {
      setError('Confirm the parent or lawful guardian declaration.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await captureParentConsent({
        token,
        relationship,
        guardianDeclaration: true,
        noticeVersion: PRIVACY_NOTICE_VERSION,
        consentVersion: CONSENT_VERSION,
        purposes: {
          accountAndProgress: true,
          learningAnalytics: true,
          parentReports: false,
          marketing: false
        }
      });
      await logOutUser();
      setActivationCode(result.activationCode);
      setRequest((current) => ({ ...current, status: result.status }));
      sessionStorage.removeItem('parent_consent_token');
    } catch (err) {
      setError(privacyErrorMessage(err, 'Consent could not be recorded.'));
    } finally {
      setBusy(false);
    }
  };

  const returnToStudio = async () => {
    sessionStorage.removeItem('parent_consent_token');
    await logOutUser();
    window.location.assign('/');
  };

  return (
    <main className="privacy-page-shell">
      <section className="privacy-centre-card">
        <div className="privacy-modal-title">
          <ShieldCheck size={30} />
          <div>
            <h1>Quick parent consent</h1>
            <p>
              This is only for enabling the student’s Google sign-in and saved progress.
              No proof is required for the student to use the learning platform.
            </p>
          </div>
        </div>

        {error && (
          <>
            <div className="privacy-error" role="alert">{error}</div>
            <button className="btn btn-secondary" onClick={returnToStudio}>Return to CLAT Prep Studio</button>
          </>
        )}
        {!request && !error && <p>Checking the secure invitation…</p>}

        {request && request.status === 'INVITATION_SENT' && (
          <div>
            <p>
              Sign in with the Google email address that received this invitation. We will then
              take you directly to the short adult-status check.
            </p>
            <button className="btn btn-primary" disabled={busy} onClick={authenticate}>
              {busy ? 'Continuing securely…' : 'Confirm parent email and continue'}
            </button>
          </div>
        )}

        {request && request.status === 'PARENT_AUTHENTICATED' && (
          <div>
            <p>
              Parent email ownership is confirmed. Complete the short adult-status check to enable
              the student’s account. CLAT Prep Studio does not ask the student for a date of birth
              or identity document.
            </p>
            <button className="btn btn-primary" disabled={busy} onClick={startVerification}>
              Continue parent confirmation <ExternalLink size={16} />
            </button>
            <button className="btn btn-secondary" disabled={busy} onClick={() => refresh().catch(setError)}>
              I completed verification — refresh
            </button>
          </div>
        )}

        {request
          && ['PARENT_ADULT_VERIFIED', 'PARENT_CONSENT_CAPTURED', 'ACTIVATION_EXPIRED'].includes(request.status)
          && !activationCode && (
          <div>
            <PrivacyNotice />
            <label className="privacy-field">
              <span>Relationship to the student</span>
              <select value={relationship} onChange={(event) => setRelationship(event.target.value)}>
                <option value="PARENT">Parent</option>
                <option value="LAWFUL_GUARDIAN">Lawful guardian</option>
              </select>
            </label>
            <label className="privacy-consent-row">
              <input type="checkbox" checked={declaration} onChange={(event) => setDeclaration(event.target.checked)} />
              <span>
                I confirm I am the student’s parent or lawful guardian and give verifiable consent for
                the required account, saved-progress and learning-feedback purposes described above.
                Optional parent reports and marketing remain off.
              </span>
            </label>
            <button className="btn btn-primary privacy-full-button" disabled={busy} onClick={consent}>
              {busy
                ? 'Recording consent…'
                : request.status === 'PARENT_ADULT_VERIFIED'
                  ? 'Give verified parental consent'
                  : 'Issue a new activation code'}
            </button>
          </div>
        )}

        {activationCode && (
          <div className="privacy-pending">
            <div className="privacy-success-icon"><CheckCircle2 size={30} /></div>
            <h2>Consent recorded</h2>
            <p>Give this one-time code to the student. It is also being sent to your email.</p>
            <div className="privacy-activation-code">{activationCode}</div>
            <p>The student can now choose “under 18”, enter this code, and then sign in with their own Google account.</p>
            <button className="btn btn-secondary" onClick={returnToStudio}>Return to CLAT Prep Studio</button>
          </div>
        )}

        {request && request.status === 'CHILD_ACCOUNT_ACTIVATED' && !activationCode && (
          <div className="privacy-pending">
            <CheckCircle2 size={30} />
            <h2>Student account activated</h2>
            <p>This consent has already been used.</p>
          </div>
        )}
      </section>
    </main>
  );
}
