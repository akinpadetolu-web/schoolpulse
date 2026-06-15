import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Heart, Activity, Syringe, AlertTriangle, Users } from 'lucide-react';
import MedicalRecordPanel from '@/components/health/MedicalRecordPanel';
import NurseVisitPanel from '@/components/health/NurseVisitPanel';
import IncidentPanel from '@/components/health/IncidentPanel';
import VaccinationPanel from '@/components/health/VaccinationPanel';
import SpecialNeedsPanel from '@/components/health/SpecialNeedsPanel';
import HealthAnalytics from '@/components/health/HealthAnalytics';

export default function AdminHealth() {
  const { schoolUser: user } = useSchoolAuth();
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [nurseVisits, setNurseVisits] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [specialNeeds, setSpecialNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
    const unsub = base44.entities.StudentMedicalRecord.subscribe(event => {
      if (event.type === 'create' || event.type === 'update') loadData();
    });
    return unsub;
  }, []);

  async function loadData() {
    try {
      const [mr, nv, inc, vac, sn] = await Promise.all([
        base44.entities.StudentMedicalRecord.filter({ schoolId: user?.schoolId }),
        base44.entities.NurseVisitLog.filter({ schoolId: user?.schoolId }),
        base44.entities.MedicalIncident.filter({ schoolId: user?.schoolId }),
        base44.entities.VaccinationRecord.filter({ schoolId: user?.schoolId }),
        base44.entities.SpecialNeeds.filter({ schoolId: user?.schoolId }),
      ]);
      setMedicalRecords(mr || []);
      setNurseVisits(nv || []);
      setIncidents(inc || []);
      setVaccinations(vac || []);
      setSpecialNeeds(sn || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    totalRecords: medicalRecords.length,
    todayVisits: nurseVisits.filter(v => v.visitDate === new Date().toISOString().split('T')[0]).length,
    incidents: incidents.filter(i => i.status !== 'closed').length,
    vaccinated: vaccinations.filter(v => v.status === 'completed').length,
    specialNeeds: specialNeeds.length,
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Health & Medical Records</h1>
          <p className="text-muted-foreground">Manage student health records, incidents, vaccinations, and special needs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Records</div>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Today's Visits</div>
            <div className="text-2xl font-bold text-blue-600">{stats.todayVisits}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Open Incidents</div>
            <div className="text-2xl font-bold text-red-600">{stats.incidents}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Vaccinated</div>
            <div className="text-2xl font-bold text-green-600">{stats.vaccinated}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Special Needs</div>
            <div className="text-2xl font-bold">{stats.specialNeeds}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="medical" className="w-full">
        <TabsList>
          <TabsTrigger value="medical"><Heart className="w-4 h-4 mr-2" /> Medical Records</TabsTrigger>
          <TabsTrigger value="visits"><Activity className="w-4 h-4 mr-2" /> Nurse Visits</TabsTrigger>
          <TabsTrigger value="incidents"><AlertTriangle className="w-4 h-4 mr-2" /> Incidents</TabsTrigger>
          <TabsTrigger value="vaccinations"><Syringe className="w-4 h-4 mr-2" /> Vaccinations</TabsTrigger>
          <TabsTrigger value="special"><Users className="w-4 h-4 mr-2" /> Special Needs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="medical"><MedicalRecordPanel records={medicalRecords} search={search} onRefresh={loadData} /></TabsContent>
        <TabsContent value="visits"><NurseVisitPanel visits={nurseVisits} medicalRecords={medicalRecords} search={search} onRefresh={loadData} /></TabsContent>
        <TabsContent value="incidents"><IncidentPanel incidents={incidents} medicalRecords={medicalRecords} search={search} onRefresh={loadData} /></TabsContent>
        <TabsContent value="vaccinations"><VaccinationPanel vaccinations={vaccinations} medicalRecords={medicalRecords} search={search} onRefresh={loadData} /></TabsContent>
        <TabsContent value="special"><SpecialNeedsPanel specialNeeds={specialNeeds} medicalRecords={medicalRecords} search={search} onRefresh={loadData} /></TabsContent>
        <TabsContent value="analytics"><HealthAnalytics records={medicalRecords} visits={nurseVisits} incidents={incidents} vaccinations={vaccinations} special={specialNeeds} /></TabsContent>
      </Tabs>
    </div>
  );
}