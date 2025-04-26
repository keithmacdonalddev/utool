import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux'; // Import Provider
import store from './app/store'; // Import the store
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

/**
 * Renders the React application with appropriate wrappers
 *
 * In development environment, we use StrictMode which intentionally
 * double-mounts components to help catch side effect bugs.
 * In production, we disable StrictMode for better performance.
 */
if (process.env.NODE_ENV === 'development') {
  // In development: Use StrictMode to catch potential issues (causes double mounting)
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
} else {
  // In production: Don't use StrictMode for better performance
  root.render(
    <Provider store={store}>
      <App />
    </Provider>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
