import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { hashPassword, generateTemporaryPassword, generateUsername } from '@/lib/auth';
import { logAudit } from '@/lib/auditLogger';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const staffPermissionFeatures = [
  { id: 'adminHR', label: 'HR Management', description: 'Manage HR operations' },
  { id: 'staffAttendance', label: 'Staff Attendance', description: 'Track staff clock in/out' },
  { id: 'leaveRequests', label: 'Leave Requests', description: 'Manage leave requests' },
  { id: 'teacherWorkload', label: 'Teacher Workload', description: 'View teacher workload' },
  { id: 'adminStudents', label: 'Manage Students', description: 'View and manage student records' },
  { id: 'adminTeachers', label: 'Manage Teachers', description: 'View and manage teacher records' },
  { id: 'attendance', label: 'Student Attendance', description: 'View and manage attendance' },
  { id: 'announcements', label: 'Announcements', description: 'View and create announcements' },
  { id: 'adminHealth', label: 'Health & Medical', description: 'Master toggle for all health features' },
  { id: 'healthNurseVisits', label: 'Nurse Visits', description: 'Access to nurse visits' },
  { id: 'healthIncidents', label: 'Medical Incidents', description: 'Access to medical incidents' },
  { id: 'healthVaccinations', label: 'Vaccinations', description: 'Access to vaccinations' },
  { id: 'healthSpecialNeeds', label: 'Special Needs', description: 'Access to special needs' },
  { id: 'healthAnalytics', label: 'Health Analytics', description: 'Access to health analytics' },
  { id: 'adminLibrary', label: 'Library', description: 'Manage library' },
  { id: 'adminHostel', label: 'Hostel Management', description: 'Manage hostels' },
  { id: 'adminInventory', label: 'Inventory', description: 'Manage inventory' },
  { id: 'adminFinance', label: 'Finance', description: 'Manage fees and payments' },
];

export default function CreateUserDialog({ open, onOpenChange, role, school, classes, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ fullName: "", email: "", classId: "", gender: "", jobTitle: "", department: "" });
  const [permissions, setPermissions] = useState({});
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const roleLabel = { admin: "School Admin", teacher: "Teacher", student: "Student", parent: "Parent", hr_staff: "Non-Teaching Staff" }[role] || role;

  function reset() {
    setStep("form");
    setForm({ fullName: "", email: "", classId: "", gender: "", jobTitle: "", department: "" });
    setPermissions({});
    setCredentials(null);
    setCopied(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const allUsers = await base44.entities.SchoolUser.list();
      const existingUsernames = (allUsers || []).map(u => u.username).filter(Boolean);
      const username = generateUsername(form.fullName, existingUsernames);
      const tempPassword = generateTemporaryPassword();
      const selectedClass = (classes || []).find(c => c.id === form.classId);

      const userData = {
        fullName: form.fullName,
        email: form.email || "",
        username,
        passwordHash: hashPassword(tempPassword),
        role,
        schoolId: school.id,
        schoolName: school.schoolName,
        mustChangePassword: true,
        isArchived: false,
      };

      let parentLinkCode = "";
      if (role === "student") {
        if (form.gender) userData.gender = form.gender;
        parentLinkCode = Math.random().toString(36).substring(2, 6).toUpperCase() +
                         Math.random().toString(36).substring(2, 6).toUpperCase();
        userData.parentLinkCode = parentLinkCode;
        if (selectedClass) {
          userData.classId = selectedClass.id;
          userData.className = selectedClass.className;
          userData.baseLevel = selectedClass.baseLevel || "";
          userData.subsetName = selectedClass.subsetName || "";
          userData.educationLevel = selectedClass.educationLevel || "";
          userData.academicTrack = selectedClass.academicTrack || "";
        }
      }

      if (role === "hr_staff") {
        userData.jobTitle = form.jobTitle || "";
        userData.department = form.department || "Administration";
        // Build permittedFeatures from the toggled permissions
        const pf = {};
        staffPermissionFeatures.forEach(f => {
          pf[f.id] = permissions[f.id] || false;
        });
        userData.permittedFeatures = pf;
      }

      await base44.entities.SchoolUser.create(userData);

      if (form.email) {
        const inviteRole = "user";
        try {
          await base44.users.inviteUser(form.email, inviteRole);
        } catch (inviteErr) {
          console.warn("Base44 invite failed (user may already exist):", inviteErr);
        }
      }

      await logAudit({ schoolId: school.id, schoolName: school.schoolName, action: `${role}_created`, entityType: "SchoolUser", performedBy: "superAdmin", performedByName: "Super Admin", details: `${roleLabel} "${form.fullName}" created` });

      setCredentials({ username, password: tempPassword, parentLinkCode });
      setStep("done");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create user");
    }
    setLoading(false);
  }

  function handleCopy() {
    if (!credentials) return;
    const linkLine = credentials.parentLinkCode ? `\nParent Link Code: ${credentials.parentLinkCode}` : "";
    navigator.clipboard.writeText(`Username: ${credentials.username}\nPassword: ${credentials.password}${linkLine}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDone() {
    reset();
    onOpenChange(false);
    if (onCreated) onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className={role === "hr_staff" ? "max-w-2xl" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle>{step === "form" ? `Add ${roleLabel}` : "Credentials Created"}</DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-primary/5 p-3 rounded-lg text-sm">
              <strong>School:</strong> {school?.schoolName}
            </div>
            <div className="space-y-2"><Label>Full Name *</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>

            {role === "student" && (
              <>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(classes || []).length > 0 && (
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={form.classId} onValueChange={v => setForm({ ...form, classId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {(classes || []).map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {role === "hr_staff" && (
              <>
                <div className="space-y-2">
                  <Label>Job Title *</Label>
                  <Input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} placeholder="e.g. School Nurse, Bursar, Librarian" required />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {(school?.departments?.length ? school.departments : ["Administration", "Finance", "Health", "Library", "Hostel", "Inventory", "Transport", "Maintenance"]).map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block">Permissions — grant access to specific modules</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {staffPermissionFeatures.map(f => (
                      <div key={f.id} className="flex items-center justify-between p-2 rounded hover:bg-accent/50">
                        <div className="min-w-0 mr-3">
                          <p className="font-medium text-sm">{f.label}</p>
                          <p className="text-xs text-muted-foreground">{f.description}</p>
                        </div>
                        <Switch
                          checked={permissions[f.id] || false}
                          onCheckedChange={checked =>
                            setPermissions({ ...permissions, [f.id]: checked })
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Toggle on the modules this staff member should access. You can change these later from the school admin panel.</p>
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create {roleLabel}
            </Button>
          </form>
        )}

        {step === "done" && credentials && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-700 mb-3">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Account Created Successfully</span>
              </div>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Username:</span> <strong>{credentials.username}</strong></div>
                <div><span className="text-muted-foreground">Password:</span> <strong>{credentials.password}</strong></div>
                {credentials.parentLinkCode && (
                  <div className="mt-2 pt-2 border-t border-emerald-200">
                    <span className="text-muted-foreground">Parent Link Code:</span>{" "}
                    <strong className="text-lg tracking-widest">{credentials.parentLinkCode}</strong>
                    <p className="text-xs text-muted-foreground mt-0.5">Share this code with the student's parent to link their account.</p>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Save these credentials — the password won't be shown again.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button className="flex-1" onClick={handleDone}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}