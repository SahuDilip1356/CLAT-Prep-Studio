import { useEffect, useState } from 'react';
import { Download, RefreshCw, Share, WifiOff, X } from 'lucide-react';
import './PWAExperience.css';

const isStandalone = () => (
  window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true
);

const isIosDevice = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export default function PWAExperience() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [updateRegistration, setUpdateRegistration] = useState(null);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowIosHelp(false);
    };
    const handleUpdate = (event) => setUpdateRegistration(event.detail);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('clat-pwa-update', handleUpdate);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('clat-pwa-update', handleUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApplication = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }

    if (isIosDevice() && !isStandalone()) {
      setShowIosHelp(true);
    }
  };

  const applyUpdate = () => {
    updateRegistration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    setUpdateRegistration(null);
  };

  const canOfferInstall = !isStandalone() && (Boolean(installPrompt) || isIosDevice());

  return (
    <aside className="pwa-experience" aria-live="polite">
      {!online && (
        <div className="pwa-experience__notice pwa-experience__notice--offline">
          <WifiOff size={17} />
          <span><strong>Offline mode</strong> · Previously opened lessons remain available.</span>
        </div>
      )}

      {updateRegistration && (
        <div className="pwa-experience__notice pwa-experience__notice--update">
          <RefreshCw size={17} />
          <span><strong>New version ready</strong> · Refresh to use the latest studio.</span>
          <button type="button" onClick={applyUpdate}>Refresh</button>
        </div>
      )}

      {canOfferInstall && !showIosHelp && (
        <button className="pwa-install-button" type="button" onClick={installApplication}>
          <Download size={18} />
          <span>
            <strong>Install CLAT Studio</strong>
            <small>Study faster from your home screen</small>
          </span>
        </button>
      )}

      {showIosHelp && (
        <div className="pwa-experience__notice pwa-experience__notice--install">
          <Share size={18} />
          <span>Tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.</span>
          <button
            className="pwa-experience__close"
            type="button"
            onClick={() => setShowIosHelp(false)}
            aria-label="Close installation help"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
