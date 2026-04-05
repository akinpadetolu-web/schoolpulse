import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherNotifications() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  async function loadData() {
    setLoading(true);
    try {
      // Get teacher's assigned classes from teaching assignments
      const classIds = [...new Set((user?.teachingAssignments || []).map(t => t.classId).filter(Boolean))];
      if (classIds.length > 0) {
        const allClasses = await base44.entities.SchoolClass.filter({ schoolId: user?.schoolId });
        const teacherClasses = (allClasses || []).filter(c => classIds.includes(c.id));
        setClasses(teacherClasses);
        
        // Auto-select first assigned class
        if (teacherClasses.length > 0) {
          setSelectedClass(teacherClasses[0].id);
        }
      } else {
        setClasses([]);
      }

      // Get teacher's assigned subjects from teaching assignments
      const subjectIds = [...new Set((user?.teachingAssignments || []).map(t => t.subjectId).filter(Boolean))];
      if (subjectIds.length > 0) {
        const allSubjects = await base44.entities.Subject.filter({ schoolId: user?.schoolId });
        const teacherSubjects = (allSubjects || []).filter(s => subjectIds.includes(s.id));
        setSubjects(teacherSubjects);
      } else {
        setSubjects([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load classes and subjects');
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents(classId, subjectId) {
    if (!classId || !subjectId) {
      setStudents([]);
      setSelectedStudents([]);
      return;
    }

    try {
      const allStudents = await base44.entities.SchoolUser.filter({
        schoolId: user?.schoolId,
        role: 'student',
        classId,
        isArchived: false
      });
      setStudents(allStudents || []);
      setSelectedStudents([]);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast.error('Failed to load students');
    }
  }

  function handleClassChange(classId) {
    setSelectedClass(classId);
    setSelectedSubject('');
    setSelectedStudents([]);
  }

  function handleSubjectChange(subjectId) {
    setSelectedSubject(subjectId);
    loadStudents(selectedClass, subjectId);
  }

  function toggleStudentSelection(studentId) {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  }

  function selectAllStudents() {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  }

  async function handleSendNotification(e) {
    e.preventDefault();

    if (!selectedClass || !selectedSubject) {
      toast.error('Please select a class and subject');
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a notification title');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a notification message');
      return;
    }

    setSending(true);
    try {
      // Create notification record
      await base44.entities.Notification.create({
        schoolId: user?.schoolId,
        schoolName: user?.schoolName,
        type: 'announcement',
        title: title.trim(),
        message: message.trim(),
        targetRole: 'student',
        targetUserIds: selectedStudents,
        targetClassIds: [selectedClass],
        createdByUser: user?.email
      });

      toast.success(`Notification sent to ${selectedStudents.length} student(s)!`);
      setTitle('');
      setMessage('');
      setSelectedStudents([]);
      setSelectedClass('');
      setSelectedSubject('');
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedClass_ = classes.find(c => c.id === selectedClass);
  const selectedSubject_ = subjects.find(s => s.id === selectedSubject);
  const selectedStudentsList = students.filter(s => selectedStudents.includes(s.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Send Notifications</h1>
        <p className="text-muted-foreground">Send notifications to your students by class and subject</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendNotification} className="space-y-4">
                {/* Class Selection */}
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={selectedClass} onValueChange={handleClassChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {classes.length === 0 && (
                    <p className="text-sm text-destructive">You have no assigned classes</p>
                  )}
                </div>

                {/* Subject Selection */}
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={handleSubjectChange} disabled={!selectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {subjects.length === 0 && selectedClass && (
                    <p className="text-sm text-destructive">You have no assigned subjects</p>
                  )}
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Homework Assignment"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter your notification message..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={5}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    disabled={!title.trim() || !message.trim()}
                  >
                    Preview
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={sending || selectedStudents.length === 0}
                  >
                    {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Send className="w-4 h-4 mr-2" />
                    Send to {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Students Selection Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recipients ({selectedStudents.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {selectedClass && selectedSubject
                    ? 'No students found for this class'
                    : 'Select a class and subject to view students'}
                </p>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={selectAllStudents}
                  >
                    {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                  </Button>

                  <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-3">
                    {students.map(student => (
                      <label key={student.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="w-4 h-4 rounded border-input"
                        />
                        <span className="text-sm flex-1 truncate">{student.fullName}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <Bell className="w-5 h-5 text-primary mt-1 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{message}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Class:</span>
                <span className="font-medium">{selectedClass_?.className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subject:</span>
                <span className="font-medium">{selectedSubject_?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipients:</span>
                <span className="font-medium">{selectedStudents.length} student(s)</span>
              </div>
            </div>
            <Button onClick={() => setShowPreview(false)} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}