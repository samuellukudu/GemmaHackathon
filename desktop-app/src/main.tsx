import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css'; // Assuming global styles

import App from './App'; // App component

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);