import { AlertTriangle, ArrowRight } from 'lucide-react';
import './UnsavedProgressBanner.css';

/**
 * Practice done without consent is never written to disk or to the cloud —
 * that is the DPDPA position and it does not change here. What changes is that
 * the learner is told. Previously the work simply vanished on reload with no
 * warning, which reads as a bug rather than a privacy choice.
 */
export default function UnsavedProgressBanner({ answeredCount, onEnableSaving }) {
  if (!answeredCount) return null;

  return (
    <div className="unsaved-progress-banner" role="status">
      <AlertTriangle size={18} />
      <p>
        <strong>
          {answeredCount} answer{answeredCount === 1 ? '' : 's'} in this session {answeredCount === 1 ? 'is' : 'are'} not being saved.
        </strong>{' '}
        We only store your progress once you have signed in and given consent. Close
        this tab and it is gone.
      </p>
      <button type="button" onClick={onEnableSaving}>
        Save my progress <ArrowRight size={15} />
      </button>
    </div>
  );
}
