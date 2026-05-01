import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronLeft, ChevronRight, Plus, Loader2, CalendarDays,
  Sun, BookOpen, Users, Star, Circle, Pencil, Trash2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths, subMonths, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';

const EVENT_TYPES = [
  { value: 'holiday', label: 'Holiday', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', icon: Sun },
  { value: 'exam', label: 'Exam', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: BookOpen },
  { value: 'parent_teacher_meeting', label: 'Parent-Teacher Meeting', color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500', icon: Users },
  { value: 'school_event', label: 'School Event', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', icon: Star },
  { value: 'other', label: 'Other', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500', icon: Circle },
];

const ROLES = ['admin', 'teacher', 'student', 'parent'];

function getTypeInfo(type) {
  return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[4];
}

export default function SchoolCalendar() {
  const { schoolUser: user } = useSchoolAuth();
  const isAdmin = user?.role === 'admin';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterClass, setFilterClass] = useState('all');

  const [form, setForm] = useState({
    title: '', description: '', type: 'school_event',
    startDate: '', endDate: '',
    targetRoles: ['admin', 'teacher', 'student', 'parent'],
    targetClassIds: [], targetClassNames: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const evs = await base44.entities.SchoolEvent.filter({ schoolId: user.schoolId });
      setEvents(evs || []);

      await new Promise(resolve => setTimeout(resolve, 150));

      const cls = await base44.entities.SchoolClass.filter({ schoolId: user.schoolId, isArchived: false });
      setClasses(cls || []);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    }
    setLoading(false);
  }

  // Filter events visible to current user
  const visibleEvents = useMemo(() => {
    return events.filter(ev => {
      // role filter
      if (ev.targetRoles?.length && !ev.targetRoles.includes(user.role)) return false;
      // class filter for students/teachers
      if (ev.targetClassIds?.length) {
        if (user.role === 'student' && !ev.targetClassIds.includes(user.classId)) return false;
        if (user.role === 'teacher' && !(user.assignedClasses || []).some(c => ev.targetClassIds.includes(c))) return false;
        if (user.role === 'parent') {
          // parent sees event if any linked child's class matches
          // We just show all class-specific events to parents; they can filter
        }
      }
      // UI filters
      if (filterType !== 'all' && ev.type !== filterType) return false;
      if (filterClass !== 'all' && ev.targetClassIds?.length && !ev.targetClassIds.includes(filterClass)) return false;
      return true;
    });
  }, [events, user, filterType, filterClass]);

  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }), [currentMonth]);

  function eventsOnDay(day) {
    return visibleEvents.filter(ev => {
      const start = parseISO(ev.startDate);
      const end = ev.endDate ? parseISO(ev.endDate) : start;
      return isWithinInterval(day, { start, end });
    });
  }

  function openCreate(day) {
    if (!isAdmin) return;
    const dateStr = format(day, 'yyyy-MM-dd');
    setForm({ title: '', description: '', type: 'school_event', startDate: dateStr, endDate: dateStr, targetRoles: ['admin','teacher','student','parent'], targetClassIds: [], targetClassNames: [] });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(ev) {
    setForm({
      title: ev.title, description: ev.description || '',
      type: ev.type, startDate: ev.startDate, endDate: ev.endDate || ev.startDate,
      targetRoles: ev.targetRoles || ['admin','teacher','student','parent'],
      targetClassIds: ev.targetClassIds || [],
      targetClassNames: ev.targetClassNames || [],
    });
    setEditing(ev);
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      schoolId: user.schoolId,
      schoolName: user.schoolName,
      createdBy: user.id,
      createdByName: user.fullName,
    };
    if (editing) {
      await base44.entities.SchoolEvent.update(editing.id, payload);
      toast.success('Event updated');
    } else {
      await base44.entities.SchoolEvent.create(payload);
      toast.success('Event created');
    }
    setShowForm(false);
    load();
    setSaving(false);
  }

  async function handleDelete(ev) {
    await base44.entities.SchoolEvent.delete(ev.id);
    toast.success('Event deleted');
    setSelectedDay(null);
    load();
  }

  function toggleClass(cls) {
    const ids = form.targetClassIds;
    const names = form.targetClassNames;
    if (ids.includes(cls.id)) {
      setForm(f => ({ ...f, targetClassIds: ids.filter(id => id !== cls.id), targetClassNames: names.filter(n => n !== cls.className) }));
    } else {
      setForm(f => ({ ...f, targetClassIds: [...ids, cls.id], targetClassNames: [...names, cls.className] }));
    }
  }

  function toggleRole(role) {
    const roles = form.targetRoles;
    if (roles.includes(role)) setForm(f => ({ ...f, targetRoles: roles.filter(r => r !== role) }));
    else setForm(f => ({ ...f, targetRoles: [...roles, role] }));
  }

  const selectedDayEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  // Start day of week offset (0=Sun)
  const firstDayOffset = startOfMonth(currentMonth).getDay();

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">School Calendar</h1>
          <p className="text-muted-foreground text-sm">Important dates, events & holidays</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setForm({ title:'', description:'', type:'school_event', startDate: format(new Date(),'yyyy-MM-dd'), endDate: format(new Date(),'yyyy-MM-dd'), targetRoles:['admin','teacher','student','parent'], targetClassIds:[], targetClassNames:[] }); setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Event
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {(isAdmin || user.role === 'teacher') && (
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {/* Legend */}
        <div className="flex flex-wrap gap-2 ml-auto">
          {EVENT_TYPES.map(t => (
            <span key={t.value} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className={`w-2.5 h-2.5 rounded-full ${t.dot}`} />{t.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar Grid */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardContent className="p-4">
            {/* Month Nav */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronLeft className="w-4 h-4" /></Button>
              <h2 className="text-base font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><ChevronRight className="w-4 h-4" /></Button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 mb-1">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-background min-h-[60px]" />
              ))}
              {days.map(day => {
                const dayEvents = eventsOnDay(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`bg-card min-h-[60px] p-1.5 cursor-pointer hover:bg-accent/50 transition-colors ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}`}
                  >
                    <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(ev => {
                        const t = getTypeInfo(ev.type);
                        return (
                          <div key={ev.id} className={`text-[10px] px-1 py-0.5 rounded truncate border ${t.color}`}>
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 2} more</div>}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={e => { e.stopPropagation(); openCreate(day); }}
                        className="hidden group-hover:flex absolute bottom-1 right-1 text-muted-foreground/40 hover:text-primary"
                      ><Plus className="w-3 h-3" /></button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Side panel: selected day or upcoming */}
        <div className="space-y-4">
          {selectedDay ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{format(selectedDay, 'EEEE, MMM d')}</h3>
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => openCreate(selectedDay)}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  )}
                </div>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events on this day.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayEvents.map(ev => {
                      const t = getTypeInfo(ev.type);
                      const Icon = t.icon;
                      return (
                        <div key={ev.id} className={`rounded-lg p-3 border ${t.color}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 shrink-0" />
                              <p className="font-medium text-sm">{ev.title}</p>
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => openEdit(ev)} className="p-0.5 hover:opacity-70"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDelete(ev)} className="p-0.5 hover:opacity-70"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                          </div>
                          {ev.description && <p className="text-xs mt-1 opacity-80">{ev.description}</p>}
                          {ev.endDate && ev.endDate !== ev.startDate && (
                            <p className="text-xs mt-1 opacity-70">Until {format(parseISO(ev.endDate), 'MMM d')}</p>
                          )}
                          {ev.targetClassNames?.length > 0 && (
                            <p className="text-xs mt-1 opacity-70">Classes: {ev.targetClassNames.join(', ')}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Upcoming events */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /> Upcoming Events</h3>
              {(() => {
                const today = new Date();
                const upcoming = visibleEvents
                  .filter(ev => parseISO(ev.startDate) >= today)
                  .sort((a, b) => parseISO(a.startDate) - parseISO(b.startDate))
                  .slice(0, 8);
                if (!upcoming.length) return <p className="text-sm text-muted-foreground">No upcoming events.</p>;
                return (
                  <div className="space-y-2">
                    {upcoming.map(ev => {
                      const t = getTypeInfo(ev.type);
                      return (
                        <div key={ev.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${t.dot}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{ev.title}</p>
                            <p className="text-xs text-muted-foreground">{format(parseISO(ev.startDate), 'EEE, MMM d')}{ev.endDate && ev.endDate !== ev.startDate ? ` – ${format(parseISO(ev.endDate), 'MMM d')}` : ''}</p>
                          </div>
                          <Badge variant="outline" className={`text-xs shrink-0 ${t.color} border`}>{t.label}</Badge>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      {isAdmin && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Event' : 'New Event'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details..." />
              </div>
              <div className="space-y-1">
                <Label>Event Type *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Start Date *</Label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>End Date</Label>
                  <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} min={form.startDate} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Visible To (Roles)</Label>
                <div className="flex flex-wrap gap-3">
                  {ROLES.map(role => (
                    <label key={role} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={form.targetRoles.includes(role)} onCheckedChange={() => toggleRole(role)} />
                      <span className="capitalize">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Classes <span className="text-muted-foreground font-normal">(leave empty = all classes)</span></Label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto border rounded-md p-2">
                  {classes.map(cls => (
                    <label key={cls.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={form.targetClassIds.includes(cls.id)} onCheckedChange={() => toggleClass(cls)} />
                      <span>{cls.className}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editing ? 'Update' : 'Create'} Event
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}