import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import bcrypt from 'npm:bcryptjs@2.4.3';

// Password hashing using SP2024_ salt (legacy system)
const SALT = "SP2024_";

function hashPasswordLegacy(password) {
  const salted = SALT + password;
  return btoa(unescape(encodeURIComponent(salted)));
}

// Verify password against both bcrypt (new) and SP2024_ salt (legacy)
async function verifyPassword(inputPassword, storedHash) {
  if (!inputPassword || !storedHash) {
    console.log('Password verification: missing input or hash');
    return { isValid: false, needsUpgrade: false };
  }
  
  let isValid = false;
  
  // PRIORITY 1: Try new bcrypt method first
  try {
    isValid = await bcrypt.compare(inputPassword, storedHash);
    console.log('Bcrypt verify result:', isValid);
    if (isValid) {
      return { isValid: true, needsUpgrade: false };
    }
  } catch (e) {
    console.log('Bcrypt verify error (expected for SP2024_ hashes):', e.message);
  }
  
  // PRIORITY 2: Try SP2024_ legacy salt (most existing passwords)
  try {
    const legacyHash = hashPasswordLegacy(inputPassword);
    if (legacyHash === storedHash) {
      console.log('Legacy SP2024_ hash matched, marking for upgrade');
      return { isValid: true, needsUpgrade: true };
    }
  } catch (e) {
    console.log('Legacy hash verification error:', e.message);
  }
  
  // PRIORITY 3: Fallback for btoa variant encoding
  try {
    if (btoa(SALT + inputPassword) === storedHash) {
      console.log('Fallback btoa hash matched, marking for upgrade');
      return { isValid: true, needsUpgrade: true };
    }
  } catch (e) {
    console.log('Fallback hash verification error:', e.message);
  }
  
  console.log('All password verification methods failed');
  return { isValid: false, needsUpgrade: false };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { schoolId, username, password, role } = body;
    
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Username:', username);
    console.log('Role:', role);
    console.log('SchoolId:', schoolId);
    
    if (!schoolId || !username || !password || !role) {
      console.log('ERROR: Missing required fields');
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
    
    console.log('User found:', !!user);
    console.log('Has passwordHash:', !!user?.passwordHash);
    if (user?.passwordHash) {
      console.log('PasswordHash length:', user.passwordHash.length);
      console.log('Hash starts with:', user.passwordHash.substring(0, 20));
    }
    
    if (!user) {
      console.log('ERROR: User not found');
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    if (!user.passwordHash) {
      console.log('ERROR: Account has no password hash');
      return Response.json({ error: 'Account not properly configured' }, { status: 400 });
    }
    
    // Verify password with dual support (legacy + new)
    const { isValid, needsUpgrade } = await verifyPassword(password, user.passwordHash);
    
    console.log('Password verification result:', isValid);
    console.log('Needs hash upgrade:', needsUpgrade);
    
    if (!isValid) {
      console.log('ERROR: Password verification failed');
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // If password is valid but uses old hash format, upgrade to bcrypt
    if (needsUpgrade) {
      try {
        const saltRounds = parseInt(Deno.env.get('BCRYPT_SALT_ROUNDS') || '12');
        const newHash = await bcrypt.hash(password, saltRounds);
        await base44.asServiceRole.entities.SchoolUser.update(user.id, {
          passwordHash: newHash
        });
        console.log('Hash upgraded to bcrypt');
      } catch (upgradeError) {
        console.warn('Hash upgrade failed (non-critical):', upgradeError.message);
      }
    }
    
    // Return user data (excluding sensitive info)
    const safeUser = { ...user };
    delete safeUser.passwordHash;
    
    console.log('Login successful for user:', user.id);
    return Response.json({ 
      success: true, 
      user: safeUser,
      needsUpgrade 
    });
    
  } catch (error) {
    console.error('=== LOGIN ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});