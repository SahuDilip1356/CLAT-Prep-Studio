import { ExternalLink, ShieldCheck } from 'lucide-react';

export default function PrivacyNotice({ compact = false }) {
  const legalName = import.meta.env.VITE_PRIVACY_LEGAL_NAME || 'CLAT Prep Studio';
  const privacyEmail = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL || '';
  return (
    <section className={`privacy-notice ${compact ? 'is-compact' : ''}`} aria-labelledby="student-privacy-notice-title">
      <div className="privacy-notice-heading">
        <ShieldCheck size={18} aria-hidden="true" />
        <h3 id="student-privacy-notice-title">How we use student information</h3>
      </div>
      <p>
        {legalName} uses the student’s name, email, Google sign-in identifier, practice answers, scores,
        time spent and progress to create the account, save learning history and provide educational feedback.
        Cloud sync and identifiable analytics start only after the applicable consent route is complete.
      </p>
      {!compact && (
        <ul>
          <li>Required purpose 1: authenticate the account and save cross-device progress.</li>
          <li>Required purpose 2: analyse answers and scores to provide learning feedback.</li>
          <li>Optional parent reports and marketing are off unless separately offered and chosen later.</li>
          <li>Processors: Google Firebase for authentication, database, functions and hosting; the configured transactional email provider for consent and rights messages.</li>
          <li>Rights: access, correction, completion, updating, erasure, grievance and nomination through the Privacy Centre.</li>
          <li>Withdrawal: use the Privacy Centre; withdrawing required consent closes cloud access and starts the verified deletion workflow.</li>
          <li>Retention: account data lasts while the account and purpose remain active; pending parent invitations expire after 48 hours and unused activation codes after 24 hours.</li>
        </ul>
      )}
      {privacyEmail ? (
        <a href={`mailto:${privacyEmail}`}>
          Contact the privacy team: {privacyEmail} <ExternalLink size={13} aria-hidden="true" />
        </a>
      ) : (
        <strong>Production privacy contact must be configured before deployment.</strong>
      )}
    </section>
  );
}
