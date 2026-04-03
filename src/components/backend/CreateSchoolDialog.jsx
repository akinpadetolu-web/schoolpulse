import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { hashPassword, generateTemporaryPassword, generateUsername } from '@/lib/auth';
import { logAudit } from '@/lib/auditLogger';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, CheckCircle2 } from 'lucide-react';

export default function CreateSchoolDialog({ open, onOpenChange, onCreated }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [school, setSchool] = useState({ schoolName: "", schoolCode: "", address: "", contactEmail: "", contactPhone: "" });
  const [adminForm, setAdminForm] = useState({ fullName: "", email: "" });
  const [createdSchool, setCreatedSchool] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setStep(1);
    setSchool({ schoolName: "", schoolCode: "", address: "", contactEmail: "", contactPhone: "" });
    setAdminForm({ fullName: "", email: "" });
    setCreatedSchool(null);
    setCredentials(null);
    setCopied(false);
  }

  async function handleCreateSchool(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await base44.entities.School.create({
        ...school,
        isActive: true,
        isArchived: false,
      });
      setCreatedSchool(created);
      await logAudit({ schoolId: created.id, schoolName: created.schoolName, action: "school_created", entityType: "School", entityId: created.id, performedBy: "superAdmin", performedByName: "Super Admin", details: `School "${created.schoolName}" created` });
      setStep(2);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const allUsers = await base44.entities.SchoolUser.list();
      const existingUsernames = (allUsers || []).map(u => u.username).filter(Boolean);
      const username = generateUsername(adminForm.fullName, existingUsernames);
      const tempPassword = generateTemporaryPassword();

      await base44.entities.SchoolUser.create({
        fullName: adminForm.fullName,
        email: adminForm.email,
        username,
        passwordHash: hashPassword(tempPassword),
        role: "admin",
        schoolId: createdSchool.id,
        schoolName: createdSchool.schoolName,
        mustChangePassword: true,
        isArchived: false,
      });

      await logAudit({ schoolId: createdSchool.id, schoolName: createdSchool.schoolName, action: "school_admin_created", entityType: "SchoolUser", performedBy: "superAdmin", performedByName: "Super Admin", details: `Admin "${adminForm.fullName}" created for ${createdSchool.schoolName}` });

      setCredentials({ username, password: tempPassword });
      setStep(3);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function handleCopy() {
    if (!credentials) return;
    navigator.clipboard.writeText(`Username: ${credentials.username}\nPassword: ${credentials.password}`);
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
          <DialogTitle>
            {step === 1 && "Create School"}
            {step === 2 && "Create School Admin"}
            {step === 3 && "Credentials Created"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <form onSubmit={handleCreateSchool} className="space-y-4">
            <div className="space-y-2"><Label>School Name *</Label><Input value={school.schoolName} onChange={e => setSchool({ ...school, schoolName: e.target.value })} required /></div>
            <div className="space-y-2"><Label>School Code *</Label><Input value={school.schoolCode} onChange={e => setSchool({ ...school, schoolCode: e.target.value })} required placeholder="e.g. SCH001" /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={school.address} onChange={e => setSchool({ ...school, address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Contact Email</Label><Input type="email" value={school.contactEmail} onChange={e => setSchool({ ...school, contactEmail: e.target.value })} /></div>
            <div className="space-y-2"><Label>Contact Phone</Label><Input value={school.contactPhone} onChange={e => setSchool({ ...school, contactPhone: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create School & Continue
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="bg-primary/5 p-3 rounded-lg text-sm">
              <strong>School:</strong> {createdSchool?.schoolName}
            </div>
            <div className="space-y-2"><Label>Admin Full Name *</Label><Input value={adminForm.fullName} onChange={e => setAdminForm({ ...adminForm, fullName: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Admin Email *</Label><Input type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} required /></div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Admin Account
            </Button>
          </form>
        )}

        {step === 3 && credentials && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-700 mb-3">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Account Created Successfully</span>
              </div>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Username:</span> <strong>{credentials.username}</strong></div>
                <div><span className="text-muted-foreground">Password:</span> <strong>{credentials.password}</strong></div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Save these credentials — the password won't be shown again.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied!" : "Copy Credentials"}
              </Button>
              <Button className="flex-1" onClick={handleDone}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}