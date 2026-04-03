import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { hashPassword, generateTemporaryPassword } from '@/lib/auth';
import { logAudit } from '@/lib/auditLogger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, UserCog, Users, GraduationCap, BookOpen, Loader2 } from 'lucide-react';
import UserTable from '@/components/backend/UserTable';
import CreateUserDialog from '@/components/backend/CreateUserDialog';
import CreateClassDialog from '@/components/backend/CreateClassDialog';
import { toast } from 'sonner';

export default function SchoolDetail() {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createRole, setCreateRole] = useState(null);
  const [showClassDialog, setShowClassDialog] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [allSchools, allUsers, allClasses] = await Promise.all([
        base44.entities.School.list(),
        base44.entities.SchoolUser.filter({ schoolId }),
        base44.entities.SchoolClass.filter({ schoolId }),
      ]);
      const s = (allSchools || []).find(sc => sc.id === schoolId);
      setSchool(s || null);
      const users = allUsers || [];
      setAdmins(users.filter(u => u.role === "admin"));
      setTeachers(users.filter(u => u.role === "teacher"));
      setStudents(users.filter(u => u.role === "student"));
      setClasses(allClasses || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleResetPassword(user) {
    const tempPwd = generateTemporaryPassword();
    await base44.entities.SchoolUser.update(user.id, { passwordHash: hashPassword(tempPwd), mustChangePassword: true });
    await logAudit({ schoolId: school.id, schoolName: school.schoolName, action: "password_reset", entityType: "SchoolUser", entityId: user.id, performedBy: "superAdmin", performedByName: "Super Admin", details: `Password reset for "${user.fullName}"` });
    toast.success(`New password for ${user.fullName}: ${tempPwd}`, { duration: 10000 });
  }

  async function handleArchive(user) {
    await base44.entities.SchoolUser.update(user.id, { isArchived: true });
    await logAudit({ schoolId: school.id, schoolName: school.schoolName, action: "user_archived", entityType: "SchoolUser", entityId: user.id, performedBy: "superAdmin", performedByName: "Super Admin", details: `"${user.fullName}" archived` });
    loadData();
  }

  async function handleRestore(user) {
    await base44.entities.SchoolUser.update(user.id, { isArchived: false });
    await logAudit({ schoolId: school.id, schoolName: school.schoolName, action: "user_restored", entityType: "SchoolUser", entityId: user.id, performedBy: "superAdmin", performedByName: "Super Admin", details: `"${user.fullName}" restored` });
    loadData();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!school) return <div className="text-center py-20 text-muted-foreground">School not found.</div>;

  const stats = [
    { label: "Admins", count: admins.filter(u => !u.isArchived).length, icon: UserCog, color: "text-purple-600 bg-purple-100" },
    { label: "Teachers", count: teachers.filter(u => !u.isArchived).length, icon: Users, color: "text-emerald-600 bg-emerald-100" },
    { label: "Students", count: students.filter(u => !u.isArchived).length, icon: GraduationCap, color: "text-amber-600 bg-amber-100" },
    { label: "Classes", count: classes.filter(c => !c.isArchived).length, icon: BookOpen, color: "text-blue-600 bg-blue-100" },
  ];

  return (
    <div>
      <Button variant="ghost" className="mb-4" onClick={() => navigate("/backend/schools")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Schools
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{school.schoolName}</h1>
          <p className="text-muted-foreground text-sm">{school.schoolCode} {school.address ? `• ${school.address}` : ""}</p>
        </div>
        <Badge variant={school.isActive ? "default" : "secondary"} className="w-fit">
          {school.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button size="sm" variant="outline" onClick={() => setCreateRole("admin")}><Plus className="w-3.5 h-3.5 mr-1" /> Add Admin</Button>
        <Button size="sm" variant="outline" onClick={() => setCreateRole("teacher")}><Plus className="w-3.5 h-3.5 mr-1" /> Add Teacher</Button>
        <Button size="sm" variant="outline" onClick={() => setCreateRole("student")}><Plus className="w-3.5 h-3.5 mr-1" /> Add Student</Button>
        <Button size="sm" variant="outline" onClick={() => setShowClassDialog(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Add Class</Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="admins">
        <TabsList className="mb-4">
          <TabsTrigger value="admins">School Admins</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">School Admins</h2>
            <Button size="sm" onClick={() => setCreateRole("admin")}><Plus className="w-3.5 h-3.5 mr-1" /> Add Admin</Button>
          </div>
          <UserTable users={admins} onResetPassword={handleResetPassword} onArchive={handleArchive} onRestore={handleRestore} />
        </TabsContent>

        <TabsContent value="teachers">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Teachers</h2>
            <Button size="sm" onClick={() => setCreateRole("teacher")}><Plus className="w-3.5 h-3.5 mr-1" /> Add Teacher</Button>
          </div>
          <UserTable users={teachers} onResetPassword={handleResetPassword} onArchive={handleArchive} onRestore={handleRestore} />
        </TabsContent>

        <TabsContent value="students">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Students</h2>
            <Button size="sm" onClick={() => setCreateRole("student")}><Plus className="w-3.5 h-3.5 mr-1" /> Add Student</Button>
          </div>
          <UserTable users={students} onResetPassword={handleResetPassword} onArchive={handleArchive} onRestore={handleRestore} />
        </TabsContent>

        <TabsContent value="classes">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Classes</h2>
            <Button size="sm" onClick={() => setShowClassDialog(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Add Class</Button>
          </div>
          {classes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No classes yet.</p>
          ) : (
            <div className="grid gap-2">
              {classes.map(c => (
                <Card key={c.id} className="border-0 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{c.className}</p>
                      <p className="text-sm text-muted-foreground">
                        {c.educationLevel === "junior" ? "Junior" : c.educationLevel === "senior" ? "Senior" : ""} {c.academicTrack || ""}
                      </p>
                    </div>
                    <Badge variant={c.isArchived ? "secondary" : "default"}>
                      {c.isArchived ? "Archived" : "Active"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {createRole && (
        <CreateUserDialog
          open={!!createRole}
          onOpenChange={(v) => { if (!v) setCreateRole(null); }}
          role={createRole}
          school={school}
          classes={classes.filter(c => !c.isArchived)}
          onCreated={() => { setCreateRole(null); loadData(); }}
        />
      )}

      <CreateClassDialog open={showClassDialog} onOpenChange={setShowClassDialog} school={school} onCreated={loadData} />
    </div>
  );
}