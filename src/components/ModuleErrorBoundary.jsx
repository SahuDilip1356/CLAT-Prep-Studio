import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ModuleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`${this.props.moduleName} module failed to render`, error, errorInfo);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="glass-panel" role="alert" style={{ padding: '40px', textAlign: 'center', margin: '24px auto', maxWidth: '720px' }}>
        <AlertTriangle size={36} color="var(--accent-danger)" />
        <h2 style={{ margin: '14px 0 8px' }}>{this.props.moduleName} is temporarily unavailable</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
          The rest of CLAT Prep Studio is still available. Reload this module to try again.
        </p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          <RefreshCw size={16} /> Reload module
        </button>
      </div>
    );
  }
}
