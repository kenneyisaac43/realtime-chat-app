import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

import Login from './pages/Login';
import Rooms from './pages/Rooms';
import ChatRoom from './pages/ChatRoom';
import Admin from './pages/Admin';

function getInitialDarkMode() {
  // 1) see if user has stored preference
  const stored = localStorage.getItem('darkMode');
  if (stored !== null) {
    return stored === 'true';
  }
  // 2) if none, detect system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function App() {

  const [darkMode, setDarkMode] = useState(() => getInitialDarkMode());

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  return (
    <AuthProvider>
      <SocketProvider>
        {/* Main background gradient */}
        <div className="min-h-screen bg-gradient-to-r from-blue-50 to-white">
          <HashRouter>
            <Routes>
              <Route path="/" element={<Login darkMode={darkMode} setDarkMode={setDarkMode}/>} />
              <Route path="/rooms" element={<Rooms darkMode={darkMode} setDarkMode={setDarkMode} />} />
              <Route path="/rooms/:name" element={<ChatRoom darkMode={darkMode} setDarkMode={setDarkMode} />} />
              <Route path="/admin" element={<Admin darkMode={darkMode} setDarkMode={setDarkMode} />} />
            </Routes>
          </HashRouter>
          <Toaster position="bottom-right" />
        </div>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;


