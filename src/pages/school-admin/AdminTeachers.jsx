import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { hashPassword, generateTemporaryPassword } from '@/lib/auth';
import { logAudit } from '@/lib/auditLogger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2 } from 'lucide-react';
import UserTable from '@/components/backend/UserTable';
import CreateUserDialog from '@/components/backend/CreateUserDialog';
import TeacherProfileDialog from '@/components/school/TeacherProfileDialog';
import { toast } from 'sonner';

export default function AdminTeachers() {
  const { schoolUser: user } = useSchoolAuth();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: "teacher" });
      setTeachers(data || []);
    } catch { setTeachers([]); }
    setLoading(false);
  }

  const school = { id: user?.schoolId, schoolName: user?.schoolName };

  async function handleReset(u) {
    const pwd = generateTemporaryPassword();
    await base44.entities.SchoolUser.update(u.id, { passwordHash: hashPassword(pwd), mustChangePassword: true });
    await logAudit({ schoolId: user.schoolId, schoolName: user.schoolName, action: "password_reset", entityType: "SchoolUser", entityId: u.id, performedBy: user.id, performedByName: user.fullName, details: `Reset for "${u.fullName}"` });
    toast.success(`Temporary password for ${u.fullName}: ${pwd}`, { duration: 15000 });
  }

  async function handleArchive(u) { await base44.entities.SchoolUser.update(u.id, { isArchived: true }); loadData(); }
  async function handleRestore(u) { await base44.entities.SchoolUser.update(u.id, { isArchived: false }); loadData(); }

  const filtered = teachers.filter(t => (t.fullName || "").toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Teachers</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Add Teacher</Button>
      </div>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <UserTable users={filtered} onResetPassword={handleReset} onArchive={handleArchive} onRestore={handleRestore} onRowClick={setSelectedTeacher} />
      {showCreate && (
        <CreateUserDialog open={showCreate} onOpenChange={setShowCreate} role="teacher" school={school} classes={[]} onCreated={loadData} />
      )}
      {selectedTeacher && (
        <TeacherProfileDialog
          open={!!selectedTeacher}
          onOpenChange={v => { if (!v) setSelectedTeacher(null); }}
          teacher={selectedTeacher}
          schoolId={user?.schoolId}
          onSaved={loadData}
        />
      )}
    </div>
  );
}