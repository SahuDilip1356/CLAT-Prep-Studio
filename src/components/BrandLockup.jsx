import './BrandLockup.css';

export default function BrandLockup({ className = '', showTagline = true }) {
  return (
    <div className={`brand-lockup ${className}`.trim()}>
      <img className="brand-lockup-mark" src="/logo-mark.svg" alt="" aria-hidden="true" />
      <div className="brand-lockup-copy">
        <div className="brand-lockup-title">
          CLAT <span className="brand-lockup-prep">Prep</span> <span className="brand-lockup-studio">Studio</span>
        </div>
        {showTagline && <div className="brand-lockup-tagline">Think clearly. Argue sharply. Rank higher.</div>}
      </div>
    </div>
  );
}
