import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, XCircle, Clock, BookOpen, FileText, ChevronDown, ChevronUp, Target, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminApprovals() {
  const { schoolUser: user } = useSchoolAuth();
  const [lessonPlans, setLessonPlans] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [planFilter, setPlanFilter] = useState("pending");
  const [matFilter, setMatFilter] = useState("pending");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    async function load() {
      const [plans, mats] = await Promise.all([
        base44.entities.LessonPlan.filter({ schoolId: user?.schoolId }),
        base44.entities.LessonMaterial.filter({ schoolId: user?.schoolId }),
      ]);
      setLessonPlans((plans || []).sort((a, b) => (b.created_date || "").localeCompare(a.created_date || "")));
      setMaterials((mats || []).sort((a, b) => (b.created_date || "").localeCompare(a.created_date || "")));
      setLoading(false);
    }
    load();
    const unsubscribePlans = base44.entities.LessonPlan.subscribe(() => load());
    const unsubscribeMats = base44.entities.LessonMaterial.subscribe(() => load());
    return () => { unsubscribePlans(); unsubscribeMats(); };
  }, [user?.schoolId]);

  const handleApprove = async (item, type) => {
    const entity = type === 'plan' ? base44.entities.LessonPlan : base44.entities.LessonMaterial;
    await entity.update(item.id, {
      status: 'approved',
      approvedBy: user?.id,
      approvalDate: new Date().toISOString(),
      approvalNotes: "",
    });
    setActionItem(null);
    setActionType(null);
  };

  const handleReject = async (item, type, notes) => {
    const entity = type === 'plan' ? base44.entities.LessonPlan : base44.entities.LessonMaterial;
    await entity.update(item.id, {
      status: 'rejected',
      approvedBy: user?.id,
      approvalDate: new Date().toISOString(),
      approvalNotes: notes || 'Rejected by admin',
      isPublished: false,
    });
    setActionItem(null);
    setActionType(null);
  };

  const itemType = (item) => item?.date ? 'plan' : 'material';

  const statusBadge = (status) => {
    if (status === 'approved') return <Badge className="bg-emerald-100 text-emerald-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
    if (status === 'rejected') return <Badge className="bg-red-100 text-red-700 text-xs"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const filteredPlans = planFilter === 'all' ? lessonPlans : lessonPlans.filter(p => p.status === planFilter);
  const filteredMats = matFilter === 'all' ? materials : materials.filter(m => m.status === matFilter);
  const pendingPlans = lessonPlans.filter(p => p.status === 'pending').length;
  const pendingMats = materials.filter(m => m.status === 'pending').length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const PlanCard = ({ plan }) => {
    const isExpanded = expandedId === plan.id;
    const totalMins = (plan.activities || []).reduce((s, a) => s + (Number(a.durationMinutes) || 0), 0);
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : plan.id)}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-semibold text-sm">{plan.title}</p>
                {statusBadge(plan.status)}
                {plan.isPublished && <Badge className="bg-blue-100 text-blue-700 text-xs">Published</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {plan.teacherName} · {plan.subjectName} · {(plan.classNames?.length ? plan.classNames : [plan.className]).filter(Boolean).join(', ')}
                {plan.date && ` · ${format(new Date(plan.date), 'MMM d, yyyy')}`}
                {totalMins > 0 && ` · ${totalMins} min`}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {plan.status === 'pending' && (
                <>
                  <Button size="sm" onClick={e => { e.stopPropagation(); setActionItem(plan); setActionType('approve'); }}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setActionItem(plan); setActionType('reject'); }}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                </>
              )}
              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
            </div>
          </div>
          {isExpanded && (
            <div className="border-t px-4 pb-4 pt-3 space-y-3">
              {plan.objectives?.filter(o => o).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1"><Target className="w-3 h-3" /> Objectives</p>
                  <ul className="space-y-1">
                    {plan.objectives.filter(o => o).map((o, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />{o}</li>
                    ))}
                  </ul>
                </div>
              )}
              {plan.activities?.filter(a => a.title).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1"><Activity className="w-3 h-3" /> Activities</p>
                  <div className="space-y-1.5">
                    {plan.activities.filter(a => a.title).map((a, i) => (
                      <div key={i} className="flex gap-2 p-2 bg-secondary/40 rounded-md">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                        <div>
                          <span className="text-sm font-medium">{a.title}</span>
                          {a.durationMinutes && <span className="text-xs text-muted-foreground ml-2">{a.durationMinutes} min</span>}
                          {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {plan.homework && (
                <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-md">
                  <p className="text-xs font-semibold text-amber-700 mb-0.5">Homework</p>
                  <p className="text-sm">{plan.homework}</p>
                </div>
              )}
              {plan.pdfFileUrl && (
                <a href={plan.pdfFileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <FileText className="w-3.5 h-3.5" /> View attached PDF
                </a>
              )}
              {plan.approvalNotes && (
                <div className={`p-2.5 rounded-md border text-sm ${plan.status === 'rejected' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
                  <p className="text-xs font-semibold mb-0.5">{plan.status === 'rejected' ? 'Rejection Reason' : 'Approval Notes'}</p>
                  {plan.approvalNotes}
                </div>
              )}
              {plan.status !== 'pending' && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => { setActionItem(plan); setActionType('approve'); }}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {plan.status === 'approved' ? 'Re-approve' : 'Approve'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setActionItem(plan); setActionType('reject'); }}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> {plan.status === 'rejected' ? 'Update Rejection' : 'Reject'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const MatCard = ({ mat }) => (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-base mb-1">{mat.title}</CardTitle>
            <p className="text-xs text-muted-foreground">
              by {mat.teacherName}{mat.subjectName && ` · ${mat.subjectName}`}{mat.topic && ` · ${mat.topic}`}
            </p>
          </div>
          {statusBadge(mat.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {mat.description && <p className="text-sm text-muted-foreground">{mat.description}</p>}
        {mat.fileUrl && <a href={mat.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View File</a>}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => { setActionItem(mat); setActionType('approve'); }}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve</Button>
          <Button size="sm" variant="outline" onClick={() => { setActionItem(mat); setActionType('reject'); }}><XCircle className="w-3.5 h-3.5 mr-1" /> Reject</Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Content Approvals</h1>
        <p className="text-muted-foreground text-sm">Review and approve lesson plans and materials before they become visible to students</p>
      </div>

      <Tabs defaultValue="lessons">
        <TabsList>
          <TabsTrigger value="lessons" className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> Lesson Plans
            {pendingPlans > 0 && <Badge className="ml-1 bg-amber-100 text-amber-700 text-xs">{pendingPlans}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Materials
            {pendingMats > 0 && <Badge className="ml-1 bg-amber-100 text-amber-700 text-xs">{pendingMats}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Lesson Plans Tab */}
        <TabsContent value="lessons" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}</p>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filteredPlans.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No {planFilter !== 'all' ? planFilter : ''} lesson plans found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          )}
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{filteredMats.length} material{filteredMats.length !== 1 ? 's' : ''}</p>
            <Select value={matFilter} onValueChange={setMatFilter}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filteredMats.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No {matFilter !== 'all' ? matFilter : ''} materials found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredMats.map(mat => <MatCard key={mat.id} mat={mat} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <AlertDialog open={actionType === 'approve'} onOpenChange={(open) => !open && setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Content?</AlertDialogTitle>
            <AlertDialogDescription>
              "{actionItem?.title}" will be marked as approved. The teacher can then publish it to students.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleApprove(actionItem, itemType(actionItem))} className="bg-primary">
              Approve
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={actionType === 'reject'} onOpenChange={(open) => { if (!open) { setActionType(null); setRejectNotes(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Content?</AlertDialogTitle>
            <AlertDialogDescription>
              "{actionItem?.title}" will be rejected. Add feedback so the teacher knows what to fix.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)..."
            value={rejectNotes}
            onChange={e => setRejectNotes(e.target.value)}
            rows={3}
            className="mt-2"
          />
          <div className="flex gap-2 mt-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleReject(actionItem, itemType(actionItem), rejectNotes)}
              className="bg-destructive"
            >
              Reject
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}