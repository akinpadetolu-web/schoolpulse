import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Heart, Stethoscope, AlertTriangle, Syringe } from 'lucide-react';
import MedicalRecordPanel from '@/components/health/MedicalRecordPanel';
import NurseVisitPanel from '@/components/health/NurseVisitPanel';
import IncidentPanel from '@/components/health/IncidentPanel';
import VaccinationPanel from '@/components/health/VaccinationPanel';
import SpecialNeedsPanel from '@/components/health/SpecialNeedsPanel';
import HealthAnalytics from '@/components/health/HealthAnalytics';

export default function AdminHealth() {
  const { schoolUser: user } = useSchoolAuth();
  const [records, setRecords] = useState([]);
  const [visits, setVisits] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [specialNeeds, setSpecialNeeds] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const unsub = base44.entities.StudentMedicalRecord.subscribe(() => loadData());
    return unsub;
  }, []);

  async function loadData() {
    try {
      const [r, v, i, vac, sn, stu, cls] = await Promise.all([
        base44.entities.StudentMedicalRecord.filter({ schoolId: user?.schoolId }),
        base44.entities.NurseVisitLog.filter({ schoolId: user?.schoolId }),
        base44.entities.MedicalIncident.filter({ schoolId: user?.schoolId }),
        base44.entities.VaccinationRecord.filter({ schoolId: user?.schoolId }),
        base44.entities.SpecialNeeds.filter({ schoolId: user?.schoolId }),
        base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student', isArchived: false }),
        base44.entities.SchoolClass.filter({ schoolId: user?.schoolId }),
      ]);
      setRecords(r || []);
      setVisits(v || []);
      setIncidents(i || []);
      setVaccinations(vac || []);
      setSpecialNeeds(sn || []);
      setStudents(stu || []);
      setClasses(cls || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }

  // Tab visibility: admins see all; hr_staff see only what's permitted
  const isHrStaff = user?.role === 'hr_staff';
  const pf = user?.permittedFeatures || {};
  const hasFullHealth = pf.adminHealth === true;
  const canSeeRecords = !isHrStaff || hasFullHealth;
  const canSeeVisits = !isHrStaff || hasFullHealth || pf.healthNurseVisits === true;
  const canSeeIncidents = !isHrStaff || hasFullHealth || pf.healthIncidents === true;
  const canSeeVaccinations = !isHrStaff || hasFullHealth || pf.healthVaccinations === true;
  const canSeeSpecialNeeds = !isHrStaff || hasFullHealth || pf.healthSpecialNeeds === true;
  const canSeeAnalytics = !isHrStaff || hasFullHealth || pf.healthAnalytics === true;

  const defaultTab = canSeeRecords ? 'records' : canSeeVisits ? 'visits' : canSeeIncidents ? 'incidents' : canSeeVaccinations ? 'vaccinations' : canSeeSpecialNeeds ? 'special-needs' : 'analytics';

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="w-6 h-6" /> Health & Medical Records</h1>
        <p className="text-muted-foreground">Manage student medical records, nurse visits, incidents, and vaccinations</p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          {canSeeRecords && <TabsTrigger value="records"><Heart className="w-4 h-4 mr-2" /> Medical Records ({records.length})</TabsTrigger>}
          {canSeeVisits && <TabsTrigger value="visits"><Stethoscope className="w-4 h-4 mr-2" /> Nurse Visits ({visits.length})</TabsTrigger>}
          {canSeeIncidents && <TabsTrigger value="incidents"><AlertTriangle className="w-4 h-4 mr-2" /> Incidents ({incidents.length})</TabsTrigger>}
          {canSeeVaccinations && <TabsTrigger value="vaccinations"><Syringe className="w-4 h-4 mr-2" /> Vaccinations ({vaccinations.length})</TabsTrigger>}
          {canSeeSpecialNeeds && <TabsTrigger value="special-needs">Special Needs ({specialNeeds.length})</TabsTrigger>}
          {canSeeAnalytics && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
        </TabsList>

        {canSeeRecords && <TabsContent value="records"><MedicalRecordPanel records={records} students={students} classes={classes} onRefresh={loadData} /></TabsContent>}
        {canSeeVisits && <TabsContent value="visits"><NurseVisitPanel visits={visits} students={students} classes={classes} onRefresh={loadData} /></TabsContent>}
        {canSeeIncidents && <TabsContent value="incidents"><IncidentPanel incidents={incidents} students={students} classes={classes} onRefresh={loadData} /></TabsContent>}
        {canSeeVaccinations && <TabsContent value="vaccinations"><VaccinationPanel vaccinations={vaccinations} students={students} classes={classes} onRefresh={loadData} /></TabsContent>}
        {canSeeSpecialNeeds && <TabsContent value="special-needs"><SpecialNeedsPanel specialNeeds={specialNeeds} students={students} classes={classes} onRefresh={loadData} /></TabsContent>}
        {canSeeAnalytics && <TabsContent value="analytics"><HealthAnalytics records={records} visits={visits} incidents={incidents} vaccinations={vaccinations} specialNeeds={specialNeeds} /></TabsContent>}
      </Tabs>
    </div>
  );
}