import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, Users } from 'lucide-react';
import PrivacyNotice from './PrivacyNotice';
import {
  captureParentConsent,
  getParentConsentRequest
} from '../firebase';
import {
  CONSENT_VERSION, PRIVACY_NOTICE_VERSION, privacyErrorMessage
} from '../privacy';
import './Privacy.css';

const RELATIONSHIP_LABELS = {
  FATHER: 'Father',
  MOTHER: 'Mother',
  LAWFUL_GUARDIAN: 'Lawful guardian'
};

export default function ParentConsentPage({ token }) {
  const [request, setRequest] = useState(null);
  const [relationship, setRelationship] = useState('FATHER');
  const [adultDeclaration, setAdultDeclaration] = useState(false);
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [consentDeclaration, setConsentDeclaration] = useState(false);
  const [completion, setCompletion] = useState(null);
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
      'This invitation is invalid, expired, or already used.'
    )));
  }, [refresh, token]);

  const consent = async () => {
    if (!adultDeclaration || !detailsConfirmed || !consentDeclaration) {
      setError('Please complete all three confirmations before providing consent.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await captureParentConsent({
        token,
        relationship,
        adultDeclaration: true,
        guardianDeclaration: true,
        studentDetailsConfirmed: true,
        noticeVersion: PRIVACY_NOTICE_VERSION,
        consentVersion: CONSENT_VERSION,
        purposes: {
          accountAndProgress: true,
          learningAnalytics: true,
          parentReports: false,
          marketing: false
        }
      });
      setCompletion(result);
      sessionStorage.removeItem('parent_consent_token');
      window.history.replaceState({}, '', window.location.pathname);
    } catch (err) {
      setError(privacyErrorMessage(
        err,
        'Consent could not be recorded. No student account has been activated.'
      ));
    } finally {
      setBusy(false);
    }
  };

  const returnToStudio = () => {
    sessionStorage.removeItem('parent_consent_token');
    window.location.assign('/');
  };

  if (completion) {
    return (
      <main className="privacy-page-shell">
        <section className="privacy-centre-card privacy-pending">
          <div className="privacy-success-icon"><CheckCircle2 size={30} /></div>
          <h1>Parent consent recorded</h1>
          <p>
            The student activation email was sent to {completion.childEmailMasked}.
            No student account existed before this consent.
          </p>
          {completion.activationExpiresAt && (
            <small>
              The activation link expires: {new Date(completion.activationExpiresAt).toLocaleString('en-IN')}
            </small>
          )}
          <p>
            The student must open that email and sign in with the exact approved Google account.
          </p>
          <button className="btn btn-secondary" onClick={returnToStudio}>Return to CLAT Prep Studio</button>
        </section>
      </main>
    );
  }

  return (
    <main className="privacy-page-shell">
      <section className="privacy-centre-card">
        <div className="privacy-modal-title">
          <ShieldCheck size={30} />
          <div>
            <h1>Parent or guardian consent</h1>
            <p>
              Review the student details and the privacy notice before allowing creation of an
              under-18 student account.
            </p>
          </div>
        </div>

        {error && <div className="privacy-error" role="alert">{error}</div>}
        {!request && !error && <p>Checking the secure invitation…</p>}

        {request && ['PARENT_INVITATION_SENT', 'ACTIVATION_DELIVERY_FAILED'].includes(request.status) && (
          <div>
            <div className="privacy-student-summary">
              <Users size={22} />
              <div>
                <strong>{request.childName}</strong>
                <span>{request.childEmail}</span>
              </div>
            </div>

            <label className="privacy-field">
              <span>Your relationship to the student</span>
              <select value={relationship} onChange={(event) => setRelationship(event.target.value)}>
                {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <PrivacyNotice />

            <label className="privacy-consent-row">
              <input
                type="checkbox"
                checked={adultDeclaration}
                onChange={(event) => setAdultDeclaration(event.target.checked)}
              />
              <span>I confirm that I am 18 or older.</span>
            </label>
            <label className="privacy-consent-row">
              <input
                type="checkbox"
                checked={detailsConfirmed}
                onChange={(event) => setDetailsConfirmed(event.target.checked)}
              />
              <span>
                I confirm that I am the student’s {RELATIONSHIP_LABELS[relationship].toLowerCase()}
                {' '}and that the displayed student name and email are correct.
              </span>
            </label>
            <label className="privacy-consent-row">
              <input
                type="checkbox"
                checked={consentDeclaration}
                onChange={(event) => setConsentDeclaration(event.target.checked)}
              />
              <span>
                I give consent for the required account, saved-progress and educational-feedback
                processing described above. Optional parent reports and marketing remain off.
              </span>
            </label>

            <button className="btn btn-primary privacy-full-button" disabled={busy} onClick={consent}>
              {busy ? 'Recording consent…' : 'Confirm details and provide consent'}
            </button>
          </div>
        )}

        {request && request.status === 'CHILD_ACCOUNT_ACTIVATED' && (
          <div className="privacy-pending">
            <CheckCircle2 size={30} />
            <h2>Student account already activated</h2>
            <p>This parent consent request has already been completed and used.</p>
          </div>
        )}

        {error && (
          <button className="btn btn-secondary" onClick={returnToStudio}>Return to CLAT Prep Studio</button>
        )}
      </section>
    </main>
  );
}
