import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoadingAuth(true);
        setAuthError(null);
        setIsLoadingPublicSettings(false);

        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setUser(null);
        setIsAuthenticated(false);
        if (error.status === 401 || error.status === 403) {
          setAuthError({
            type: 'auth_required',
            message: 'Authentication required'
          });
        } else {
          setAuthError({
            type: 'unknown',
            message: error.message || 'An unknown authentication error occurred'
          });
        }
      } finally {
        setIsLoadingAuth(false);
      }
    };
    initializeAuth();
  }, []);


  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};