import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminApprovals() {
  const { schoolUser: user } = useSchoolAuth();
  const [lessonPlans, setLessonPlans] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  const [rejectNotes, setRejectNotes] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [plans, mats] = await Promise.all([
          base44.entities.LessonPlan.filter({ schoolId: user?.schoolId, status: 'pending' }),
          base44.entities.LessonMaterial.filter({ schoolId: user?.schoolId, status: 'pending' }),
        ]);
        setLessonPlans(plans || []);
        setMaterials(mats || []);
      } catch {
        setLessonPlans([]);
        setMaterials([]);
      }
      setLoading(false);
    }
    load();

    // Subscribe to updates
    const unsubscribePlans = base44.entities.LessonPlan.subscribe(() => load());
    const unsubscribeMats = base44.entities.LessonMaterial.subscribe(() => load());
    return () => {
      unsubscribePlans();
      unsubscribeMats();
    };
  }, [user?.schoolId]);

  const handleApprove = async (item, type) => {
    try {
      const entity = type === 'plan' ? base44.entities.LessonPlan : base44.entities.LessonMaterial;
      await entity.update(item.id, {
        status: 'approved',
        approvedBy: user?.id,
        approvalDate: new Date().toISOString(),
      });
      setActionItem(null);
      setActionType(null);
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const handleReject = async (item, type, notes) => {
    try {
      const entity = type === 'plan' ? base44.entities.LessonPlan : base44.entities.LessonMaterial;
      await entity.update(item.id, {
        status: 'rejected',
        approvedBy: user?.id,
        approvalDate: new Date().toISOString(),
        approvalNotes: notes || 'Rejected by admin',
      });
      setActionItem(null);
      setActionType(null);
    } catch (error) {
      console.error('Rejection failed:', error);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const pendingCount = lessonPlans.length + materials.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Content Approvals</h1>
        <p className="text-muted-foreground">Review and approve lesson plans and materials from teachers</p>
      </div>

      {pendingCount === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>All content has been reviewed. No pending approvals.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="lessons">
          <TabsList>
            <TabsTrigger value="lessons">
              Lesson Plans {lessonPlans.length > 0 && <Badge className="ml-2">{lessonPlans.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="materials">
              Materials {materials.length > 0 && <Badge className="ml-2">{materials.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lessons" className="space-y-4 mt-4">
            {lessonPlans.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>No pending lesson plans.</p>
                </CardContent>
              </Card>
            ) : (
              lessonPlans.map(plan => (
                <Card key={plan.id} className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base mb-1">{plan.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          by {plan.teacherName} • {plan.subjectName} • {plan.className}
                        </p>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {plan.objectives?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Objectives:</p>
                        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 ml-4 list-disc">
                          {plan.objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                        </ul>
                      </div>
                    )}
                    {plan.activities?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Activities: {plan.activities.map(a => a.title).join(', ')}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => { setActionItem(plan); setActionType('approve'); }}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setActionItem(plan); setActionType('reject'); }}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="materials" className="space-y-4 mt-4">
            {materials.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>No pending materials.</p>
                </CardContent>
              </Card>
            ) : (
              materials.map(mat => (
                <Card key={mat.id} className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base mb-1">{mat.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          by {mat.teacherName} {mat.subjectName && `• ${mat.subjectName}`} {mat.topic && `• ${mat.topic}`}
                        </p>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mat.description && (
                      <p className="text-sm text-muted-foreground">{mat.description}</p>
                    )}
                    {mat.fileUrl && (
                      <a href={mat.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        View File
                      </a>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => { setActionItem(mat); setActionType('approve'); }}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setActionItem(mat); setActionType('reject'); }}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Approval Dialog */}
      <AlertDialog open={actionType === 'approve'} onOpenChange={(open) => !open && setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make "{actionItem?.title}" visible to students. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleApprove(actionItem, actionItem?.subjectId && actionItem?.date ? 'plan' : 'material')}
              className="bg-primary"
            >
              Approve
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Dialog */}
      <AlertDialog open={actionType === 'reject'} onOpenChange={(open) => { if (!open) { setActionType(null); setRejectNotes(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject "{actionItem?.title}". Add feedback so the teacher knows what to fix.
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
              onClick={() => handleReject(actionItem, actionItem?.subjectId && actionItem?.date ? 'plan' : 'material', rejectNotes || 'Rejected by admin')}
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