import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { comparePassword, setCurrentUser, hashPassword, generateUsername } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Loader2, AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';

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

  // Parent signup state
  const [signupSchool, setSignupSchool] = useState("");
  const [signupLinkCodes, setSignupLinkCodes] = useState([""]);
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

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
    } catch (error) {
      console.error('Failed to load schools:', error);
      setSchools([]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!selectedSchool) {setError("Please select a school");return;}
    if (!role) {setError("Please select a role");return;}
    if (!username) {setError("Please enter your username or email");return;}
    if (!password) {setError("Please enter your password");return;}

    if (role === "admin" && isMobile) {
      setError("School Admin login is only available on laptop or desktop");
      return;
    }

    setLoading(true);
    try {
      const school = schools.find((s) => s.id === selectedSchool);
      if (!school) {setError("Invalid school selected");setLoading(false);return;}

      const users = await base44.entities.SchoolUser.filter({ schoolId: school.id, role: role });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const user = (users || []).find((u) =>
      (u.username === username || u.email === username) && !u.isArchived
      );

      if (!user) {setError("Invalid username or password");setLoading(false);return;}
      if (!comparePassword(password, user.passwordHash)) {setError("Invalid username or password");setLoading(false);return;}

      setCurrentUser(user);

      if (role === "admin") navigate("/school-admin");else
      if (role === "teacher") navigate("/teacher");else
      if (role === "student") navigate("/student");else
      if (role === "parent") navigate("/parent");
    } catch {
      setError("Sign in failed. Please try again.");
    }
    setLoading(false);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setSignupError("");
    if (!signupSchool) return setSignupError("Please select a school");
    const trimmedCodes = signupLinkCodes.map((c) => c.trim()).filter(Boolean);
    if (trimmedCodes.length === 0) return setSignupError("Please enter at least one student link code");
    if (!signupFullName.trim()) return setSignupError("Please enter your full name");
    if (!signupEmail.trim()) return setSignupError("Please enter your email address");
    if (signupPassword.length < 6) return setSignupError("Password must be at least 6 characters");
    if (signupPassword !== signupConfirm) return setSignupError("Passwords do not match");

    setSignupLoading(true);
    // Find students matching all provided codes
    const students = await base44.entities.SchoolUser.filter({ schoolId: signupSchool, role: 'student', isArchived: false });
    const linked = (students || []).filter((s) => trimmedCodes.includes(s.parentLinkCode));

    if (linked.length === 0) {
      setSignupLoading(false);
      return setSignupError("No students found with those link codes. Please check and try again.");
    }
    if (linked.length !== trimmedCodes.length) {
      const foundCodes = linked.map((s) => s.parentLinkCode);
      const notFound = trimmedCodes.filter((c) => !foundCodes.includes(c));
      setSignupLoading(false);
      return setSignupError(`Code(s) not found: ${notFound.join(", ")}. Please verify them with the school.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check email not already taken by a parent in this school
    const existingParents = await base44.entities.SchoolUser.filter({ schoolId: signupSchool, role: 'parent' });
    if ((existingParents || []).some((p) => p.email === signupEmail.trim())) {
      setSignupLoading(false);
      return setSignupError("An account with this email already exists. Please sign in.");
    }

    const existingUsernames = (existingParents || []).map((p) => p.username).filter(Boolean);
    const school = schools.find((s) => s.id === signupSchool);
    const newUsername = generateUsername(signupFullName, existingUsernames);

    await base44.entities.SchoolUser.create({
      schoolId: signupSchool,
      schoolName: school?.schoolName || "",
      fullName: signupFullName.trim(),
      email: signupEmail.trim(),
      username: newUsername,
      passwordHash: hashPassword(signupPassword),
      role: 'parent',
      linkedStudentIds: linked.map((s) => s.id),
      mustChangePassword: false,
      isArchived: false
    });

    setSignupLoading(false);
    setSignupSuccess(true);
  }

  const roles = isMobile ?
  [{ value: "teacher", label: "Teacher" }, { value: "student", label: "Student" }, { value: "parent", label: "Parent" }] :
  [{ value: "admin", label: "School Admin" }, { value: "teacher", label: "Teacher" }, { value: "student", label: "Student" }, { value: "parent", label: "Parent" }];

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
          <CardContent className="pt-6">
            <Tabs defaultValue="signin">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="signin" className="flex-1">Sign In</TabsTrigger>
                <TabsTrigger value="parent-signup" className="flex-1">Parent Sign Up</TabsTrigger>
              </TabsList>

              {/* ── Sign In ── */}
              <TabsContent value="signin">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>School</Label>
                    <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                      <SelectTrigger className="bg-transparent px-3 py-2 text-sm rounded-3xl flex h-9 w-full items-center justify-between whitespace-nowrap border border-input shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"><SelectValue placeholder="Select your school" /></SelectTrigger>
                      <SelectContent>
                        {schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.schoolName}</SelectItem>)}
                        {schools.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No schools available</div>}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="bg-transparent px-3 py-2 text-sm rounded-3xl flex h-9 w-full items-center justify-between whitespace-nowrap border border-input shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"><SelectValue placeholder="Select your role" /></SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username or Email</Label>
                    <Input id="username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username or email" className="bg-transparent px-3 py-1 text-base rounded-3xl flex h-9 w-full border border-input shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="bg-transparent px-3 py-1 text-base rounded-3xl flex h-9 w-full border border-input shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" />
                  </div>

                  {error &&
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                    </div>
                  }

                  <Button type="submit" className="bg-primary text-primary-foreground px-4 py-2 text-base font-medium rounded-3xl inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 w-full h-11" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              {/* ── Parent Sign Up ── */}
              <TabsContent value="parent-signup">
                {signupSuccess ?
                <div className="text-center py-6 space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-2">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-lg">Account Created!</h3>
                    <p className="text-sm text-muted-foreground">Your parent account is ready. Switch to the <strong>Sign In</strong> tab and log in with your email and password using the <strong>Parent</strong> role.</p>
                    <Button className="w-full mt-2" variant="outline" onClick={() => setSignupSuccess(false)}>Back to Sign Up</Button>
                  </div> :

                <form onSubmit={handleSignup} className="space-y-4">
                    <p className="text-sm text-muted-foreground -mt-1 mb-2">
                      Parents can self-register using the <strong>student link code</strong> provided by the school.
                    </p>

                    <div className="space-y-2">
                      <Label>School</Label>
                      <Select value={signupSchool} onValueChange={setSignupSchool}>
                        <SelectTrigger><SelectValue placeholder="Select your child's school" /></SelectTrigger>
                        <SelectContent>
                          {schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.schoolName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Student Link Code(s) <span className="text-muted-foreground font-normal">(up to 4 children)</span></Label>
                      {signupLinkCodes.map((code, i) =>
                    <div key={i} className="flex gap-2">
                          <Input
                        id={`linkcode-${i}`}
                        name={`linkcode-${i}`}
                        value={code}
                        onChange={(e) => {
                          const updated = [...signupLinkCodes];
                          updated[i] = e.target.value;
                          setSignupLinkCodes(updated);
                        }}
                        placeholder={`Child ${i + 1} link code`} />
                      
                          {signupLinkCodes.length > 1 &&
                      <Button type="button" variant="ghost" size="icon" onClick={() => setSignupLinkCodes(signupLinkCodes.filter((_, j) => j !== i))}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                      }
                        </div>
                    )}
                      {signupLinkCodes.length < 4 &&
                    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setSignupLinkCodes([...signupLinkCodes, ""])}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Another Child
                        </Button>
                    }
                      <p className="text-xs text-muted-foreground">Each code links your account to a child. Contact the school if you don't have it.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullname">Your Full Name</Label>
                      <Input id="fullname" name="fullname" value={signupFullName} onChange={(e) => setSignupFullName(e.target.value)} placeholder="e.g. Jane Doe" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" name="email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="your@email.com" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" name="password" type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="At least 6 characters" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input id="confirm-password" name="confirm" type="password" value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} placeholder="Repeat password" />
                    </div>

                    {signupError &&
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 shrink-0" /><span>{signupError}</span>
                      </div>
                  }

                    <Button type="submit" className="w-full h-11 text-base" disabled={signupLoading}>
                      {signupLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Create Parent Account
                    </Button>
                  </form>
                }
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">© {new Date().getFullYear()} SchoolPulse</p>
      </div>
    </div>);

}