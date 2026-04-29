import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './utils/tracing.js'
import './index.css'
import App from './App.jsx'
import { SafeArea } from '@capacitor-community/safe-area';

// Initialize safe area plugin to polyfill env(safe-area-inset-*) on Android WebViews < 140
// which have a known Chromium bug where these values incorrectly return 0px
SafeArea.enable({
  config: {
    customColorsForSystemBars: true,
    statusBarColor: '#00000000', // transparent
    statusBarContent: 'dark',
    navigationBarColor: '#00000000',
    navigationBarContent: 'dark',
  },
});


// Suppress foliate-js SES sandbox cleanup noise.
// When foliate-view iframes are destroyed (e.g. on navigate back), 
// the SES lockdown fires "SES_UNCAUGHT_EXCEPTION: null" which is harmless teardown noise.
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('SES_UNCAUGHT_EXCEPTION')) {
    e.preventDefault();
    e.stopPropagation();
  }
}, true);

const _origConsoleError = console.error.bind(console);
console.error = (...args) => {
  if (args[0] && String(args[0]).includes('SES_UNCAUGHT_EXCEPTION')) return;
  _origConsoleError(...args);
};

createRoot(document.getElementById('root')).render(
  <App />
)
