import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { hashPassword } from '@/lib/auth';
import { Plus, Search, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import CreateStaffDialog from '@/components/staff/CreateStaffDialog';
import EditStaffDialog from '@/components/staff/EditStaffDialog';
import StaffAccessControlPanel from '@/components/staff/StaffAccessControlPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const MODULE_TO_FEATURE = {
  medical: 'adminHealth',
  library: 'adminLibrary',
  hostel: 'adminHostel',
  inventory: 'adminInventory',
  finance: 'adminFinance',
  hr: 'adminHR',
};

export default function AdminStaff() {
  const { schoolUser: user } = useSchoolAuth();
  const schoolId = user?.schoolId;

  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Load staff
  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }
    async function load() {
      try {
        const [data, schoolData] = await Promise.all([
          base44.entities.NonTeachingStaff.filter({ schoolId, isArchived: false }),
          base44.entities.School.filter({ id: schoolId }),
        ]);
        setStaff(data || []);
        setDepartments(schoolData?.[0]?.departments || []);
      } catch (err) {
        toast.error('Failed to load staff');
      }
      setLoading(false);
    }
    load();

    const unsub = base44.entities.NonTeachingStaff.subscribe(() => {
      base44.entities.NonTeachingStaff.filter({ schoolId, isArchived: false }).then(d => setStaff(d || []));
    });
    return () => unsub?.();
  }, [schoolId]);

  const filtered = staff.filter(s => {
    const matchSearch = s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
                       s.email?.toLowerCase().includes(search.toLowerCase()) ||
                       s.jobTitle?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this staff member?')) return;
    try {
      await base44.entities.NonTeachingStaff.update(id, { isArchived: true });
      setStaff(s => s.filter(x => x.id !== id));
      toast.success('Staff member deleted');
    } catch (err) {
      toast.error('Failed to delete staff');
    }
  };

  const handleCreate = async (data) => {
    try {
      const { password, ...staffData } = data;
      // Map module permissions to permittedFeatures for sidebar visibility
      const permittedFeatures = {};
      if (data.permissions) {
        Object.entries(data.permissions).forEach(([moduleKey, perms]) => {
          const featureKey = MODULE_TO_FEATURE[moduleKey];
          if (featureKey && perms) permittedFeatures[featureKey] = true;
        });
      }
      // Create login account so non-teaching staff can sign in
      await base44.entities.SchoolUser.create({
        fullName: data.fullName,
        email: data.email,
        username: data.email,
        passwordHash: hashPassword(password),
        role: 'hr_staff',
        schoolId,
        schoolName: user?.schoolName,
        mustChangePassword: false,
        isArchived: false,
        permittedFeatures,
        staffPermissions: data.permissions || {},
        jobTitle: data.jobTitle || '',
        department: data.department || '',
        genderAccess: data.genderAccess || '',
      });
      await base44.entities.NonTeachingStaff.create({ ...staffData, schoolId, schoolName: user?.schoolName });
      setShowCreateDialog(false);
      const updated = await base44.entities.NonTeachingStaff.filter({ schoolId, isArchived: false });
      setStaff(updated || []);
      toast.success('Staff member created with login access');
    } catch (err) {
      toast.error('Failed to create staff — this email may already be in use');
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await base44.entities.NonTeachingStaff.update(id, data);
      setEditingStaff(null);
      const updated = await base44.entities.NonTeachingStaff.filter({ schoolId, isArchived: false });
      setStaff(updated || []);
      toast.success('Staff member updated');
    } catch (err) {
      toast.error('Failed to update staff');
    }
  };

  const statusBadgeColor = (status) => {
    if (status === 'active') return 'bg-emerald-100 text-emerald-700';
    if (status === 'inactive') return 'bg-slate-100 text-slate-700';
    if (status === 'on_leave') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Non-Teaching Staff</h1>
          <p className="text-slate-500 text-sm mt-1">Manage support staff and administrative personnel</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Staff
        </Button>
      </div>

      <Tabs defaultValue="directory" className="w-full">
        <TabsList>
          <TabsTrigger value="directory">Staff Directory</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
        </TabsList>
        <TabsContent value="directory" className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-lg">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, email, or position..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_leave">On Leave</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {staff.length === 0 ? 'No staff members yet' : 'No results match your search'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Position</th>
                  <th className="px-4 py-3 text-left font-medium">Department</th>
                  <th className="px-4 py-3 text-left font-medium">Contact</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium">{s.fullName || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.jobTitle || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.department || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                      {s.email && <div>{s.email}</div>}
                      {s.phone && <div className="text-slate-500">{s.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadgeColor(s.status)}>
                        {s.status?.charAt(0).toUpperCase() + s.status?.slice(1) || 'Active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingStaff(s)}
                        className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(s.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{staff.length}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Total Staff</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{staff.filter(s => s.status === 'active').length}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Active</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{staff.filter(s => s.status === 'inactive').length}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Inactive</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{staff.filter(s => s.status === 'on_leave').length}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">On Leave</p>
        </div>
      </div>
        </TabsContent>
        <TabsContent value="access">
          <StaffAccessControlPanel schoolId={schoolId} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showCreateDialog && <CreateStaffDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onSave={handleCreate} departments={departments} />}
      {editingStaff && <EditStaffDialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)} staff={editingStaff} onSave={handleUpdate} departments={departments} />}
    </div>
  );
}