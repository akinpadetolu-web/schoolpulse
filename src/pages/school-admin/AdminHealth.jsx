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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const unsub = base44.entities.StudentMedicalRecord.subscribe(() => loadData());
    return unsub;
  }, []);

  async function loadData() {
    try {
      const [r, v, i, vac, sn] = await Promise.all([
        base44.entities.StudentMedicalRecord.filter({ schoolId: user?.schoolId }),
        base44.entities.NurseVisitLog.filter({ schoolId: user?.schoolId }),
        base44.entities.MedicalIncident.filter({ schoolId: user?.schoolId }),
        base44.entities.VaccinationRecord.filter({ schoolId: user?.schoolId }),
        base44.entities.SpecialNeeds.filter({ schoolId: user?.schoolId }),
      ]);
      setRecords(r || []);
      setVisits(v || []);
      setIncidents(i || []);
      setVaccinations(vac || []);
      setSpecialNeeds(sn || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="w-6 h-6" /> Health & Medical Records</h1>
        <p className="text-muted-foreground">Manage student medical records, nurse visits, incidents, and vaccinations</p>
      </div>

      <Tabs defaultValue="records" className="w-full">
        <TabsList>
          <TabsTrigger value="records"><Heart className="w-4 h-4 mr-2" /> Medical Records ({records.length})</TabsTrigger>
          <TabsTrigger value="visits"><Stethoscope className="w-4 h-4 mr-2" /> Nurse Visits ({visits.length})</TabsTrigger>
          <TabsTrigger value="incidents"><AlertTriangle className="w-4 h-4 mr-2" /> Incidents ({incidents.length})</TabsTrigger>
          <TabsTrigger value="vaccinations"><Syringe className="w-4 h-4 mr-2" /> Vaccinations ({vaccinations.length})</TabsTrigger>
          <TabsTrigger value="special-needs">Special Needs ({specialNeeds.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="records"><MedicalRecordPanel records={records} onRefresh={loadData} /></TabsContent>
        <TabsContent value="visits"><NurseVisitPanel visits={visits} onRefresh={loadData} /></TabsContent>
        <TabsContent value="incidents"><IncidentPanel incidents={incidents} onRefresh={loadData} /></TabsContent>
        <TabsContent value="vaccinations"><VaccinationPanel vaccinations={vaccinations} onRefresh={loadData} /></TabsContent>
        <TabsContent value="special-needs"><SpecialNeedsPanel specialNeeds={specialNeeds} onRefresh={loadData} /></TabsContent>
        <TabsContent value="analytics"><HealthAnalytics records={records} visits={visits} incidents={incidents} vaccinations={vaccinations} specialNeeds={specialNeeds} /></TabsContent>
      </Tabs>
    </div>
  );
}