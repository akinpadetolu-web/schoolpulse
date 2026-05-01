import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Trash2, TrendingUp, CheckCircle2, AlertCircle, Clock, Play, Download } from 'lucide-react';
import { toast } from 'sonner';
import { getTerms } from '@/lib/academicTermUtils';

function getLetterGrade(score, gradingSystem) {
  if (!gradingSystem?.grades) {
    if (score >= 75) return 'A1';
    if (score >= 70) return 'B2';
    if (score >= 65) return 'B3';
    if (score >= 60) return 'C4';
    if (score >= 55) return 'C5';
    if (score >= 50) return 'C6';
    if (score >= 45) return 'D7';
    if (score >= 40) return 'E8';
    return 'F9';
  }
  const band = gradingSystem.grades.find(g => score >= g.minScore && score <= g.maxScore);
  return band ? band.letter : 'F9';
}

function isPassing(score, gradingSystem) {
  const passMark = gradingSystem?.passMark ?? 40;
  return score >= passMark;
}

export default function AdminPromotion() {
  const { schoolUser: user } = useSchoolAuth();
  const [rules, setRules] = useState([]);
  const [results, setResults] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [terms, setTerms] = useState([]);
  const [gradingSystems, setGradingSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRule, setShowRule] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runForm, setRunForm] = useState({ classId: '', termId: '' });
  const [showRun, setShowRun] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    fromClassId: '', toClassId: '', repeatClassId: '',
    minOverallAverage: 40, minSubjectsPassed: 5,
    compulsorySubjectIds: [], academicYear: '2024-2025',
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [r, res, cls, subj, stud, grd, termData, gs] = await Promise.all([
      base44.entities.PromotionRule.filter({ schoolId: user?.schoolId }),
      base44.entities.PromotionResult.filter({ schoolId: user?.schoolId }),
      base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
      base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
      base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student', isArchived: false }),
      base44.entities.Grade.filter({ schoolId: user?.schoolId }),
      getTerms(user?.schoolId),
      base44.entities.GradingSystem.filter({ schoolId: user?.schoolId }),
    ]);
    setRules(r || []);
    setResults(res || []);
    setClasses(cls || []);
    setSubjects(subj || []);
    setStudents(stud || []);
    setGrades(grd || []);
    setTerms(termData || []);
    setGradingSystems(gs || []);
    setLoading(false);
  }

  async function handleSaveRule(e) {
    e.preventDefault();
    if (!ruleForm.fromClassId) return toast.error('Source class is required');
    setSaving(true);
    const fromClass = classes.find(c => c.id === ruleForm.fromClassId);
    const toClass = classes.find(c => c.id === ruleForm.toClassId);
    const repeatClass = classes.find(c => c.id === ruleForm.repeatClassId);
    const compulsorySubjectNames = subjects.filter(s => ruleForm.compulsorySubjectIds.includes(s.id)).map(s => s.name);

    const payload = {
      schoolId: user.schoolId,
      schoolName: user.schoolName,
      fromClassId: ruleForm.fromClassId,
      fromClassName: fromClass?.className || '',
      toClassId: ruleForm.toClassId,
      toClassName: toClass?.className || '',
      repeatClassId: ruleForm.repeatClassId || ruleForm.fromClassId,
      repeatClassName: repeatClass?.className || fromClass?.className || '',
      minOverallAverage: parseFloat(ruleForm.minOverallAverage) || 40,
      minSubjectsPassed: parseInt(ruleForm.minSubjectsPassed) || 5,
      compulsorySubjectIds: ruleForm.compulsorySubjectIds,
      compulsorySubjectNames,
      academicYear: ruleForm.academicYear,
    };

    if (editingRule) {
      await base44.entities.PromotionRule.update(editingRule.id, payload);
      toast.success('Rule updated');
    } else {
      await base44.entities.PromotionRule.create(payload);
      toast.success('Promotion rule created');
    }
    setSaving(false);
    setShowRule(false);
    setEditingRule(null);
    loadData();
  }

  async function runPromotion() {
    if (!runForm.classId || !runForm.termId) return toast.error('Select class and term');
    setRunning(true);
    try {
      const rule = rules.find(r => r.fromClassId === runForm.classId);
      const term = terms.find(t => t.id === runForm.termId);
      const gradingSystem = gradingSystems.find(g => g.isDefault) || gradingSystems[0];
      const classStudents = students.filter(s => s.classId === runForm.classId);
      const termStart = new Date(term.startDate);
      const termEnd = new Date(term.endDate);

      const created = [];

      for (const student of classStudents) {
        const studentGrades = grades.filter(g => {
          const d = new Date(g.created_date);
          return g.studentId === student.id && d >= termStart && d <= termEnd;
        });

        const subjectMap = {};
        studentGrades.forEach(g => {
          if (!subjectMap[g.subjectId]) subjectMap[g.subjectId] = [];
          subjectMap[g.subjectId].push((g.score / (g.maxScore || 100)) * 100);
        });

        const subjectBreakdown = Object.entries(subjectMap).map(([subjectId, scores]) => {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          const subj = subjects.find(s => s.id === subjectId);
          const passed = isPassing(avg, gradingSystem);
          return { subjectId, subjectName: subj?.name || 'Unknown', average: Math.round(avg), letterGrade: getLetterGrade(avg, gradingSystem), passed };
        });

        const totalSubjects = subjectBreakdown.length;
        const subjectsPassed = subjectBreakdown.filter(s => s.passed).length;
        const subjectsFailed = totalSubjects - subjectsPassed;
        const overallAverage = totalSubjects > 0
          ? Math.round(subjectBreakdown.reduce((sum, s) => sum + s.average, 0) / totalSubjects)
          : 0;

        let compulsorySubjectsPassed = true;
        if (rule?.compulsorySubjectIds?.length > 0) {
          compulsorySubjectsPassed = rule.compulsorySubjectIds.every(sId => {
            const s = subjectBreakdown.find(sb => sb.subjectId === sId);
            return s?.passed;
          });
        }

        const minAvg = rule?.minOverallAverage ?? 40;
        const minPass = rule?.minSubjectsPassed ?? 5;

        let recommendation = 'promote';
        if (overallAverage < minAvg || subjectsPassed < minPass || !compulsorySubjectsPassed) {
          const borderline = overallAverage >= (minAvg - 5) && subjectsPassed >= (minPass - 1);
          recommendation = borderline ? 'review' : 'repeat';
        }

        const currentClass = classes.find(c => c.id === runForm.classId);
        let recommendedClassId = rule?.toClassId || '';
        let recommendedClassName = rule?.toClassName || '';
        if (recommendation === 'repeat') {
          recommendedClassId = rule?.repeatClassId || runForm.classId;
          recommendedClassName = rule?.repeatClassName || currentClass?.className || '';
        }

        const result = {
          schoolId: user.schoolId,
          studentId: student.id,
          studentName: student.fullName,
          currentClassId: runForm.classId,
          currentClassName: currentClass?.className || '',
          termId: runForm.termId,
          termName: term.name,
          academicYear: rule?.academicYear || '',
          overallAverage,
          subjectsPassed,
          subjectsFailed,
          totalSubjects,
          compulsorySubjectsPassed,
          recommendation,
          recommendedClassId,
          recommendedClassName,
          adminDecision: 'pending',
          subjectBreakdown,
          generatedAt: new Date().toISOString(),
          generatedBy: user.fullName,
        };
        created.push(base44.entities.PromotionResult.create(result));
      }

      await Promise.all(created);
      toast.success(`Promotion evaluated for ${classStudents.length} student(s)`);
      setShowRun(false);
      loadData();
    } catch (err) {
      toast.error('Failed to run promotion evaluation');
    }
    setRunning(false);
  }

  async function applyDecision(result, decision) {
    await base44.entities.PromotionResult.update(result.id, { adminDecision: decision });
    toast.success(`Decision: ${decision}`);
    loadData();
  }

  const recBadge = { promote: 'bg-emerald-100 text-emerald-700', repeat: 'bg-red-100 text-red-700', review: 'bg-amber-100 text-amber-700' };
  const recIcon = { promote: CheckCircle2, repeat: AlertCircle, review: Clock };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Promotion & Grade Collation</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Auto-evaluate students and make promotion decisions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowRule(true)}><Plus className="w-4 h-4 mr-2" /> Add Rule</Button>
          <Button onClick={() => setShowRun(true)}><Play className="w-4 h-4 mr-2" /> Run Evaluation</Button>
        </div>
      </div>

      <Tabs defaultValue="results">
        <TabsList className="mb-6">
          <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
          <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
          {results.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 text-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No evaluation results yet</p>
                <p className="text-sm mt-1">Click "Run Evaluation" to auto-evaluate students</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {results.map(r => {
                const Icon = recIcon[r.recommendation] || TrendingUp;
                return (
                  <Card key={r.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{r.studentName}</h3>
                            <Badge className={recBadge[r.recommendation]}>
                              <Icon className="w-3 h-3 mr-1" />
                              {r.recommendation.charAt(0).toUpperCase() + r.recommendation.slice(1)}
                            </Badge>
                            {r.adminDecision !== 'pending' && (
                              <Badge variant="outline">Decision: {r.adminDecision}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {r.currentClassName} • {r.termName} • Avg: {r.overallAverage}% • {r.subjectsPassed}/{r.totalSubjects} passed
                          </p>
                          {r.recommendedClassName && (
                            <p className="text-xs text-muted-foreground">→ {r.recommendation === 'promote' ? 'Promote to' : 'Repeat'}: {r.recommendedClassName}</p>
                          )}
                        </div>
                        {r.adminDecision === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => applyDecision(r, 'promote')}>Promote</Button>
                            <Button size="sm" variant="destructive" onClick={() => applyDecision(r, 'repeat')}>Repeat</Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules">
          {rules.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No promotion rules set up yet.</p>
                <Button className="mt-4" onClick={() => setShowRule(true)}><Plus className="w-4 h-4 mr-2" />Add Rule</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <Card key={rule.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{rule.fromClassName} → {rule.toClassName || 'Not set'}</p>
                        <p className="text-sm text-muted-foreground">
                          Min avg: {rule.minOverallAverage}% • Min pass: {rule.minSubjectsPassed} subjects
                          {rule.compulsorySubjectNames?.length > 0 && ` • Must pass: ${rule.compulsorySubjectNames.join(', ')}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingRule(rule);
                          setRuleForm({
                            fromClassId: rule.fromClassId, toClassId: rule.toClassId, repeatClassId: rule.repeatClassId,
                            minOverallAverage: rule.minOverallAverage, minSubjectsPassed: rule.minSubjectsPassed,
                            compulsorySubjectIds: rule.compulsorySubjectIds || [], academicYear: rule.academicYear,
                          });
                          setShowRule(true);
                        }}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={async () => {
                          await base44.entities.PromotionRule.delete(rule.id);
                          toast.success('Rule deleted');
                          loadData();
                        }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Run Evaluation Dialog */}
      <Dialog open={showRun} onOpenChange={setShowRun}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Run Promotion Evaluation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Class *</Label>
              <Select value={runForm.classId} onValueChange={v => setRunForm({ ...runForm, classId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Academic Term *</Label>
              <Select value={runForm.termId} onValueChange={v => setRunForm({ ...runForm, termId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose term" /></SelectTrigger>
                <SelectContent>{terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.academicYear})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">This will auto-evaluate all students in the selected class based on their grades and promotion rules.</p>
            <Button className="w-full" onClick={runPromotion} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Run Evaluation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={showRule} onOpenChange={v => { setShowRule(v); if (!v) setEditingRule(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingRule ? 'Edit' : 'Add'} Promotion Rule</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveRule} className="space-y-4">
            <div>
              <Label>From Class (current) *</Label>
              <Select value={ruleForm.fromClassId} onValueChange={v => setRuleForm({ ...ruleForm, fromClassId: v })}>
                <SelectTrigger><SelectValue placeholder="Current class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Promote To (on pass)</Label>
              <Select value={ruleForm.toClassId} onValueChange={v => setRuleForm({ ...ruleForm, toClassId: v })}>
                <SelectTrigger><SelectValue placeholder="Next class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Repeat Class (on fail)</Label>
              <Select value={ruleForm.repeatClassId} onValueChange={v => setRuleForm({ ...ruleForm, repeatClassId: v })}>
                <SelectTrigger><SelectValue placeholder="Same or lower class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Overall Average (%)</Label>
                <Input type="number" min="0" max="100" value={ruleForm.minOverallAverage} onChange={e => setRuleForm({ ...ruleForm, minOverallAverage: e.target.value })} />
              </div>
              <div>
                <Label>Min Subjects Passed</Label>
                <Input type="number" min="1" value={ruleForm.minSubjectsPassed} onChange={e => setRuleForm({ ...ruleForm, minSubjectsPassed: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Academic Year</Label>
              <Input value={ruleForm.academicYear} onChange={e => setRuleForm({ ...ruleForm, academicYear: e.target.value })} placeholder="e.g. 2024-2025" />
            </div>
            <div>
              <Label className="mb-2 block">Compulsory Subjects (must pass)</Label>
              <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto border rounded-lg p-2">
                {subjects.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const ids = ruleForm.compulsorySubjectIds.includes(s.id)
                        ? ruleForm.compulsorySubjectIds.filter(id => id !== s.id)
                        : [...ruleForm.compulsorySubjectIds, s.id];
                      setRuleForm({ ...ruleForm, compulsorySubjectIds: ids });
                    }}
                    className={`text-left px-2 py-1 rounded text-xs transition-colors ${ruleForm.compulsorySubjectIds.includes(s.id) ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}