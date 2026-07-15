import React, { useState, useEffect, useCallback } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Heart, Stethoscope, AlertTriangle, Syringe, Accessibility, ChevronDown, Droplet, Dna } from 'lucide-react';

const visitReasonLabel = {
  illness: 'Illness', injury: 'Injury', routine_checkup: 'Routine Checkup',
  medication_administration: 'Medication', allergy_reaction: 'Allergy Reaction',
  mental_health: 'Mental Health', dental: 'Dental', other: 'Other',
};
const severityColor = {
  minor: 'bg-blue-50 text-blue-700',
  moderate: 'bg-amber-50 text-amber-700',
  severe: 'bg-red-50 text-red-700',
  critical: 'bg-red-100 text-red-800',
};
const vacStatusColor = {
  completed: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  overdue: 'bg-red-50 text-red-700',
  exempted: 'bg-slate-50 text-slate-700',
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

  const selectedChild = children.find(c => c.id === selectedChildId);

  const tabItems = [
    { value: 'records', label: 'Medical Records', count: records.length, icon: Heart },
    { value: 'visits', label: 'Nurse Visits', count: visits.length, icon: Stethoscope },
    { value: 'incidents', label: 'Incidents', count: incidents.length, icon: AlertTriangle },
    { value: 'vaccinations', label: 'Vaccinations', count: vaccinations.length, icon: Syringe },
    { value: 'special-needs', label: 'Special Needs', count: specialNeeds.length, icon: Accessibility },
  ];

  return (
    <div className="min-h-full bg-[#F4F6F9] -m-4 p-4 sm:-m-6 sm:p-6 space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[#2D3448]">Health & Medical</h1>
        <p className="text-sm text-[#7E8A9B]">Real-time updates on your child's health records</p>
      </div>

      {children.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center text-[#7E8A9B]">
            <Heart className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No children linked to your account yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Student Selector */}
          {children.length > 1 && (
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="w-full sm:max-w-xs bg-white border-[#E2E8F0] text-[#2D3448] font-medium h-11">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {children.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Tabs defaultValue="records" className="w-full">
            {/* Dark Navy Tab Bar */}
            <TabsList className="bg-[#1B2538] rounded-xl p-1.5 grid grid-cols-5 gap-1 h-auto">
              {tabItems.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex flex-col items-center gap-1 py-2 px-1 text-[10px] sm:text-xs font-medium rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 transition-all"
                >
                  <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="leading-tight text-center">{tab.label}</span>
                  <span className="text-[10px] opacity-70">({tab.count})</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Medical Records */}
            <TabsContent value="records" className="space-y-3 mt-4">
              {records.length === 0 ? (
                <EmptyState icon={Heart} text="No medical records on file" />
              ) : (
                records.map(r => (
                  <Card key={r.id} className="border-0 shadow-sm bg-white rounded-xl">
                    <CardContent className="p-5 space-y-4">
                      {/* Top badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {r.bloodGroup && r.bloodGroup !== 'unknown' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#E2E8F0] text-xs font-medium text-[#2D3448]">
                            <Droplet className="w-3 h-3 text-red-500" /> Blood: {r.bloodGroup}
                          </span>
                        )}
                        {r.genotype && r.genotype !== 'unknown' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#E2E8F0] text-xs font-medium text-[#2D3448]">
                            <Dna className="w-3 h-3 text-blue-500" /> Genotype: {r.genotype}
                          </span>
                        )}
                        {r.medicalClearanceStatus && (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            r.medicalClearanceStatus === 'cleared' ? 'bg-emerald-50 text-emerald-700' :
                            r.medicalClearanceStatus === 'restricted' ? 'bg-red-50 text-red-700' :
                            r.medicalClearanceStatus === 'cleared_with_restrictions' ? 'bg-amber-50 text-amber-700' :
                            'bg-[#FDEFD9] text-amber-700'
                          }`}>
                            {r.medicalClearanceStatus.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>

                      {/* Allergies */}
                      {r.allergies?.length > 0 && (
                        <HealthRow label="Allergies">
                          <div className="flex flex-wrap gap-1.5">
                            {r.allergies.map((a, i) => (
                              <span key={i} className="px-3 py-1 rounded-full bg-[#FCE5E5] text-red-700 text-xs font-medium">{a}</span>
                            ))}
                          </div>
                        </HealthRow>
                      )}

                      {/* Special Needs count */}
                      <HealthRow label="Special Needs" icon={Accessibility}>
                        <span className="text-sm text-[#7E8A9B]">({specialNeeds.length})</span>
                      </HealthRow>

                      {/* Dietary Restrictions */}
                      {r.dietaryRestrictions?.length > 0 && (
                        <HealthRow label="Dietary Restrictions">
                          <div className="flex flex-wrap gap-1.5">
                            {r.dietaryRestrictions.map((d, i) => (
                              <span key={i} className="px-3 py-1 rounded-full bg-[#FBF2E0] text-amber-800 text-xs font-medium">{d}</span>
                            ))}
                          </div>
                        </HealthRow>
                      )}

                      {/* Current Medications */}
                      {r.currentMedications?.length > 0 && (
                        <HealthRow label="Current Medications">
                          <div className="space-y-1">
                            {r.currentMedications.map((m, i) => (
                              <p key={i} className="text-sm text-[#2D3448]">{m.name} — {m.dosage}, {m.frequency}</p>
                            ))}
                          </div>
                        </HealthRow>
                      )}

                      {/* Notes */}
                      {r.notes && <p className="text-sm text-[#7E8A9B] pt-1">{r.notes}</p>}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Nurse Visits */}
            <TabsContent value="visits" className="space-y-3 mt-4">
              {visits.length === 0 ? (
                <EmptyState icon={Stethoscope} text="No nurse visits recorded" />
              ) : (
                visits.map(v => (
                  <Card key={v.id} className="border-0 shadow-sm bg-white rounded-xl">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-[#2D3448]">{visitReasonLabel[v.reason] || v.reason}</p>
                          <p className="text-xs text-[#7E8A9B] mt-0.5">{v.visitDate}{v.visitTime ? ` at ${v.visitTime}` : ''}</p>
                        </div>
                        {v.parentNotified && <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">Parent notified</span>}
                      </div>
                      {v.description && <p className="text-sm text-[#2D3448] mt-3">{v.description}</p>}
                      <div className="mt-3 space-y-1">
                        {v.diagnosis && <p className="text-sm text-[#7E8A9B]"><span className="font-medium text-[#2D3448]">Diagnosis:</span> {v.diagnosis}</p>}
                        {v.treatment && <p className="text-sm text-[#7E8A9B]"><span className="font-medium text-[#2D3448]">Treatment:</span> {v.treatment}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Incidents */}
            <TabsContent value="incidents" className="space-y-3 mt-4">
              {incidents.length === 0 ? (
                <EmptyState icon={AlertTriangle} text="No incidents reported" />
              ) : (
                incidents.map(inc => (
                  <Card key={inc.id} className="border-0 shadow-sm bg-white rounded-xl">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-[#2D3448] capitalize">{inc.incidentType?.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-[#7E8A9B] mt-0.5">{inc.incidentDate}{inc.incidentTime ? ` at ${inc.incidentTime}` : ''}{inc.location ? ` — ${inc.location}` : ''}</p>
                        </div>
                        {inc.severity && <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${severityColor[inc.severity]}`}>{inc.severity}</span>}
                      </div>
                      {inc.description && <p className="text-sm text-[#2D3448] mt-3">{inc.description}</p>}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Vaccinations */}
            <TabsContent value="vaccinations" className="space-y-3 mt-4">
              {vaccinations.length === 0 ? (
                <EmptyState icon={Syringe} text="No vaccination records" />
              ) : (
                vaccinations.map(vac => (
                  <Card key={vac.id} className="border-0 shadow-sm bg-white rounded-xl">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-[#2D3448]">{vac.vaccineName}</p>
                          <p className="text-xs text-[#7E8A9B] mt-0.5">Dose {vac.doseNumber} — {vac.administrationDate}</p>
                          {vac.nextDueDate && <p className="text-xs text-amber-600 mt-1">Next due: {vac.nextDueDate}</p>}
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${vacStatusColor[vac.status] || 'bg-slate-50 text-slate-700'}`}>{vac.status}</span>
                      </div>
                      {vac.notes && <p className="text-sm text-[#7E8A9B] mt-3">{vac.notes}</p>}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Special Needs */}
            <TabsContent value="special-needs" className="space-y-3 mt-4">
              {specialNeeds.length === 0 ? (
                <EmptyState icon={Accessibility} text="No special needs records" />
              ) : (
                specialNeeds.map(sn => (
                  <Card key={sn.id} className="border-0 shadow-sm bg-white rounded-xl">
                    <CardContent className="p-5">
                      <p className="font-semibold text-sm text-[#2D3448] capitalize">{sn.needType?.replace(/_/g, ' ')}</p>
                      {sn.description && <p className="text-sm text-[#7E8A9B] mt-1">{sn.description}</p>}
                      {sn.accommodations?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-[#7E8A9B] mb-1.5">Accommodations</p>
                          <div className="flex flex-wrap gap-1.5">
                            {sn.accommodations.map((a, i) => (
                              <span key={i} className="px-3 py-1 rounded-full border border-[#E2E8F0] text-xs font-medium text-[#2D3448]">{a}</span>
                            ))}
                          </div>
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

function HealthRow({ label, icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Icon ? (
        <Icon className="w-4 h-4 text-[#7E8A9B]" />
      ) : null}
      <span className="text-sm font-medium text-[#7E8A9B]">{label}:</span>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="text-center py-12 text-[#7E8A9B]">
      <Icon className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}