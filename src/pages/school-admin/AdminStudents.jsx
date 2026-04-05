import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { hashPassword, generateTemporaryPassword } from '@/lib/auth';
import { logAudit } from '@/lib/auditLogger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2 } from 'lucide-react';
import UserTable from '@/components/backend/UserTable';
import CreateUserDialog from '@/components/backend/CreateUserDialog';
import StudentProfileDialog from '@/components/school/StudentProfileDialog';
import { toast } from 'sonner';

export default function AdminStudents() {
  const user = getCurrentUser();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, c] = await Promise.all([
        base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: "student" }),
        base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
      ]);
      setStudents(s || []);
      setClasses(c || []);
    } catch { setStudents([]); setClasses([]); }
    setLoading(false);
  }

  const school = { id: user?.schoolId, schoolName: user?.schoolName };

  async function handleReset(u) {
    const pwd = generateTemporaryPassword();
    await base44.entities.SchoolUser.update(u.id, { passwordHash: hashPassword(pwd), mustChangePassword: true });
    toast.success(`New password: ${pwd}`, { duration: 10000 });
  }

  async function handleArchive(u) { await base44.entities.SchoolUser.update(u.id, { isArchived: true }); loadData(); }
  async function handleRestore(u) { await base44.entities.SchoolUser.update(u.id, { isArchived: false }); loadData(); }

  const filtered = students.filter(t => (t.fullName || "").toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Students</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Add Student</Button>
      </div>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <UserTable users={filtered} onResetPassword={handleReset} onArchive={handleArchive} onRestore={handleRestore} onRowClick={setEditingStudent} />
      {showCreate && (
        <CreateUserDialog open={showCreate} onOpenChange={setShowCreate} role="student" school={school} classes={classes} onCreated={loadData} />
      )}
      {editingStudent && (
        <StudentProfileDialog
          open={!!editingStudent}
          onOpenChange={v => { if (!v) setEditingStudent(null); }}
          student={editingStudent}
          classes={classes}
          schoolId={user?.schoolId}
          onSaved={loadData}
        />
      )}
    </div>
  );
}