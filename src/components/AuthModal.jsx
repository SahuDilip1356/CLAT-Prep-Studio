import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Users, X
} from 'lucide-react';
import PrivacyNotice from './PrivacyNotice';
import {
  createAdultConsentChoice, createParentInvitation, privacyErrorMessage
} from '../privacy';
import './Privacy.css';

export default function AuthModal({
  isOpen,
  onClose,
  onExistingGoogleSignIn,
  onAdultGoogleSignIn,
  onGuestContinue,
  onParentConsentRequested
}) {
  const [step, setStep] = useState('ENTRY');
  const [adultConsent, setAdultConsent] = useState(false);
  const [parentEmail, setParentEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [requestId, setRequestId] = useState('');
  const [requestExpiresAt, setRequestExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setStep('ENTRY');
    setAdultConsent(false);
    setParentEmail('');
    setChildName('');
    setChildEmail('');
    setRequestId('');
    setRequestExpiresAt('');
    setBusy(false);
    setError('');
  };

  const closeAndReset = () => {
    reset();
    onClose?.();
  };

  const continuePrivateSession = () => {
    onGuestContinue?.();
    closeAndReset();
  };

  const completeAdult = async () => {
    if (!adultConsent) {
      setError('Please review the notice and confirm the required educational processing.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onAdultGoogleSignIn(createAdultConsentChoice());
      closeAndReset();
    } catch (err) {
      setError(privacyErrorMessage(
        err,
        'We could not complete consent. No account access has been enabled.'
      ));
    } finally {
      setBusy(false);
    }
  };

  const signInExistingAccount = async () => {
    setBusy(true);
    setError('');
    try {
      await onExistingGoogleSignIn();
      closeAndReset();
    } catch (err) {
      setError(privacyErrorMessage(
        err,
        'This account could not be signed in. No cloud processing has been enabled.'
      ));
    } finally {
      setBusy(false);
    }
  };

  const submitParentRequest = async (event) => {
    event.preventDefault();
    if (!childName.trim() || !childEmail.trim() || !parentEmail.trim()) {
      setError('Please enter the student name, student email and parent or guardian email.');
      return;
    }
    if (childEmail.trim().toLowerCase() === parentEmail.trim().toLowerCase()) {
      setError('The student and parent must use different email addresses.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await onParentConsentRequested(createParentInvitation({
        parentEmail,
        childName,
        childEmail
      }));
      setRequestId(result.requestId);
      setRequestExpiresAt(result.expiresAt || '');
      setStep('PENDING');
    } catch (err) {
      setError(privacyErrorMessage(
        err,
        'The invitation could not be sent. No student data has been stored.'
      ));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="privacy-modal-backdrop" role="presentation">
      <div className="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-onboarding-title">
        {onClose && (
          <button className="privacy-icon-button privacy-modal-close" onClick={closeAndReset} aria-label="Close">
            <X size={20} />
          </button>
        )}

        <div className="privacy-stepper" aria-label="Onboarding progress">
          <span className={step === 'ENTRY' ? 'active' : 'done'}>1. Account</span>
          <span className={step === 'AGE' ? 'active' : ['ADULT', 'PARENT', 'PENDING'].includes(step) ? 'done' : ''}>2. Age band</span>
          <span className={step === 'ADULT' || step === 'PARENT' ? 'active' : step === 'PENDING' ? 'done' : ''}>3. Consent</span>
          <span className={step === 'PENDING' ? 'active' : ''}>4. Access</span>
        </div>

        {error && <div className="privacy-error" role="alert">{error}</div>}

        {step === 'ENTRY' && (
          <div>
            <div className="privacy-modal-title">
              <ShieldCheck size={28} />
              <div>
                <h2 id="privacy-onboarding-title">Save and continue your CLAT progress</h2>
                <p>Sign in to an activated account or create one through the applicable privacy route.</p>
              </div>
            </div>
            <button
              className="btn btn-primary privacy-full-button"
              disabled={busy}
              onClick={signInExistingAccount}
            >
              {busy ? 'Checking account…' : 'Sign in to existing account'}
            </button>
            <button
              className="btn btn-secondary privacy-full-button"
              disabled={busy}
              onClick={() => {
                setError('');
                setStep('AGE');
              }}
            >
              Create account <ArrowRight size={16} />
            </button>
            <button
              className="btn btn-secondary privacy-full-button"
              disabled={busy}
              onClick={continuePrivateSession}
            >
              Continue without an account
            </button>
            <div className="privacy-safety-note">
              <LockKeyhole size={18} />
              Students under 18 can activate a separate account only after their parent or lawful
              guardian confirms the request and gives consent.
            </div>
          </div>
        )}

        {step === 'AGE' && (
          <div>
            <button className="privacy-back-button" onClick={() => {
              setError('');
              setStep('ENTRY');
            }}>
              <ArrowLeft size={15} /> Back to account options
            </button>
            <div className="privacy-modal-title">
              <ShieldCheck size={28} />
              <div>
                <h2 id="privacy-onboarding-title">Is the student 18 years or older?</h2>
                <p>Google does not give us a verified age, so this choice is required before sign-in.</p>
              </div>
            </div>
            <div className="privacy-action-row">
              <button className="btn btn-primary" onClick={() => {
                setError('');
                setStep('ADULT');
              }}>
                Yes, 18 or older <ArrowRight size={16} />
              </button>
              <button className="btn btn-secondary" onClick={() => {
                setError('');
                setStep('PARENT');
              }}>
                No, under 18
              </button>
            </div>
            <div className="privacy-safety-note">
              <LockKeyhole size={18} />
              No date-of-birth document or identity proof is required to use the learning platform.
            </div>
          </div>
        )}

        {step === 'ADULT' && (
          <div>
            <button className="privacy-back-button" onClick={() => {
              setError('');
              setStep('AGE');
            }}>
              <ArrowLeft size={15} /> Change age band
            </button>
            <div className="privacy-modal-title">
              <ShieldCheck size={28} />
              <div>
                <h2 id="privacy-onboarding-title">Your privacy choices</h2>
                <p>You declared that you are 18 or older and can act for yourself.</p>
              </div>
            </div>
            <PrivacyNotice />
            <label className="privacy-consent-row">
              <input type="checkbox" checked={adultConsent} onChange={(e) => setAdultConsent(e.target.checked)} />
              <span>
                I confirm I am 18 or older and consent to the required use of my account and practice
                data to save progress and provide educational feedback. I can withdraw consent and
                request correction or erasure.
              </span>
            </label>
            <button className="btn btn-primary privacy-full-button" disabled={busy} onClick={completeAdult}>
              {busy ? 'Creating verified consent…' : 'Consent and continue with Google'}
            </button>
          </div>
        )}

        {step === 'PARENT' && (
          <form onSubmit={submitParentRequest}>
            <button className="privacy-back-button" type="button" onClick={() => {
              setError('');
              setStep('AGE');
            }}>
              <ArrowLeft size={15} /> Change age band
            </button>
            <div className="privacy-modal-title">
              <Users size={28} />
              <div>
                <h2 id="privacy-onboarding-title">Ask a parent or guardian</h2>
                <p>
                  We will send a secure consent link to the parent or lawful guardian. No student
                  account is created until consent is completed.
                </p>
              </div>
            </div>
            <label className="privacy-field">
              <span>Student name</span>
              <input
                type="text"
                autoComplete="name"
                maxLength={120}
                value={childName}
                onChange={(event) => setChildName(event.target.value)}
                required
              />
            </label>
            <label className="privacy-field">
              <span>Student email</span>
              <input
                type="email"
                autoComplete="email"
                value={childEmail}
                onChange={(event) => setChildEmail(event.target.value)}
                required
              />
              <small>The student must later sign in with this exact Google email address.</small>
            </label>
            <label className="privacy-field">
              <span>Parent or lawful guardian email</span>
              <input
                type="email"
                autoComplete="email"
                value={parentEmail}
                onChange={(event) => setParentEmail(event.target.value)}
                required
              />
              <small>
                The parent will use the emailed link to review the student details, declare their
                relationship and give consent.
              </small>
            </label>
            <button className="btn btn-primary privacy-full-button" disabled={busy} type="submit">
              {busy ? 'Sending consent request…' : 'Send parent consent request'}
            </button>
            <button className="btn btn-secondary privacy-full-button" disabled={busy} type="button" onClick={continuePrivateSession}>
              Continue learning without an account
            </button>
          </form>
        )}

        {step === 'PENDING' && (
          <div className="privacy-pending">
            <div className="privacy-success-icon"><CheckCircle2 size={30} /></div>
            <h2 id="privacy-onboarding-title">Parent consent request sent</h2>
            <p>
              The parent or guardian must open the secure email link, confirm the student details
              and give consent. No student account has been created yet.
            </p>
            {requestId && <small>Request reference: {requestId}</small>}
            <p>
              The request expires after 48 hours. After consent, an activation link will be sent to
              the student email for Google registration.
            </p>
            {requestExpiresAt && (
              <small>Parent-contact record expires: {new Date(requestExpiresAt).toLocaleString('en-IN')}</small>
            )}
            <div className="privacy-safety-note">
              <LockKeyhole size={18} />
              Google sign-in, cloud sync and identifiable analytics remain off until the student
              completes the consent-authorized activation.
            </div>
            <button className="btn btn-secondary privacy-full-button" onClick={continuePrivateSession}>
              Continue learning privately
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
