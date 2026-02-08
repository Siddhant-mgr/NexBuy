import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    axios.defaults.baseURL = API_BASE_URL;

    const bootstrap = async () => {
      setLoading(true);

      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const meRes = await axios.get('/api/auth/me');
          setUser(meRes.data.user);
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          delete axios.defaults.headers.common['Authorization'];
        }
      } else {
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      }

      setLoading(false);
    };

    bootstrap();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });
      
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      
      const { token: newToken, user: registeredUser } = response.data;
      setToken(newToken);
      setUser(registeredUser);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return { success: true, user: registeredUser };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
        errors: error.response?.data?.errors
      };
    }
  };

  const updateProfile = async (payload) => {
    try {
      const response = await axios.put('/api/auth/me', payload);
      const { user: updatedUser } = response.data;
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Profile update failed',
        errors: error.response?.data?.errors
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    token,
    login,
    register,
    updateProfile,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

