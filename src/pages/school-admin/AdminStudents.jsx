import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { hashPassword, generateTemporaryPassword } from '@/lib/auth';
import { logAudit } from '@/lib/auditLogger';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Loader2, ChevronDown, ChevronRight, Upload, Layers, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import CreateUserDialog from '@/components/backend/CreateUserDialog';
import StudentProfileDialog from '@/components/school/StudentProfileDialog';
import StudentGridCard from '@/components/school/StudentGridCard';
import { STREAM_OPTIONS, STREAM_LABELS, STREAM_COLORS, isStreamableClass, getStudentStream, getStudentSubjects } from '@/lib/streamUtils';

// Admin Students Page
export default function AdminStudents() {
  const { schoolUser: user } = useSchoolAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [bulkStream, setBulkStream] = useState('none');
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [expandedClasses, setExpandedClasses] = useState(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, c, sub] = await Promise.all([
        base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: "student" }),
        base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
        base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
      ]);
      setStudents(s || []);
      setClasses(c || []);
      setSubjects(sub || []);
    } catch { setStudents([]); setClasses([]); setSubjects([]); }
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

  async function handleStudentStreamChange(studentId, stream) {
    try {
      await base44.entities.SchoolUser.update(studentId, { studentStream: stream });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, studentStream: stream } : s));
    } catch { toast.error("Failed to update stream"); }
  }

  function toggleStudentSelection(studentId) {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function toggleSelectAllInClass(classId) {
    const classStudentIds = (displayGroups[classId] || []).map(s => s.id);
    const allSelected = classStudentIds.every(id => selectedStudents.has(id));
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (allSelected) {
        classStudentIds.forEach(id => next.delete(id));
      } else {
        classStudentIds.forEach(id => next.add(id));
      }
      return next;
    });
  }

  async function handleBulkStreamChange() {
    if (selectedStudents.size === 0) return;
    const ids = Array.from(selectedStudents);
    try {
      await base44.entities.SchoolUser.bulkUpdate(ids.map(id => ({ id, studentStream: bulkStream })));
      toast.success(`Updated ${ids.length} student(s) to ${STREAM_LABELS[bulkStream]}`);
      setSelectedStudents(new Set());
      loadData();
    } catch { toast.error("Failed to bulk update stream"); }
  }

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
                {isStreamableClass(classObj) && (
                  <Badge className={`text-xs ${classObj?.classStream && classObj.classStream !== 'none' ? STREAM_COLORS[classObj.classStream] : 'bg-gray-100 text-gray-600'}`}>
                    {classObj?.classStream && classObj.classStream !== 'none' ? STREAM_LABELS[classObj.classStream] : 'Mixed'}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">{studentsInClass.length} student{studentsInClass.length !== 1 ? 's' : ''}</span>
              </button>

              {/* Bulk Action Bar */}
              {selectedStudents.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-3 flex-wrap">
                  <span className="text-sm font-medium">{selectedStudents.size} selected</span>
                  <Select value={bulkStream} onValueChange={setBulkStream}>
                    <SelectTrigger className="w-40 h-8"><SelectValue placeholder="Select stream" /></SelectTrigger>
                    <SelectContent>
                      {STREAM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleBulkStreamChange} disabled={bulkStream === 'none'}>
                    <Layers className="w-3.5 h-3.5 mr-1.5" /> Apply Stream
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedStudents(new Set())}>Clear</Button>
                </div>
              )}

              {/* Class Content */}
              {isExpanded && (
                isStreamableClass(classObj) ? (
                  /* Senior classes: table-like view with stream management */
                  <div className="pl-4">
                    {/* Select All header */}
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={studentsInClass.length > 0 && studentsInClass.every(s => selectedStudents.has(s.id))}
                        onCheckedChange={() => toggleSelectAllInClass(classId)}
                      />
                      <span className="text-xs text-muted-foreground">Select all in class</span>
                    </div>
                    <div className="space-y-2">
                      {studentsInClass.map(student => {
                        const effectiveStream = getStudentStream(student, classObj);
                        const studentSubjects = getStudentSubjects(student, classObj, subjects);
                        const isSelected = selectedStudents.has(student.id);
                        const isClassStream = classObj?.classStream && classObj.classStream !== 'none';
                        return (
                          <div key={student.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow ${isSelected ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleStudentSelection(student.id)} />
                            <button className="flex-1 flex items-center gap-3 text-left min-w-0" onClick={() => setEditingStudent(student)}>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{student.fullName}</p>
                                <p className="text-xs text-muted-foreground">{student.username}</p>
                              </div>
                            </button>
                            {/* Stream dropdown */}
                            <div className="w-32 sm:w-40 flex-shrink-0">
                              {isClassStream ? (
                                <Badge className={`text-xs ${STREAM_COLORS[effectiveStream]}`}>{STREAM_LABELS[effectiveStream]}</Badge>
                              ) : (
                                <Select value={student.studentStream || 'none'} onValueChange={v => handleStudentStreamChange(student.id, v)}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {STREAM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.short}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            {/* Subject count */}
                            <div className="hidden sm:block text-xs text-muted-foreground flex-shrink-0 w-20 text-right">
                              {studentSubjects.length} subject{studentSubjects.length !== 1 ? 's' : ''}
                            </div>
                            <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => setEditingStudent(student)}>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Junior classes: existing grid card view */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-4">
                    {studentsInClass.map(student => (
                      <StudentGridCard
                        key={student.id}
                        student={student}
                        onView={setEditingStudent}
                        onEdit={setEditingStudent}
                        onReset={handleReset}
                      />
                    ))}
                  </div>
                )
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