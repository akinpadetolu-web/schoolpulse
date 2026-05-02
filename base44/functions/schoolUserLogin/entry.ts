import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Password hashing using SP2024_ salt
const SALT = "SP2024_";

function hashPassword(password) {
  const salted = SALT + password;
  return btoa(unescape(encodeURIComponent(salted)));
}

function verifyPassword(inputPassword, storedHash) {
  if (!inputPassword || !storedHash) return false;
  try {
    return hashPassword(inputPassword) === storedHash;
  } catch (e) {
    console.warn('Password verification error:', e.message);
    return false;
  }
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
    
    // Verify password using SP2024_ salt
    const isValid = verifyPassword(password, user.passwordHash);
    
    console.log('Password verification result:', isValid);
    
    if (!isValid) {
      console.log('ERROR: Password verification failed');
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Return user data (excluding sensitive info)
    const safeUser = { ...user };
    delete safeUser.passwordHash;
    
    console.log('Login successful for user:', user.id);
    return Response.json({ 
      success: true, 
      user: safeUser
    });
    
  } catch (error) {
    console.error('=== LOGIN ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});