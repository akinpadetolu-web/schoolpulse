import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { hashPassword, generateTemporaryPassword } from '@/lib/auth';
import { logAudit } from '@/lib/auditLogger';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import UserTable from '@/components/backend/UserTable';
import { toast } from 'sonner';

export default function Students() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await base44.entities.SchoolUser.filter({ role: "student" });
      setUsers(data || []);
    } catch { setUsers([]); }
    setLoading(false);
  }

  async function handleReset(user) {
    const pwd = generateTemporaryPassword();
    await base44.entities.SchoolUser.update(user.id, { passwordHash: hashPassword(pwd), mustChangePassword: true });
    await logAudit({ schoolId: user.schoolId, schoolName: user.schoolName, action: "password_reset", entityType: "SchoolUser", entityId: user.id, performedBy: "superAdmin", performedByName: "Super Admin", details: `Reset for "${user.fullName}"` });
    toast.success(`New password: ${pwd}`, { duration: 10000 });
  }

  async function handleArchive(user) { await base44.entities.SchoolUser.update(user.id, { isArchived: true }); loadData(); }
  async function handleRestore(user) { await base44.entities.SchoolUser.update(user.id, { isArchived: false }); loadData(); }

  const filtered = users.filter(u => (u.fullName || "").toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Students</h1>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <UserTable users={filtered} onResetPassword={handleReset} onArchive={handleArchive} onRestore={handleRestore} />
    </div>
  );
}