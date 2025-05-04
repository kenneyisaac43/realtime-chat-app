import React, { createContext, useContext, useState } from 'react';
import api from '../api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user')) || null
  );

  async function signup(username, password) {
    const { data } = await api.post('/signup', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({ username }));
    setUser({ username });
  }

  async function login(username, password) {
    const { data } = await api.post('/login', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({ username }));
    setUser({ username });
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

