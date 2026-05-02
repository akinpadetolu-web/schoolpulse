import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Password hashing using SP2024_ salt (legacy system)
const SALT = "SP2024_";

function hashPasswordLegacy(password) {
  const salted = SALT + password;
  return btoa(unescape(encodeURIComponent(salted)));
}

// Verify password against both legacy SP2024_ and potential bcrypt formats
async function verifyPassword(inputPassword, storedHash) {
  if (!inputPassword || !storedHash) return { isValid: false, needsUpgrade: false };
  
  // PRIORITY 1: Try SP2024_ legacy salt (most existing passwords)
  try {
    const legacyHash = hashPasswordLegacy(inputPassword);
    if (legacyHash === storedHash) {
      return { isValid: true, needsUpgrade: true };
    }
  } catch (e) {
    console.warn('Legacy hash verification failed:', e);
  }
  
  // PRIORITY 2: Fallback for btoa variant encoding
  try {
    if (btoa(SALT + inputPassword) === storedHash) {
      return { isValid: true, needsUpgrade: true };
    }
  } catch (e) {
    console.warn('Fallback hash verification failed:', e);
  }
  
  return { isValid: false, needsUpgrade: false };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { schoolId, username, password, role } = body;
    
    if (!schoolId || !username || !password || !role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Find user by username or email in the specified school with the specified role
    const users = await base44.entities.SchoolUser.filter({ 
      schoolId, 
      role 
    });
    
    const user = (users || []).find(u => 
      (u.username?.trim() === username.trim() || u.email?.trim() === username.trim()) && !u.isArchived
    );
    
    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    if (!user.passwordHash) {
      return Response.json({ error: 'Account not properly configured' }, { status: 400 });
    }
    
    // Verify password with dual support (legacy + new)
    const { isValid, needsUpgrade } = await verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Return user data (excluding sensitive info)
    const safeUser = { ...user };
    delete safeUser.passwordHash;
    
    return Response.json({ 
      success: true, 
      user: safeUser,
      needsUpgrade 
    });
    
  } catch (error) {
    console.error('School user login error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});