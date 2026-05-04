import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, Trash2, Copy, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { clearFeatureCache, getDefaultFeatures } from '@/lib/featureToggleManager';
import SidebarPreview from '@/components/backend/SidebarPreview';

const ALL_FEATURES = [
  { id: 'adminDashboard', label: 'Admin Dashboard', description: 'Access to admin dashboard' },
  { id: 'adminStudents', label: 'Manage Students', description: 'View and manage student records' },
  { id: 'adminTeachers', label: 'Manage Teachers', description: 'View and manage teacher records' },
  { id: 'adminClasses', label: 'Manage Classes', description: 'Create and manage school classes' },
  { id: 'adminSubjects', label: 'Manage Subjects', description: 'Create and manage subjects' },
  { id: 'timetable', label: 'Timetable', description: 'View and manage class timetable' },
  { id: 'adminEvents', label: 'School Events', description: 'Manage school calendar and events' },
  { id: 'assignments', label: 'Assignments', description: 'View and manage assignments' },
  { id: 'grades', label: 'Grades', description: 'View and manage grades' },
  { id: 'attendance', label: 'Attendance', description: 'View and manage attendance records' },
  { id: 'adminExaminations', label: 'Examinations', description: 'Manage exam results and data' },
  { id: 'reportCards', label: 'Report Cards', description: 'View and manage report cards' },
  { id: 'adminReportCardTemplates', label: 'RC Templates', description: 'Manage report card templates' },
  { id: 'adminTeacherAssignments', label: 'Teacher Assignments', description: 'Assign teachers to classes' },
  { id: 'adminBulkAssign', label: 'Bulk Assign', description: 'Bulk assign teachers to classes' },
  { id: 'adminCategories', label: 'Subject Categories', description: 'Manage subject categories' },
  { id: 'eClass', label: 'Virtual Classes', description: 'Access e-learning classes' },
  { id: 'announcements', label: 'Announcements', description: 'View and create announcements' },
  { id: 'messages', label: 'Messaging', description: 'Send and receive messages' },
  { id: 'adminEmailCampaign', label: 'Email Campaign', description: 'Send email campaigns' },
  { id: 'adminApprovals', label: 'Approvals', description: 'Approve content and requests' },
  { id: 'teacherWorkload', label: 'Teacher Workload', description: 'View teacher workload' },
  { id: 'staffAttendance', label: 'Staff Attendance', description: 'Track staff clock in/out' },
  { id: 'leaveRequests', label: 'Leave Requests', description: 'Manage leave requests' },
  { id: 'adminHR', label: 'HR Management', description: 'Manage HR operations' },
  { id: 'adminSettings', label: 'School Settings', description: 'Configure school settings' },
  { id: 'gradingSystem', label: 'Grading System', description: 'Configure grading system' },
  { id: 'promotion', label: 'Promotion', description: 'Manage student promotion' },
  { id: 'academicTerms', label: 'Academic Terms', description: 'Manage academic terms' },
  { id: 'lessonPlans', label: 'Lesson Plans', description: 'View lesson plans' },
  { id: 'materials', label: 'Lesson Materials', description: 'View course materials' },
  { id: 'quizzes', label: 'Quizzes', description: 'View and take quizzes' },
  { id: 'studentReports', label: 'Student Reports', description: 'View student reports' },
];

function getRoleFeatures(role) {
  const defaults = getDefaultFeatures(role);
  return ALL_FEATURES.filter(f => f.id in defaults);
}

const ROLES = [
  { value: 'admin', label: 'School Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
];

export default function FeatureToggles() {
  const [toggles, setToggles] = useState([]);
  const [schools, setSchools] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState('teacher');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewFeatures, setPreviewFeatures] = useState({});

  const [form, setForm] = useState({
    schoolIds: [],
    role: 'teacher',
    userId: '',
    features: {},
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [togs, schs, usrs] = await Promise.all([
      base44.entities.FeatureToggle.list(),
      base44.entities.School.list(),
      base44.entities.SchoolUser.list(),
    ]);
    setToggles(togs || []);
    setSchools(schs || []);
    setUsers(usrs || []);
    setLoading(false);
  }

  function openForm(toggle = null) {
    if (toggle) {
      setForm({
        schoolIds: toggle.schoolId ? [toggle.schoolId] : [],
        role: toggle.role,
        userId: toggle.userId || '',
        features: toggle.features || {},
        description: toggle.description || '',
      });
      setEditingId(toggle.id);
    } else {
      const defaultRole = 'teacher';
      const defaultFeatures = getDefaultFeatures(defaultRole);
      setForm({
        schoolIds: [],
        role: defaultRole,
        userId: '',
        features: defaultFeatures,
        description: '',
      });
      setEditingId(null);
    }
    setShowForm(true);
  }

  async function saveToggle() {
    if (!form.role) {
      toast.error('Role is required');
      return;
    }

    setSaving(true);
    try {
      const user = form.userId ? users.find(u => u.id === form.userId) : null;
      const schoolsToCreate = form.schoolIds.length > 0 ? form.schoolIds : [''];

      const promises = schoolsToCreate.map(schoolId => {
        const school = schoolId ? schools.find(s => s.id === schoolId) : null;
        const payload = {
          schoolId: schoolId,
          schoolName: school?.schoolName || 'Global',
          role: form.role,
          userId: form.userId,
          userName: user?.fullName || '',
          features: form.features,
          description: form.description,
          isActive: true,
        };

        if (editingId && form.schoolIds.length === 1) {
          return base44.entities.FeatureToggle.update(editingId, payload);
        } else {
          return base44.entities.FeatureToggle.create(payload);
        }
      });

      await Promise.all(promises);
      toast.success(`Toggle ${editingId && form.schoolIds.length === 1 ? 'updated' : 'created'} for ${schoolsToCreate.length} school(s)`);
      clearFeatureCache();
      setShowForm(false);
      loadData();
    } catch (error) {
      toast.error('Failed to save toggle');
    }
    setSaving(false);
  }

  async function deleteToggle(id) {
    if (!confirm('Delete this toggle?')) return;
    await base44.entities.FeatureToggle.delete(id);
    toast.success('Deleted');
    clearFeatureCache();
    loadData();
  }

  async function duplicateToggle(toggle) {
    setSaving(true);
    try {
      const newPayload = { ...toggle };
      delete newPayload.id;
      delete newPayload.created_date;
      delete newPayload.updated_date;
      delete newPayload.created_by;

      await base44.entities.FeatureToggle.create(newPayload);
      toast.success('Toggle duplicated');
      clearFeatureCache();
      loadData();
    } catch {
      toast.error('Failed to duplicate');
    }
    setSaving(false);
  }

  const filteredToggles = toggles.filter(t => {
    if (selectedRole && t.role !== selectedRole) return false;
    if (selectedSchool && t.schoolId !== selectedSchool) return false;
    return true;
  });

  const roleUsers = users.filter(u => u.role === selectedRole && (!selectedSchool || u.schoolId === selectedSchool));

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Toggles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage which features are available for each role and school
          </p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Create Toggle
        </Button>
      </div>

      <Tabs defaultValue="toggles">
        <TabsList>
          <TabsTrigger value="toggles">Toggles ({filteredToggles.length})</TabsTrigger>
          <TabsTrigger value="features">Feature Library</TabsTrigger>
        </TabsList>

        <TabsContent value="toggles" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <Label className="text-xs">Filter by Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Roles</SelectItem>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Filter by School</Label>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Global / All</SelectItem>
                  {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.schoolName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredToggles.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No toggles yet. Create one to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredToggles.map(toggle => (
                <Card key={toggle.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {toggle.schoolName} • {ROLES.find(r => r.value === toggle.role)?.label}
                          </h3>
                          {toggle.userId && (
                            <Badge variant="outline">{toggle.userName}</Badge>
                          )}
                        </div>
                        {toggle.description && (
                          <p className="text-xs text-muted-foreground">{toggle.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => {
                          setPreviewFeatures(toggle.features);
                          setShowPreview(true);
                        }}>
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => duplicateToggle(toggle)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openForm(toggle)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteToggle(toggle.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {getRoleFeatures(toggle.role).map(f => (
                        <Badge
                          key={f.id}
                          className={toggle.features?.[f.id] ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}
                        >
                          {f.label}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="features">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Available Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ALL_FEATURES.map(f => (
                  <div key={f.id} className="p-3 border rounded-lg">
                    <p className="font-medium">{f.label}</p>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Dashboard Preview</DialogTitle>
          </DialogHeader>
          <SidebarPreview features={previewFeatures} />
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Create'} Feature Toggle</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <Label>Schools (optional - leave empty for global)</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                {schools.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No schools available</p>
                ) : (
                  schools.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.schoolIds.includes(s.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setForm({ ...form, schoolIds: [...form.schoolIds, s.id] });
                          } else {
                            setForm({ ...form, schoolIds: form.schoolIds.filter(id => id !== s.id) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{s.schoolName}</span>
                    </label>
                  ))
                )}
              </div>
              {form.schoolIds.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">No schools selected = Global default</p>
              )}
            </div>
              <div>
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={v => {
                  const newDefaults = getDefaultFeatures(v);
                  setForm({ ...form, role: v, features: newDefaults });
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Specific User (optional - leave empty to apply to all with this role)</Label>
              <Select value={form.userId} onValueChange={v => setForm({ ...form, userId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All users with this role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Users</SelectItem>
                  {roleUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Input
                placeholder="e.g., Restricted access for new admins"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <Label className="mb-3 block">Features for {ROLES.find(r => r.value === form.role)?.label}</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getRoleFeatures(form.role).map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                    </div>
                    <Switch
                      checked={form.features?.[f.id] || false}
                      onCheckedChange={checked =>
                        setForm({
                          ...form,
                          features: { ...form.features, [f.id]: checked },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={saveToggle} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {editingId ? 'Save Changes' : 'Create Toggle'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}