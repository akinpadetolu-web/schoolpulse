import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { comparePasswordAsync, setCurrentSuperAdmin, getCurrentSuperAdmin } from '@/lib/auth';
import { ensureSuperAdminExists } from '@/lib/superAdminInit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

export default function BackendLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      if (getCurrentSuperAdmin()) { navigate("/backend"); return; }
      await ensureSuperAdminExists();
      setInitializing(false);
    }
    init();
  }, [navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields"); return; }

    setLoading(true);
    try {
      const users = await base44.entities.SchoolUser.filter({ email: email, role: "superAdmin" });
      const user = (users || []).find(u => u.email === email && !u.isArchived);

      if (!user) { setError("Invalid credentials"); setLoading(false); return; }
      if (!user.passwordHash) { setError("Account not configured"); setLoading(false); return; }
      
      // Use dual password verification for legacy + new hashes
      const { isValid } = await comparePasswordAsync(password, user.passwordHash);
      if (!isValid) { setError("Invalid credentials"); setLoading(false); return; }

      setCurrentSuperAdmin(user);
      navigate("/backend");
    } catch {
      setError("Login failed");
    }
    setLoading(false);
  }

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">SchoolPulse Backend</h1>
          <p className="text-muted-foreground mt-1">Super Admin Access</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter admin email" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}