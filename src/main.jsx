import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// Self-hosted: nothing is fetched from a font CDN at runtime. The variable
// sans covers every weight in one file; the mono ships the two we use.
import '@fontsource-variable/ibm-plex-sans/wght.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './index.css';
import { registerPWA } from './pwa.js';

registerPWA();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
