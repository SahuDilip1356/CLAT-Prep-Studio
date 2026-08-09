import './StudioShell.css';

/**
 * Shared workspace chrome for every study module.
 *
 * Modules differ only in their accent, their mark and which views they expose;
 * everything structural — the rail, the mobile view switcher, the readiness
 * meter, the responsive collapse — lives here so the modules cannot drift apart.
 */
export default function StudioShell({
  accent,
  mark,
  title,
  subtitle,
  navItems,
  activeView,
  onChangeView,
  status,
  children,
}) {
  const renderNav = (className, withBadge) => (
    <>
      {navItems.map(({ id, label, icon: Icon, badge }) => (
        <button
          key={id}
          type="button"
          className={activeView === id ? 'active' : ''}
          onClick={() => onChangeView(id)}
          aria-current={activeView === id ? 'page' : undefined}
          aria-label={className === 'mobile' ? label : undefined}
        >
          <Icon size={18} /><span>{label}</span>
          {withBadge && badge > 0 && <em>{badge}</em>}
        </button>
      ))}
    </>
  );

  return (
    <div className="studio-shell" style={accent ? { '--studio-accent': accent } : undefined}>
      <aside className="studio-sidebar">
        <div className="studio-mark">
          <span>{mark}</span>
          <div><strong>{title}</strong><small>{subtitle}</small></div>
        </div>
        <nav aria-label={`${title} workspace`}>{renderNav('rail', true)}</nav>
        {status && (
          <div className="studio-side-status">
            <div><span style={{ width: `${Math.max(status.percent, 4)}%` }} /></div>
            <strong>{status.value}</strong>
            <small>{status.label}</small>
          </div>
        )}
      </aside>

      <div className="studio-workspace">
        <header className="studio-mobile-nav">{renderNav('mobile', false)}</header>
        {children}
      </div>
    </div>
  );
}
