import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { comparePassword } from '@/lib/auth';
import { base44 as base44sdk } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Loader2, AlertCircle, CheckCircle2, Plus, Trash2, Search, X, Check } from 'lucide-react';

export default function SchoolPortal() {
  const navigate = useNavigate();
  const { login, schoolUser, isLoadingSchoolAuth } = useSchoolAuth();
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // School search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Parent signup state
  const [signupSchool, setSignupSchool] = useState("");
  const [signupSchoolName, setSignupSchoolName] = useState("");
  const [signupSearchQuery, setSignupSearchQuery] = useState("");
  const [signupSearchSuggestions, setSignupSearchSuggestions] = useState([]);
  const [signupShowSuggestions, setSignupShowSuggestions] = useState(false);
  const [signupSearchLoading, setSignupSearchLoading] = useState(false);
  const [signupLinkCodes, setSignupLinkCodes] = useState([""]);
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    // Load saved school from localStorage on mount
    const savedSchoolId = localStorage.getItem('lastSchoolId');
    const savedSchoolName = localStorage.getItem('lastSchoolName');
    if (savedSchoolId && savedSchoolName) {
      setSelectedSchool(savedSchoolId);
      setSearchQuery(savedSchoolName);
    }
    
    loadSchools();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-redirect already logged-in users
  useEffect(() => {
    if (!isLoadingSchoolAuth && schoolUser) {
      if (schoolUser.role === "admin") navigate("/school-admin");
      else if (schoolUser.role === "teacher") navigate("/teacher");
      else if (schoolUser.role === "student") navigate("/student");
      else if (schoolUser.role === "parent") navigate("/parent");
    }
  }, [isLoadingSchoolAuth, schoolUser, navigate]);

  async function loadSchools() {
    try {
      const data = await base44.entities.School.filter({ isActive: true });
      setSchools(data || []);
    } catch (error) {
      console.error('Failed to load schools:', error);
      setSchools([]);
    }
  }

  function handleSearchChange(value) {
    setSearchQuery(value);
    
    if (value.trim().length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchLoading(true);
    const lowerQuery = value.trim().toLowerCase();
    const filtered = schools
      .filter(s => 
        s.schoolName?.toLowerCase().includes(lowerQuery) || 
        s.schoolCode?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 8);
    
    setSearchSuggestions(filtered);
    setShowSuggestions(true);
    setSearchLoading(false);
  }

  function handleSelectSchool(school) {
    setSelectedSchool(school.id);
    setSearchQuery(school.schoolName);
    setShowSuggestions(false);
    localStorage.setItem('lastSchoolId', school.id);
    localStorage.setItem('lastSchoolName', school.schoolName);
  }

  function handleChangeSchool() {
    setSelectedSchool("");
    setSearchQuery("");
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setRole("");
    setUsername("");
    setPassword("");
    setError("");
  }

  function handleSignupSearchChange(value) {
    setSignupSearchQuery(value);
    
    if (value.trim().length < 2) {
      setSignupSearchSuggestions([]);
      setSignupShowSuggestions(false);
      return;
    }

    setSignupSearchLoading(true);
    const lowerQuery = value.trim().toLowerCase();
    const filtered = schools
      .filter(s => 
        s.schoolName?.toLowerCase().includes(lowerQuery) || 
        s.schoolCode?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 8);
    
    setSignupSearchSuggestions(filtered);
    setSignupShowSuggestions(true);
    setSignupSearchLoading(false);
  }

  function handleSelectSignupSchool(school) {
    setSignupSchool(school.id);
    setSignupSchoolName(school.schoolName);
    setSignupSearchQuery(school.schoolName);
    setSignupShowSuggestions(false);
  }

  function handleChangeSignupSchool() {
    setSignupSchool("");
    setSignupSchoolName("");
    setSignupSearchQuery("");
    setSignupSearchSuggestions([]);
    setSignupShowSuggestions(false);
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
      if (!users) {setError("Could not reach server. Please check your connection and try again.");setLoading(false);return;}
      await new Promise((resolve) => setTimeout(resolve, 100));

      const trimmedUsername = username.trim();
      const user = (users || []).find((u) =>
        (u.username?.trim() === trimmedUsername || u.email?.trim() === trimmedUsername) && !u.isArchived
      );

      if (!user) {setError("Invalid username or password");setLoading(false);return;}
      if (!user.passwordHash) {setError("Account not set up. Contact your school administrator.");setLoading(false);return;}
      if (!comparePassword(password, user.passwordHash)) {setError("Invalid username or password");setLoading(false);return;}

      // Save school on successful login
      localStorage.setItem('lastSchoolId', school.id);
      localStorage.setItem('lastSchoolName', school.schoolName);

      login(user);

      if (role === "admin") navigate("/school-admin");else
      if (role === "teacher") navigate("/teacher");else
      if (role === "student") navigate("/student");else
      if (role === "parent") navigate("/parent");
    } catch (err) {
      console.error('Login error:', err);
      setError("Sign in failed. Please check your connection and try again.");
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
    try {
      const response = await base44sdk.functions.invoke('parentSignup', {
        schoolId: signupSchool,
        linkCodes: trimmedCodes,
        fullName: signupFullName.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
      });

      if (response.data?.error) {
        setSignupLoading(false);
        return setSignupError(response.data.error);
      }

      setSignupLoading(false);
      setSignupSuccess(true);
    } catch (err) {
      setSignupLoading(false);
      setSignupError(err?.response?.data?.error || "Sign up failed. Please try again.");
    }
  }

  const roles = isMobile ?
  [{ value: "teacher", label: "Teacher" }, { value: "student", label: "Student" }, { value: "parent", label: "Parent" }] :
  [{ value: "admin", label: "School Admin" }, { value: "teacher", label: "Teacher" }, { value: "student", label: "Student" }, { value: "parent", label: "Parent" }];

  if (isLoadingSchoolAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md flex-shrink-0">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 mb-4 shadow-sm">
            <GraduationCap className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">SchoolPulse</h1>
          <p className="text-muted-foreground mt-1">School Management System</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="pt-6">
            <Tabs defaultValue="signin">
              <TabsList className="bg-muted text-muted-foreground mb-6 p-1 rounded-lg inline-flex h-9 items-center justify-center w-full">
                <TabsTrigger value="signin" className="px-3 py-1 text-sm font-medium rounded-[20px] inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow flex-1">Sign In</TabsTrigger>
                <TabsTrigger value="parent-signup" className="px-3 py-1 text-sm font-medium rounded-[20px] inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow flex-1">Parent Sign Up</TabsTrigger>
              </TabsList>

              {/* ── Sign In ── */}
              <TabsContent value="signin">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!selectedSchool ? (
                    // School Search Step
                    <div className="space-y-3">
                      <div className="relative z-10">
                        <Label className="mb-2 block">Search for your school</Label>
                        <div className="relative">
                           <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                           <Input
                             type="text"
                             value={searchQuery}
                             onChange={(e) => handleSearchChange(e.target.value)}
                             onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                             placeholder="Search for your school..."
                             className="pl-11 bg-transparent pr-3 py-2 text-base rounded-3xl flex h-10 w-full border border-input shadow-sm transition-colors placeholder:text-muted-foreground"
                           />
                          {searchLoading && <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
                        </div>

                        {/* Search Suggestions Dropdown */}
                        {showSuggestions && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-input rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto pointer-events-auto">
                            {searchSuggestions.length === 0 && searchQuery.length >= 2 ? (
                              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                                No schools found matching "{searchQuery}"
                              </div>
                            ) : (
                              searchSuggestions.map((school) => (
                                <button
                                  key={school.id}
                                  type="button"
                                  onClick={() => handleSelectSchool(school)}
                                  className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0 flex items-start justify-between"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-foreground">{school.schoolName}</div>
                                    {school.address && <div className="text-xs text-muted-foreground truncate">{school.address}</div>}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      {searchQuery.length > 0 && searchQuery.length < 2 && (
                        <p className="text-xs text-muted-foreground">Type at least 2 characters to search</p>
                      )}
                    </div>
                  ) : (
                    // School Selected - Show confirmation
                    <div className="space-y-3">
                      <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20">
                            <Check className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{searchQuery}</p>
                            <p className="text-xs text-muted-foreground">School selected</p>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleChangeSchool}
                        className="w-full text-xs"
                      >
                        Change School
                      </Button>
                    </div>
                  )}

                  {selectedSchool && (
                    <>
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
                    </>
                  )}
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

                   {!signupSchool ? (
                     <div className="space-y-3">
                       <div className="relative z-10">
                         <Label className="mb-2 block">Search for your school</Label>
                         <div className="relative">
                           <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                           <Input
                             type="text"
                             value={signupSearchQuery}
                             onChange={(e) => handleSignupSearchChange(e.target.value)}
                             onFocus={() => signupSearchQuery.length >= 2 && setSignupShowSuggestions(true)}
                             placeholder="Search for your child's school..."
                             className="pl-11 bg-transparent pr-3 py-2 text-base rounded-3xl flex h-10 w-full border border-input shadow-sm transition-colors placeholder:text-muted-foreground"
                           />
                           {signupSearchLoading && <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
                         </div>

                         {signupShowSuggestions && (
                           <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-input rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto pointer-events-auto">
                             {signupSearchSuggestions.length === 0 && signupSearchQuery.length >= 2 ? (
                               <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                                 No schools found matching "{signupSearchQuery}"
                               </div>
                             ) : (
                               signupSearchSuggestions.map((school) => (
                                 <button
                                   key={school.id}
                                   type="button"
                                   onClick={() => handleSelectSignupSchool(school)}
                                   className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0 flex items-start justify-between"
                                 >
                                   <div className="flex-1 min-w-0">
                                     <div className="font-medium text-sm text-foreground">{school.schoolName}</div>
                                     {school.address && <div className="text-xs text-muted-foreground truncate">{school.address}</div>}
                                   </div>
                                 </button>
                               ))
                             )}
                           </div>
                         )}
                       </div>
                       {signupSearchQuery.length > 0 && signupSearchQuery.length < 2 && (
                         <p className="text-xs text-muted-foreground">Type at least 2 characters to search</p>
                       )}
                     </div>
                   ) : (
                     <div className="space-y-3">
                       <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                         <div className="flex items-center gap-3">
                           <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20">
                             <Check className="w-5 h-5 text-primary" />
                           </div>
                           <div className="flex-1">
                             <p className="text-sm font-medium text-foreground">{signupSchoolName}</p>
                             <p className="text-xs text-muted-foreground">School selected</p>
                           </div>
                         </div>
                       </div>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={handleChangeSignupSchool}
                         className="w-full text-xs"
                       >
                         Change School
                       </Button>
                     </div>
                   )}

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
        <p className="text-center text-xs text-muted-foreground mt-6 pb-safe">© {new Date().getFullYear()} SchoolPulse</p>
      </div>
    </div>);

}