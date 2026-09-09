/**
 * @fileoverview Application entry point.
 * Mounts the React root and renders the App component with global styles.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import '@radix-ui/themes/styles.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '@/styles/globals.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Ensure index.html contains a #root element.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
