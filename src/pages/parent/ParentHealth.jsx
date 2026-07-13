import React, { useState, useEffect, useCallback } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Heart, Stethoscope, AlertTriangle, Syringe, Accessibility, Activity } from 'lucide-react';

const severityColor = {
  minor: 'bg-blue-100 text-blue-700',
  moderate: 'bg-amber-100 text-amber-700',
  severe: 'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-800',
};
const visitReasonLabel = {
  illness: 'Illness', injury: 'Injury', routine_checkup: 'Routine Checkup',
  medication_administration: 'Medication', allergy_reaction: 'Allergy Reaction',
  mental_health: 'Mental Health', dental: 'Dental', other: 'Other',
};
const vacStatusColor = {
  completed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  exempted: 'bg-slate-100 text-slate-700',
};

export default function ParentHealth() {
  const { schoolUser: user } = useSchoolAuth();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [records, setRecords] = useState([]);
  const [visits, setVisits] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [specialNeeds, setSpecialNeeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.schoolId) { setLoading(false); return; }
    async function loadChildren() {
      try {
        const allStudents = await base44.entities.SchoolUser.filter({
          schoolId: user.schoolId, role: 'student', isArchived: false,
        });
        const linkedIds = user.linkedStudentIds || [];
        const myChildren = (allStudents || []).filter(s => linkedIds.includes(s.id));
        setChildren(myChildren);
        if (myChildren.length > 0) setSelectedChildId(myChildren[0].id);
      } catch (e) {
        console.error('Failed to load children:', e);
      }
      setLoading(false);
    }
    loadChildren();
  }, [user?.id, user?.linkedStudentIds, user?.schoolId]);

  const loadHealthData = useCallback(async (childId) => {
    if (!childId) return;
    try {
      const [r, v, i, vac, sn] = await Promise.all([
        base44.entities.StudentMedicalRecord.filter({ studentId: childId }),
        base44.entities.NurseVisitLog.filter({ studentId: childId }),
        base44.entities.MedicalIncident.filter({ studentId: childId }),
        base44.entities.VaccinationRecord.filter({ studentId: childId }),
        base44.entities.SpecialNeeds.filter({ studentId: childId }),
      ]);
      setRecords(r || []);
      setVisits(v || []);
      setIncidents(i || []);
      setVaccinations(vac || []);
      setSpecialNeeds(sn || []);
    } catch (e) {
      console.error('Failed to load health data:', e);
    }
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    loadHealthData(selectedChildId);
    const subs = [
      base44.entities.StudentMedicalRecord.subscribe(() => loadHealthData(selectedChildId)),
      base44.entities.NurseVisitLog.subscribe(() => loadHealthData(selectedChildId)),
      base44.entities.MedicalIncident.subscribe(() => loadHealthData(selectedChildId)),
      base44.entities.VaccinationRecord.subscribe(() => loadHealthData(selectedChildId)),
      base44.entities.SpecialNeeds.subscribe(() => loadHealthData(selectedChildId)),
    ];
    return () => subs.forEach(u => u && u());
  }, [selectedChildId, loadHealthData]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Heart className="w-6 h-6 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold">Health & Medical</h1>
          <p className="text-sm text-muted-foreground">Real-time updates on your child's health records</p>
        </div>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Heart className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No children linked to your account yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {children.length > 1 && (
            <div className="max-w-xs">
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {children.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Tabs defaultValue="records" className="w-full">
            <TabsList className="flex-wrap">
              <TabsTrigger value="records"><Heart className="w-4 h-4 mr-2" /> Medical Records ({records.length})</TabsTrigger>
              <TabsTrigger value="visits"><Stethoscope className="w-4 h-4 mr-2" /> Nurse Visits ({visits.length})</TabsTrigger>
              <TabsTrigger value="incidents"><AlertTriangle className="w-4 h-4 mr-2" /> Incidents ({incidents.length})</TabsTrigger>
              <TabsTrigger value="vaccinations"><Syringe className="w-4 h-4 mr-2" /> Vaccinations ({vaccinations.length})</TabsTrigger>
              <TabsTrigger value="special-needs"><Accessibility className="w-4 h-4 mr-2" /> Special Needs ({specialNeeds.length})</TabsTrigger>
            </TabsList>

            {/* Medical Records */}
            <TabsContent value="records" className="space-y-3">
              {records.length === 0 ? (
                <EmptyState icon={Heart} text="No medical records on file" />
              ) : (
                records.map(r => (
                  <Card key={r.id} className="border-0 shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {r.bloodGroup && r.bloodGroup !== 'unknown' && <Badge variant="outline">Blood: {r.bloodGroup}</Badge>}
                        {r.genotype && r.genotype !== 'unknown' && <Badge variant="outline">Genotype: {r.genotype}</Badge>}
                        {r.medicalClearanceStatus && (
                          <Badge className={
                            r.medicalClearanceStatus === 'cleared' ? 'bg-emerald-100 text-emerald-700' :
                            r.medicalClearanceStatus === 'restricted' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }>{r.medicalClearanceStatus.replace(/_/g, ' ')}</Badge>
                        )}
                      </div>
                      {r.allergies?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Allergies</p>
                          <div className="flex flex-wrap gap-1">{r.allergies.map((a, i) => <Badge key={i} className="bg-red-50 text-red-700">{a}</Badge>)}</div>
                        </div>
                      )}
                      {r.dietaryRestrictions?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Dietary Restrictions</p>
                          <div className="flex flex-wrap gap-1">{r.dietaryRestrictions.map((d, i) => <Badge key={i} className="bg-amber-50 text-amber-700">{d}</Badge>)}</div>
                        </div>
                      )}
                      {r.currentMedications?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Current Medications</p>
                          <div className="space-y-1">{r.currentMedications.map((m, i) => (
                            <p key={i} className="text-sm">{m.name} — {m.dosage}, {m.frequency}</p>
                          ))}</div>
                        </div>
                      )}
                      {r.notes && <p className="text-sm text-muted-foreground">{r.notes}</p>}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Nurse Visits */}
            <TabsContent value="visits" className="space-y-3">
              {visits.length === 0 ? (
                <EmptyState icon={Stethoscope} text="No nurse visits recorded" />
              ) : (
                visits.map(v => (
                  <Card key={v.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{visitReasonLabel[v.reason] || v.reason}</p>
                          <p className="text-xs text-muted-foreground">{v.visitDate}{v.visitTime ? ` at ${v.visitTime}` : ''}</p>
                        </div>
                        {v.parentNotified && <Badge className="bg-blue-100 text-blue-700">Parent notified</Badge>}
                      </div>
                      {v.description && <p className="text-sm mt-2">{v.description}</p>}
                      {v.diagnosis && <p className="text-sm text-muted-foreground mt-1"><span className="font-medium">Diagnosis:</span> {v.diagnosis}</p>}
                      {v.treatment && <p className="text-sm text-muted-foreground mt-1"><span className="font-medium">Treatment:</span> {v.treatment}</p>}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Incidents */}
            <TabsContent value="incidents" className="space-y-3">
              {incidents.length === 0 ? (
                <EmptyState icon={AlertTriangle} text="No incidents reported" />
              ) : (
                incidents.map(inc => (
                  <Card key={inc.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm capitalize">{inc.incidentType?.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">{inc.incidentDate}{inc.incidentTime ? ` at ${inc.incidentTime}` : ''}{inc.location ? ` — ${inc.location}` : ''}</p>
                        </div>
                        {inc.severity && <Badge className={severityColor[inc.severity]}>{inc.severity}</Badge>}
                      </div>
                      {inc.description && <p className="text-sm mt-2">{inc.description}</p>}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Vaccinations */}
            <TabsContent value="vaccinations" className="space-y-3">
              {vaccinations.length === 0 ? (
                <EmptyState icon={Syringe} text="No vaccination records" />
              ) : (
                vaccinations.map(vac => (
                  <Card key={vac.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{vac.vaccineName}</p>
                          <p className="text-xs text-muted-foreground">Dose {vac.doseNumber} — {vac.administrationDate}</p>
                          {vac.nextDueDate && <p className="text-xs text-amber-600 mt-1">Next due: {vac.nextDueDate}</p>}
                        </div>
                        <Badge className={vacStatusColor[vac.status] || 'bg-slate-100 text-slate-700'}>{vac.status}</Badge>
                      </div>
                      {vac.notes && <p className="text-sm text-muted-foreground mt-2">{vac.notes}</p>}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Special Needs */}
            <TabsContent value="special-needs" className="space-y-3">
              {specialNeeds.length === 0 ? (
                <EmptyState icon={Accessibility} text="No special needs records" />
              ) : (
                specialNeeds.map(sn => (
                  <Card key={sn.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <p className="font-semibold text-sm capitalize">{sn.needType?.replace(/_/g, ' ')}</p>
                      {sn.description && <p className="text-sm text-muted-foreground mt-1">{sn.description}</p>}
                      {sn.accommodations?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Accommodations</p>
                          <div className="flex flex-wrap gap-1">{sn.accommodations.map((a, i) => <Badge key={i} variant="outline">{a}</Badge>)}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}