// Password hashing using a consistent cross-browser algorithm
const SALT = "SP2024_";

function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to unsigned 32-bit hex string, padded to 8 chars
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashPassword(password) {
  const salted = SALT + password;
  // Use multiple rounds for a longer hash, consistent across all browsers
  let h1 = simpleHash(salted);
  let h2 = simpleHash(salted + h1);
  let h3 = simpleHash(h1 + salted);
  let h4 = simpleHash(h2 + h3 + salted);
  return `sp_${h1}${h2}${h3}${h4}`;
}

export function comparePassword(inputPassword, storedHash) {
  if (!inputPassword || !storedHash) return false;
  const newHash = hashPassword(inputPassword);
  if (newHash === storedHash) return true;
  // Fallback: also check old btoa-based hash for existing accounts
  try {
    const oldHash = btoa(SALT + inputPassword);
    return oldHash === storedHash;
  } catch { return false; }
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

// Session management
const SESSION_KEY = "schoolpulse_session";
const SUPER_ADMIN_SESSION_KEY = "schoolpulse_superadmin_session";

export function getCurrentUser() {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export function setCurrentUser(user) {
  if (!user) return;
  const safe = { ...user };
  delete safe.passwordHash;
  localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
}

export function clearCurrentUser() {
  localStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
  return !!getCurrentUser();
}

export function getCurrentSuperAdmin() {
  try {
    const data = localStorage.getItem(SUPER_ADMIN_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export function setCurrentSuperAdmin(user) {
  if (!user) return;
  const safe = { ...user };
  delete safe.passwordHash;
  localStorage.setItem(SUPER_ADMIN_SESSION_KEY, JSON.stringify(safe));
}

export function clearCurrentSuperAdmin() {
  localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
}

export function requireSuperAdminAuth() {
  return !!getCurrentSuperAdmin();
}