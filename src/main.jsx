import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PhotoProvider } from 'react-photo-view'; // NEW: Import the provider
import 'react-photo-view/dist/react-photo-view.css'; // NEW: Import the required CSS
import './index.css';
import App from './App.jsx';

import 'tui-image-editor/dist/tui-image-editor.css';
import 'tui-color-picker/dist/tui-color-picker.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PhotoProvider> {/* ACTION: Wrap your App with the PhotoProvider */}
          <App />
        </PhotoProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);