
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill pour process.env requis par certains SDKs
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

const ErrorFallback = ({ error }: { error: Error }) => (
  <div style={{ 
    padding: '40px 20px', 
    textAlign: 'center', 
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#f8fafc'
  }}>
    <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
    <h1 style={{ color: '#1e293b', fontSize: '20px', fontWeight: 'bold' }}>Une erreur est survenue au chargement</h1>
    <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '300px', margin: '10px 0 20px' }}>
      L'application n'a pas pu démarrer correctement.
    </p>
    <pre style={{ 
      background: '#fee2e2', 
      color: '#991b1b', 
      padding: '12px', 
      borderRadius: '8px', 
      fontSize: '10px',
      maxWidth: '100%',
      overflow: 'auto'
    }}>
      {error.message}
    </pre>
    <button 
      onClick={() => window.location.reload()}
      style={{
        background: '#2563eb',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '20px'
      }}
    >
      Recharger Servi+
    </button>
  </div>
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Fatal render error:", error);
  root.render(<ErrorFallback error={error as Error} />);
}

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
