import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthContextProvider } from "./context/AuthContext";
import { GoogleOAuthProvider } from '@react-oauth/google'; // <--- IMPORT

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthContextProvider>
      {/* WRAP APP WITH YOUR CLIENT ID */}
      <GoogleOAuthProvider clientId="485235287216-54jjbt6ebvqvg8o2spr7omtmbpa8e490.apps.googleusercontent.com">
        <App />
      </GoogleOAuthProvider>
    </AuthContextProvider>
  </React.StrictMode>,
);