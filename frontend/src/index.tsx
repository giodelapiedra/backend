import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker registration DISABLED for real-time updates
// This prevents caching issues that interfere with real-time data
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('Service Worker registration DISABLED for real-time updates');
    
    // Unregister any existing service workers to prevent caching
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        registration.unregister();
        console.log('SW unregistered to prevent caching issues');
      }
    });
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
