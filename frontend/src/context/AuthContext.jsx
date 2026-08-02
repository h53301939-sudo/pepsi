import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('pepsi_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('pepsi_token');
      if (token) {
        try {
          const res = await API.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('pepsi_user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Session expired or invalid:', err);
          setUser(null);
          localStorage.removeItem('pepsi_token');
          localStorage.removeItem('pepsi_user');
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    const userData = res.data;
    localStorage.setItem('pepsi_token', userData.token);
    localStorage.setItem('pepsi_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('pepsi_token');
    localStorage.removeItem('pepsi_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
