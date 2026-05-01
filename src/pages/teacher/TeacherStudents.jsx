import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Users } from 'lucide-react';

export default function TeacherStudents() {
  const { schoolUser: user } = useSchoolAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');

  useEffect(() => {
    async function loadStudents() {
      try {
        // Fetch all students in the teacher's assigned classes
        const allStudents = await base44.entities.SchoolUser.filter({
          schoolId: user.schoolId,
          role: 'student',
          isArchived: false,
        });

        // Filter by teacher's assigned classes
        const assignedClasses = user.assignedClasses || [];
        const filtered = allStudents.filter(s => assignedClasses.includes(s.classId));
        setStudents(filtered);
      } catch (error) {
        console.error('Error loading students:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user?.schoolId) {
      loadStudents();
    }
  }, [user?.schoolId, user?.assignedClasses]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = base44.entities.SchoolUser.subscribe((event) => {
      if (event.data?.role === 'student' && event.data?.schoolId === user.schoolId) {
        // Refresh students list on update
        const assignedClasses = user.assignedClasses || [];
        setStudents(prev => {
          if (event.type === 'delete') {
            return prev.filter(s => s.id !== event.id);
          }
          if (event.type === 'update') {
            return prev.map(s => s.id === event.id ? event.data : s).filter(s => assignedClasses.includes(s.classId));
          }
          return prev;
        });
      }
    });
    return unsubscribe;
  }, [user.schoolId, user.assignedClasses]);

  // Get unique classes from filtered students
  const classes = useMemo(() => {
    const map = {};
    students.forEach(s => {
      if (s.classId) map[s.classId] = s.className;
    });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [students]);

  // Filter students by search and class
  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = !searchQuery || s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = filterClass === 'all' || s.classId === filterClass;
      return matchesSearch && matchesClass;
    });
  }, [students, searchQuery, filterClass]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Students</h1>
        <p className="text-sm text-muted-foreground mt-1">Students enrolled in your assigned classes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Students Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Users className="w-12 h-12 opacity-30" />
          <p>{students.length === 0 ? 'No students assigned to your classes' : 'No students match your search'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(student => (
            <Card key={student.id} className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {student.fullName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{student.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {student.className && <Badge variant="outline" className="text-xs">{student.className}</Badge>}
                  {student.educationLevel && <Badge variant="secondary" className="text-xs">{student.educationLevel}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}