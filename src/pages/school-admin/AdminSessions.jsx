import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Trash2, Edit2, CalendarRange, ChevronDown, ChevronRight, Star, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const TERM_NAMES = ['1st Term', '2nd Term', '3rd Term', '1st Semester', '2nd Semester', 'Trimester 1', 'Trimester 2', 'Trimester 3', 'Custom'];

function computeSessionStatus(session) {
  const today = new Date().toISOString().split('T')[0];
  if (session.startDate > today) return 'upcoming';
  if (session.endDate < today) return 'completed';
  return 'active';
}

const STATUS_BADGE = {
  active: 'bg-green-100 text-green-800',
  upcoming: 'bg-blue-100 text-blue-800',
  completed: 'bg-slate-100 text-slate-700',
};

export default function AdminSessions() {
  const { schoolUser: user } = useSchoolAuth();
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState(null);

  // Session dialog
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm] = useState({ name: '', academicYear: '', startDate: '', endDate: '' });
  const [savingSession, setSavingSession] = useState(false);

  // Term dialog
  const [showTermDialog, setShowTermDialog] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [parentSessionId, setParentSessionId] = useState(null);
  const [termForm, setTermForm] = useState({ name: '', customName: '', startDate: '', endDate: '', midtermDate: '', isCurrent: false });
  const [savingTerm, setSavingTerm] = useState(false);

  useEffect(() => {
    if (user?.schoolId) loadData();
  }, [user?.schoolId]);

  async function loadData() {
    setLoading(true);
    const [sess, trms] = await Promise.all([
      base44.entities.AcademicSession.filter({ schoolId: user.schoolId }),
      base44.functions.invoke('manageAcademicTerm', { action: 'list', schoolId: user.schoolId }).then(r => r?.data?.terms || []),
    ]);
    setSessions(sess.sort((a, b) => b.academicYear?.localeCompare(a.academicYear)));
    setTerms(trms.sort((a, b) => new Date(a.startDate) - new Date(b.startDate)));
    setLoading(false);
  }

  function getTermsForSession(session) {
    // Link by sessionId if set, else match by academicYear
    return terms.filter(t => t.sessionId === session.id || (!t.sessionId && t.academicYear === session.academicYear));
  }

  // ── Session CRUD ──────────────────────────────────────────────────────────
  function openCreateSession() {
    setEditingSession(null);
    setSessionForm({ name: '', academicYear: '', startDate: '', endDate: '' });
    setShowSessionDialog(true);
  }

  function openEditSession(session) {
    setEditingSession(session);
    setSessionForm({ name: session.name, academicYear: session.academicYear, startDate: session.startDate, endDate: session.endDate });
    setShowSessionDialog(true);
  }

  async function handleSaveSession() {
    const { name, academicYear, startDate, endDate } = sessionForm;
    if (!name || !academicYear || !startDate || !endDate) return toast.error('All fields are required');
    if (startDate >= endDate) return toast.error('Start date must be before end date');

    setSavingSession(true);
    const payload = { schoolId: user.schoolId, schoolName: user.schoolName, ...sessionForm };
    try {
      if (editingSession) {
        await base44.entities.AcademicSession.update(editingSession.id, payload);
        toast.success('Session updated');
      } else {
        const newSession = await base44.entities.AcademicSession.create(payload);
        setExpandedSession(newSession.id);
        toast.success('Session created');
      }
      setShowSessionDialog(false);
      await loadData();
    } catch {
      toast.error('Failed to save session');
    }
    setSavingSession(false);
  }

  async function handleDeleteSession(session) {
    const sessionTerms = getTermsForSession(session);
    if (sessionTerms.length > 0) return toast.error('Remove all terms from this session before deleting it');
    if (!confirm(`Delete session "${session.name}"?`)) return;
    await base44.entities.AcademicSession.delete(session.id);
    toast.success('Session deleted');
    loadData();
  }

  async function handleSetCurrentSession(session) {
    // Unset all, then set this one
    await Promise.all(sessions.map(s => base44.entities.AcademicSession.update(s.id, { isCurrent: s.id === session.id })));
    toast.success(`"${session.name}" is now the current session`);
    loadData();
  }

  // ── Term CRUD ─────────────────────────────────────────────────────────────
  function openCreateTerm(sessionId) {
    setParentSessionId(sessionId);
    setEditingTerm(null);
    setTermForm({ name: '1st Term', customName: '', startDate: '', endDate: '', midtermDate: '', isCurrent: false });
    setShowTermDialog(true);
  }

  function openEditTerm(term) {
    setParentSessionId(term.sessionId || null);
    setEditingTerm(term);
    const isCustom = !TERM_NAMES.slice(0, -1).includes(term.name);
    setTermForm({
      name: isCustom ? 'Custom' : term.name,
      customName: isCustom ? term.name : '',
      startDate: term.startDate,
      endDate: term.endDate,
      midtermDate: term.midtermDate || '',
      isCurrent: term.isCurrent || false,
    });
    setShowTermDialog(true);
  }

  async function handleSaveTerm() {
    const resolvedName = termForm.name === 'Custom' ? termForm.customName.trim() : termForm.name;
    if (!resolvedName || !termForm.startDate || !termForm.endDate) return toast.error('All required fields must be filled');
    if (termForm.startDate >= termForm.endDate) return toast.error('Start date must be before end date');

    const session = sessions.find(s => s.id === parentSessionId);

    setSavingTerm(true);
    try {
      // If marking as current, unset all other terms first
      if (termForm.isCurrent) {
        await Promise.all(terms.filter(t => t.isCurrent && t.id !== editingTerm?.id).map(t =>
          base44.functions.invoke('manageAcademicTerm', { action: 'update', termId: t.id, payload: { isCurrent: false } })
        ));
      }

      const payload = {
        schoolId: user.schoolId,
        schoolName: user.schoolName,
        sessionId: parentSessionId,
        name: resolvedName,
        academicYear: session?.academicYear || '',
        startDate: termForm.startDate,
        endDate: termForm.endDate,
        midtermDate: termForm.midtermDate || null,
        isCurrent: termForm.isCurrent,
      };

      if (editingTerm) {
        await base44.functions.invoke('manageAcademicTerm', { action: 'update', termId: editingTerm.id, payload });
        toast.success('Term updated');
      } else {
        await base44.functions.invoke('manageAcademicTerm', { action: 'create', payload });
        toast.success('Term created');
      }
      setShowTermDialog(false);
      await loadData();
    } catch {
      toast.error('Failed to save term');
    }
    setSavingTerm(false);
  }

  async function handleDeleteTerm(term) {
    if (!confirm(`Delete term "${term.name}"?`)) return;
    await base44.functions.invoke('manageAcademicTerm', { action: 'delete', termId: term.id });
    toast.success('Term deleted');
    loadData();
  }

  async function handleSetCurrentTerm(term) {
    // Unset all terms, set this one
    await Promise.all(terms.map(t =>
      base44.functions.invoke('manageAcademicTerm', { action: 'update', termId: t.id, payload: { isCurrent: t.id === term.id } })
    ));
    toast.success(`"${term.name}" is now the current term`);
    loadData();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Session Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage academic sessions and their terms</p>
        </div>
        <Button onClick={openCreateSession}>
          <Plus className="w-4 h-4 mr-2" /> Create New Session
        </Button>
      </div>

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <CalendarRange className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground font-medium">No sessions created yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first academic session to get started.</p>
            <Button className="mt-4" onClick={openCreateSession}><Plus className="w-4 h-4 mr-2" /> Create Session</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => {
            const status = computeSessionStatus(session);
            const sessionTerms = getTermsForSession(session);
            const isExpanded = expandedSession === session.id;

            return (
              <Card key={session.id} className={`border-0 shadow-sm overflow-hidden ${session.isCurrent ? 'ring-2 ring-primary' : ''}`}>
                {/* Session Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-1.5 rounded-md transition-transform ${isExpanded ? 'rotate-0' : ''}`}>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{session.name}</h3>
                        <Badge className={STATUS_BADGE[status]}>{status}</Badge>
                        {session.isCurrent && <Badge className="bg-primary/10 text-primary">Current Session</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {session.startDate && session.endDate
                          ? `${format(new Date(session.startDate), 'MMM d, yyyy')} → ${format(new Date(session.endDate), 'MMM d, yyyy')}`
                          : ''}
                        {' · '}{sessionTerms.length} term{sessionTerms.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                    {!session.isCurrent && (
                      <Button size="sm" variant="outline" onClick={() => handleSetCurrentSession(session)} title="Set as current session">
                        <Star className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openEditSession(session)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteSession(session)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Terms (expanded) */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 px-4 pb-4 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Terms</h4>
                      <Button size="sm" variant="outline" onClick={() => openCreateTerm(session.id)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Term
                      </Button>
                    </div>

                    {sessionTerms.length === 0 ? (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        No terms yet. Add the first term for this session.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sessionTerms.map(term => {
                          const tActive = term.startDate <= today && term.endDate >= today;
                          const tFuture = term.startDate > today;
                          return (
                            <div key={term.id} className={`flex items-center justify-between bg-card rounded-lg p-3 border ${term.isCurrent ? 'border-primary' : 'border-border'}`}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{term.name}</span>
                                  {term.isCurrent && <Badge className="bg-primary/10 text-primary text-xs">Current Term</Badge>}
                                  {!term.isCurrent && tActive && <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>}
                                  {tFuture && !term.isCurrent && <Badge variant="outline" className="text-xs">Upcoming</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {term.startDate && term.endDate
                                    ? `${format(new Date(term.startDate), 'MMM d, yyyy')} → ${format(new Date(term.endDate), 'MMM d, yyyy')}`
                                    : ''}
                                  {term.midtermDate ? ` · Midterm: ${format(new Date(term.midtermDate), 'MMM d, yyyy')}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                {!term.isCurrent && (
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleSetCurrentTerm(term)} title="Set as current term">
                                    <Star className="w-3 h-3 mr-1" /> Set Current
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditTerm(term)}>
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDeleteTerm(term)}>
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Session Dialog ── */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSession ? 'Edit Session' : 'Create New Session'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Session Name *</Label>
              <Input
                placeholder="e.g., 2025/2026 Academic Session"
                value={sessionForm.name}
                onChange={e => setSessionForm({ ...sessionForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm">Academic Year *</Label>
              <Input
                placeholder="e.g., 2025-2026"
                value={sessionForm.academicYear}
                onChange={e => setSessionForm({ ...sessionForm, academicYear: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Start Date *</Label>
                <Input type="date" value={sessionForm.startDate} onChange={e => setSessionForm({ ...sessionForm, startDate: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm">End Date *</Label>
                <Input type="date" value={sessionForm.endDate} onChange={e => setSessionForm({ ...sessionForm, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSessionDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSession} disabled={savingSession}>
              {savingSession && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingSession ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Term Dialog ── */}
      <Dialog open={showTermDialog} onOpenChange={setShowTermDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTerm ? 'Edit Term' : 'Add Term'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Term Name *</Label>
              <Select value={termForm.name} onValueChange={v => setTermForm({ ...termForm, name: v, customName: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TERM_NAMES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {termForm.name === 'Custom' && (
              <div>
                <Label className="text-sm">Custom Name *</Label>
                <Input placeholder="e.g., Revision Week" value={termForm.customName} onChange={e => setTermForm({ ...termForm, customName: e.target.value })} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Start Date *</Label>
                <Input type="date" value={termForm.startDate} onChange={e => setTermForm({ ...termForm, startDate: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm">End Date *</Label>
                <Input type="date" value={termForm.endDate} onChange={e => setTermForm({ ...termForm, endDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-sm">Midterm Date (optional)</Label>
              <Input type="date" value={termForm.midtermDate} onChange={e => setTermForm({ ...termForm, midtermDate: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <input
                type="checkbox"
                id="isCurrent"
                checked={termForm.isCurrent}
                onChange={e => setTermForm({ ...termForm, isCurrent: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="isCurrent" className="text-sm font-medium cursor-pointer select-none">
                Mark as Current Term <span className="text-muted-foreground font-normal">(used across the entire system)</span>
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowTermDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTerm} disabled={savingTerm}>
              {savingTerm && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingTerm ? 'Update' : 'Add Term'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}