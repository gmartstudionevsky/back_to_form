import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

const registerSW = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      let hasReloaded = false;
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}service-worker.js`)
        .then(registration => {
          registration.update();
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
        })
        .catch(() => undefined);

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hasReloaded) return;
        hasReloaded = true;
        window.location.reload();
      });
    });
  }
};

registerSW();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
