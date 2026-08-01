import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Preload Gemini API token for client-side services
if (typeof window !== 'undefined') {
  fetch('/api/gemini/token')
    .then(res => res.json())
    .then(data => {
      (window as any)._geminiToken = data.token;
    })
    .catch(err => console.error("Could not preload Gemini token", err));
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
