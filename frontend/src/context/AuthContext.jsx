import React, { createContext, useContext, useState } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('cqm_user');
    return stored ? JSON.parse(stored) : null;
  });

  async function login(email, password) {
    const { data } = await client.post('/auth/login', { email, password });
    localStorage.setItem('cqm_token', data.token);
    localStorage.setItem('cqm_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function register(name, email, password, role) {
    const { data } = await client.post('/auth/register', { name, email, password, role });
    localStorage.setItem('cqm_token', data.token);
    localStorage.setItem('cqm_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('cqm_token');
    localStorage.removeItem('cqm_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
