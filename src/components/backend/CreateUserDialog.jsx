import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { hashPassword, generateTemporaryPassword, generateUsername } from '@/lib/auth';
import { logAudit } from '@/lib/auditLogger';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Copy, CheckCircle2 } from 'lucide-react';

export default function CreateUserDialog({ open, onOpenChange, role, school, classes, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ fullName: "", email: "", classId: "" });
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const roleLabel = { admin: "School Admin", teacher: "Teacher", student: "Student", parent: "Parent" }[role] || role;

  function reset() {
    setStep("form");
    setForm({ fullName: "", email: "", classId: "" });
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
        // Generate a unique 8-char alphanumeric link code
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

      await base44.entities.SchoolUser.create(userData);
      await logAudit({ schoolId: school.id, schoolName: school.schoolName, action: `${role}_created`, entityType: "SchoolUser", performedBy: "superAdmin", performedByName: "Super Admin", details: `${roleLabel} "${form.fullName}" created` });

      setCredentials({ username, password: tempPassword, parentLinkCode });
      setStep("done");
    } catch (err) {
      console.error(err);
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
      <DialogContent className="max-w-md">
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
            
            {role === "student" && (classes || []).length > 0 && (
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