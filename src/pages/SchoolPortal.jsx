import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { comparePassword, setCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';

export default function SchoolPortal() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    loadSchools();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function loadSchools() {
    try {
      const data = await base44.entities.School.filter({ isActive: true });
      setSchools(data || []);
    } catch { setSchools([]); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!selectedSchool) { setError("Please select a school"); return; }
    if (!role) { setError("Please select a role"); return; }
    if (!username) { setError("Please enter your username or email"); return; }
    if (!password) { setError("Please enter your password"); return; }

    if (role === "admin" && isMobile) {
      setError("School Admin login is only available on laptop or desktop");
      return;
    }

    setLoading(true);
    try {
      const school = schools.find(s => s.id === selectedSchool);
      if (!school) { setError("Invalid school selected"); setLoading(false); return; }

      const users = await base44.entities.SchoolUser.filter({ schoolId: school.id, role: role });
      const user = (users || []).find(u =>
        (u.username === username || u.email === username) && !u.isArchived
      );

      if (!user) { setError("Invalid username or password"); setLoading(false); return; }
      if (!comparePassword(password, user.passwordHash)) { setError("Invalid username or password"); setLoading(false); return; }

      setCurrentUser(user);

      if (role === "admin") navigate("/school-admin");
      else if (role === "teacher") navigate("/teacher");
      else if (role === "student") navigate("/student");
      else if (role === "parent") navigate("/parent");
    } catch {
      setError("Sign in failed. Please try again.");
    }
    setLoading(false);
  }

  const roles = isMobile
    ? [{ value: "teacher", label: "Teacher" }, { value: "student", label: "Student" }, { value: "parent", label: "Parent" }]
    : [{ value: "admin", label: "School Admin" }, { value: "teacher", label: "Teacher" }, { value: "student", label: "Student" }, { value: "parent", label: "Parent" }];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">SchoolPulse</h1>
          <p className="text-muted-foreground mt-1">School Management System</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>School</Label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger><SelectValue placeholder="Select your school" /></SelectTrigger>
                  <SelectContent>
                    {schools.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.schoolName}</SelectItem>
                    ))}
                    {schools.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No schools available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Username or Email</Label>
                <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username or email" />
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

              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">© {new Date().getFullYear()} SchoolPulse</p>
      </div>
    </div>
  );
}