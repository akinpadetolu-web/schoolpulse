import React, { createContext, useContext, useState, useEffect } from 'react';

const SchoolAuthContext = createContext(null);

const SESSION_KEY = 'schoolpulse_session';

function readSession() {
  try {
    const v = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

function writeSession(user) {
  const safe = { ...user };
  delete safe.passwordHash;
  const str = JSON.stringify(safe);
  try { sessionStorage.setItem(SESSION_KEY, str); } catch {}
  try { localStorage.setItem(SESSION_KEY, str); } catch {}
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

export function SchoolAuthProvider({ children }) {
  const [schoolUser, setSchoolUser] = useState(() => readSession());

  const login = (user) => {
    const safe = { ...user };
    delete safe.passwordHash;
    setSchoolUser(safe);
    writeSession(safe);
  };

  const logout = () => {
    setSchoolUser(null);
    clearSession();
  };

  return (
    <SchoolAuthContext.Provider value={{ schoolUser, login, logout }}>
      {children}
    </SchoolAuthContext.Provider>
  );
}

export function useSchoolAuth() {
  const ctx = useContext(SchoolAuthContext);
  if (!ctx) throw new Error('useSchoolAuth must be used within SchoolAuthProvider');
  return ctx;
}