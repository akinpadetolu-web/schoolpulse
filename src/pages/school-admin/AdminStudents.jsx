import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { hashPassword, generateTemporaryPassword } from '@/lib/auth';
import { logAudit } from '@/lib/auditLogger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2, ChevronDown, ChevronRight, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CreateUserDialog from '@/components/backend/CreateUserDialog';
import StudentProfileDialog from '@/components/school/StudentProfileDialog';
import StudentGridCard from '@/components/school/StudentGridCard';

import { toast } from 'sonner';

// Admin Students Page
export default function AdminStudents() {
  const { schoolUser: user } = useSchoolAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [expandedClasses, setExpandedClasses] = useState(new Set());
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

  // Filter students by search across all classes
  const filtered = students.filter(s =>
    (s.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.username || "").toLowerCase().includes(search.toLowerCase())
  );

  // Group by class
  const grouped = {};
  filtered.forEach(student => {
    const classId = student.classId || 'unassigned';
    if (!grouped[classId]) grouped[classId] = [];
    grouped[classId].push(student);
  });

  // Apply class filter
  const displayGroups = selectedClass === 'all'
    ? grouped
    : { [selectedClass]: grouped[selectedClass] || [] };

  // Sort groups by class name
  const sortedClassIds = Object.keys(displayGroups).sort((a, b) => {
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    const classA = classes.find(c => c.id === a)?.className || '';
    const classB = classes.find(c => c.id === b)?.className || '';
    return classA.localeCompare(classB);
  });

  const toggleClass = (classId) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId);
    } else {
      newExpanded.add(classId);
    }
    setExpandedClasses(newExpanded);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex gap-2">
          <Link to="/school-admin/bulk-import-students">
            <Button variant="outline"><Upload className="w-4 h-4 mr-2" /> Bulk Import</Button>
          </Link>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Add Student</Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or username..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Student Groups */}
      <div className="space-y-6">
        {sortedClassIds.map(classId => {
          const classObj = classes.find(c => c.id === classId);
          const className = classObj?.className || 'Unassigned';
          const studentsInClass = displayGroups[classId] || [];
          const isExpanded = expandedClasses.has(classId);

          return (
            <div key={classId}>
              {/* Class Header */}
              <button
                onClick={() => toggleClass(classId)}
                className="w-full flex items-center gap-2 p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors mb-3"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-primary" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
                <h2 className="text-lg font-semibold flex-1 text-left">{className}</h2>
                <span className="text-sm text-muted-foreground">{studentsInClass.length} student{studentsInClass.length !== 1 ? 's' : ''}</span>
              </button>

              {/* Class Content */}
              {isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-4">
                  {studentsInClass.map(student => (
                    <StudentGridCard
                      key={student.id}
                      student={student}
                      onView={setEditingStudent}
                      onEdit={setEditingStudent}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {sortedClassIds.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No students found.</p>
          </div>
        )}
      </div>
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