import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const SchoolAuthContext = createContext(null);

const SESSION_KEY = 'schoolpulse_session_v2';

function readStoredSession() {
  try {
    const v = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

function writeStoredSession(user) {
  const data = JSON.stringify({ id: user.id, email: user.email, schoolId: user.schoolId, role: user.role });
  try { localStorage.setItem(SESSION_KEY, data); } catch {}
  try { sessionStorage.setItem(SESSION_KEY, data); } catch {}
}

function clearStoredSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  // Also clear old keys
  try { localStorage.removeItem('schoolpulse_uid'); } catch {}
  try { sessionStorage.removeItem('schoolpulse_uid'); } catch {}
  try { localStorage.removeItem('schoolpulse_session'); } catch {}
  try { sessionStorage.removeItem('schoolpulse_session'); } catch {}
}

export function SchoolAuthProvider({ children }) {
  const [schoolUser, setSchoolUser] = useState(null);
  const [isLoadingSchoolAuth, setIsLoadingSchoolAuth] = useState(true);

  // On mount, restore session from DB using stored session data
  useEffect(() => {
    async function restoreSession() {
      const stored = readStoredSession();
      if (!stored?.email || !stored?.schoolId) { setIsLoadingSchoolAuth(false); return; }
      try {
        const users = await base44.entities.SchoolUser.filter({ email: stored.email, schoolId: stored.schoolId, role: stored.role });
        const user = (users || [])[0];
        if (user && !user.isArchived) {
          const { passwordHash, ...safe } = user;
          setSchoolUser(safe);
        } else {
          clearStoredSession();
        }
      } catch {
        clearStoredSession();
      }
      setIsLoadingSchoolAuth(false);
    }
    restoreSession();
  }, []);

  const login = (user) => {
    const { passwordHash, ...safe } = user;
    setSchoolUser(safe);
    writeStoredSession(user);
  };

  const logout = () => {
    setSchoolUser(null);
    clearStoredSession();
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