import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const SchoolAuthContext = createContext(null);

const SESSION_KEY = 'schoolpulse_uid';

function readStoredId() {
  try { return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || null; } catch { return null; }
}

function writeStoredId(id) {
  try { localStorage.setItem(SESSION_KEY, id); } catch {}
  try { sessionStorage.setItem(SESSION_KEY, id); } catch {}
}

function clearStoredId() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  // Also clear old full-session keys
  try { localStorage.removeItem('schoolpulse_session'); } catch {}
  try { sessionStorage.removeItem('schoolpulse_session'); } catch {}
}

export function SchoolAuthProvider({ children }) {
  const [schoolUser, setSchoolUser] = useState(null);
  const [isLoadingSchoolAuth, setIsLoadingSchoolAuth] = useState(true);

  // On mount, restore session from DB using stored user ID
  useEffect(() => {
    async function restoreSession() {
      const storedId = readStoredId();
      if (!storedId) { setIsLoadingSchoolAuth(false); return; }
      try {
        const users = await base44.entities.SchoolUser.filter({ id: storedId });
        const user = (users || [])[0];
        if (user && !user.isArchived) {
          const { passwordHash, ...safe } = user;
          setSchoolUser(safe);
        } else {
          clearStoredId();
        }
      } catch {
        clearStoredId();
      }
      setIsLoadingSchoolAuth(false);
    }
    restoreSession();
  }, []);

  const login = (user) => {
    const { passwordHash, ...safe } = user;
    setSchoolUser(safe);
    writeStoredId(user.id);
  };

  const logout = () => {
    setSchoolUser(null);
    clearStoredId();
  };

  return (
    <SchoolAuthContext.Provider value={{ schoolUser, login, logout, isLoadingSchoolAuth }}>
      {children}
    </SchoolAuthContext.Provider>
  );
}

export function useSchoolAuth() {
  const ctx = useContext(SchoolAuthContext);
  if (!ctx) throw new Error('useSchoolAuth must be used within SchoolAuthProvider');
  return ctx;
}