// Simple password hashing using base64 encoding with a salt prefix
const SALT = "SP2024_";

export function hashPassword(password) {
  const salted = SALT + password;
  return btoa(unescape(encodeURIComponent(salted)));
}

export function comparePassword(inputPassword, storedHash) {
  if (!inputPassword || !storedHash) return false;
  try {
    if (hashPassword(inputPassword) === storedHash) return true;
  } catch (e) {
    console.warn('Hash check failed:', e);
  }
  return false;
}

export async function comparePasswordAsync(inputPassword, storedHash) {
  return comparePassword(inputPassword, storedHash) ? { isValid: true, needsUpgrade: false } : { isValid: false, needsUpgrade: false };
}

export function generateTemporaryPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export function generateUsername(fullName, existingUsernames = []) {
  if (!fullName) return "user";
  const parts = fullName.trim().split(/\s+/);
  const first = (parts[0] || "user").toLowerCase().slice(0, 4);
  const lastInitial = parts.length > 1 ? (parts[parts.length - 1] || "x")[0].toLowerCase() : "x";
  let base = `${first}.${lastInitial}`;
  let username = base;
  let counter = 1;
  while (existingUsernames.includes(username)) {
    username = `${base}${counter}`;
    counter++;
  }
  return username;
}

// Session management — uses localStorage with sessionStorage fallback for cross-browser reliability
const SESSION_KEY = "schoolpulse_session";
const SUPER_ADMIN_SESSION_KEY = "schoolpulse_superadmin_session";

function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch {}
  try { sessionStorage.setItem(key, value); } catch {}
}

function readStorage(key) {
  try {
    const v = localStorage.getItem(key);
    if (v) return v;
  } catch {}
  try {
    return sessionStorage.getItem(key);
  } catch {}
  return null;
}

function removeStorage(key) {
  try { localStorage.removeItem(key); } catch {}
  try { sessionStorage.removeItem(key); } catch {}
}

export function getCurrentUser() {
  try {
    const data = readStorage(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export function setCurrentUser(user) {
  if (!user) return;
  const safe = { ...user };
  delete safe.passwordHash;
  writeStorage(SESSION_KEY, JSON.stringify(safe));
}

export function clearCurrentUser() {
  removeStorage(SESSION_KEY);
}

export function isAuthenticated() {
  return !!getCurrentUser();
}

export function getCurrentSuperAdmin() {
  try {
    const data = readStorage(SUPER_ADMIN_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export function setCurrentSuperAdmin(user) {
  if (!user) return;
  const safe = { ...user };
  delete safe.passwordHash;
  writeStorage(SUPER_ADMIN_SESSION_KEY, JSON.stringify(safe));
}

export function clearCurrentSuperAdmin() {
  removeStorage(SUPER_ADMIN_SESSION_KEY);
}

export function requireSuperAdminAuth() {
  return !!getCurrentSuperAdmin();
}