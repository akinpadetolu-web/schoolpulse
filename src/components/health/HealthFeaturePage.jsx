import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Loader2, Heart, Stethoscope, AlertTriangle, Syringe, Accessibility, BarChart3 } from 'lucide-react';
import MedicalRecordPanel from '@/components/health/MedicalRecordPanel';
import NurseVisitPanel from '@/components/health/NurseVisitPanel';
import IncidentPanel from '@/components/health/IncidentPanel';
import VaccinationPanel from '@/components/health/VaccinationPanel';
import SpecialNeedsPanel from '@/components/health/SpecialNeedsPanel';
import HealthAnalytics from '@/components/health/HealthAnalytics';

const FEATURE_CONFIG = {
  records:        { title: 'Medical Records',  subtitle: 'Student medical records and conditions',          icon: Heart },
  visits:         { title: 'Nurse Visits',     subtitle: 'Log and track clinic visits',                     icon: Stethoscope },
  incidents:      { title: 'Medical Incidents', subtitle: 'Report and track medical incidents',             icon: AlertTriangle },
  vaccinations:   { title: 'Vaccinations',     subtitle: 'Record and track student vaccinations',           icon: Syringe },
  'special-needs': { title: 'Special Needs',  subtitle: 'Manage special needs and accommodations',         icon: Accessibility },
  analytics:      { title: 'Health Analytics', subtitle: 'Overview and trends across all health data',      icon: BarChart3 },
};

const SUBSCRIBE_MAP = {
  records: 'StudentMedicalRecord',
  visits: 'NurseVisitLog',
  incidents: 'MedicalIncident',
  vaccinations: 'VaccinationRecord',
  'special-needs': 'SpecialNeeds',
  analytics: 'StudentMedicalRecord',
};

export default function HealthFeaturePage({ feature }) {
  const { schoolUser: user } = useSchoolAuth();
  const [data, setData] = useState({ records: [], visits: [], incidents: [], vaccinations: [], specialNeeds: [], students: [], classes: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const entityName = SUBSCRIBE_MAP[feature];
    const unsub = base44.entities[entityName]?.subscribe(() => loadData());
    return unsub;
  }, [feature, user?.schoolId]);

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
      setData({ records: r || [], visits: v || [], incidents: i || [], vaccinations: vac || [], specialNeeds: sn || [], students: stu || [], classes: cls || [] });
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const config = FEATURE_CONFIG[feature];
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Icon className="w-6 h-6" /> {config.title}</h1>
        <p className="text-muted-foreground">{config.subtitle}</p>
      </div>

      {feature === 'records' && <MedicalRecordPanel records={data.records} students={data.students} classes={data.classes} onRefresh={loadData} />}
      {feature === 'visits' && <NurseVisitPanel visits={data.visits} students={data.students} classes={data.classes} onRefresh={loadData} />}
      {feature === 'incidents' && <IncidentPanel incidents={data.incidents} students={data.students} classes={data.classes} onRefresh={loadData} />}
      {feature === 'vaccinations' && <VaccinationPanel vaccinations={data.vaccinations} students={data.students} classes={data.classes} onRefresh={loadData} />}
      {feature === 'special-needs' && <SpecialNeedsPanel specialNeeds={data.specialNeeds} students={data.students} classes={data.classes} onRefresh={loadData} />}
      {feature === 'analytics' && <HealthAnalytics records={data.records} visits={data.visits} incidents={data.incidents} vaccinations={data.vaccinations} specialNeeds={data.specialNeeds} />}
    </div>
  );
}