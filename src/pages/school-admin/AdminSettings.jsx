import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import DeleteAccountDialog from '@/components/mobile/DeleteAccountDialog';
import GeneralSchoolSettings from '@/components/school/settings/GeneralSchoolSettings';
import CommunicationSettings from '@/components/school/settings/CommunicationSettings';
import AcademicQuickLinks from '@/components/school/settings/AcademicQuickLinks';
import BrandColorsSettings from '@/components/school/settings/BrandColorsSettings';
import DepartmentsSettings from '@/components/school/settings/DepartmentsSettings';

export default function AdminSettings() {
  const { schoolUser: user } = useSchoolAuth();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadSchool() {
    if (!user?.schoolId) { setLoading(false); return; }
    const results = await base44.entities.School.filter({ id: user.schoolId });
    setSchool((results || [])[0] || null);
    setLoading(false);
  }

  useEffect(() => { loadSchool(); }, [user?.schoolId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!school) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">School Settings</h1>
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>School record not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">School Settings</h1>

      {/* General Information */}
      <GeneralSchoolSettings school={school} onSaved={loadSchool} />

      {/* Brand Colors */}
      <BrandColorsSettings school={school} onSaved={loadSchool} />

      {/* Departments */}
      <DepartmentsSettings school={school} onSaved={loadSchool} />

      {/* Academic Settings Quick Links */}
      <AcademicQuickLinks />

      {/* Communication Settings */}
      <CommunicationSettings school={school} onSaved={loadSchool} />

      {/* Danger Zone */}
      <Card className="border-0 shadow-sm border border-red-100">
        <CardContent className="pt-6">
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
}