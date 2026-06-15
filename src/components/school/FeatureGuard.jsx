import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { getFeatures } from '@/lib/featureToggleManager';
import { Lock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const featureMap = {
  "/school-admin/assignments": "assignments",
  "/school-admin/grade-weighting": "grades",
  "/school-admin/grades": "grades",
  "/school-admin/attendance": "attendance",
  "/school-admin/announcements": "announcements",
  "/school-admin/messages": "messaging",
  "/school-admin/email-campaign": "messaging",
  "/school-admin/approvals": "messaging",
  "/school-admin/timetable": "timetable",
  "/school-admin/e-class": "eClass",
  "/school-admin/report-cards": "reportCards",
  "/school-admin/student-reports": "studentReports",
  "/school-admin/teacher-workload": "teacherWorkload",
};

export default function FeatureGuard({ children, path }) {
  const { schoolUser: user } = useSchoolAuth();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(null);
  const requiredFeature = featureMap[path];

  useEffect(() => {
    async function checkAccess() {
      if (!requiredFeature) {
        setAllowed(true);
        return;
      }
      // HR staff: check their personal permittedFeatures first
      if (user?.role === 'hr_staff') {
        const permitted = user?.permittedFeatures || {};
        if (permitted[requiredFeature] === true) {
          setAllowed(true);
        } else {
          setAllowed(false);
          setTimeout(() => navigate('/school-admin'), 2000);
        }
        return;
      }
      const features = await getFeatures(user?.schoolId, user?.role, user?.id);
      if (features[requiredFeature] === false) {
        setAllowed(false);
        setTimeout(() => navigate('/school-admin'), 2000);
      } else {
        setAllowed(true);
      }
    }
    if (user?.schoolId) checkAccess();
  }, [user?.schoolId, user?.role, user?.id, requiredFeature, navigate]);

  if (allowed === null) return null;
  if (allowed) return children;

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-sm border-0 shadow-lg">
        <CardContent className="py-12 text-center">
          <Lock className="w-12 h-12 mx-auto text-destructive/50 mb-4" />
          <h2 className="font-bold text-lg mb-2">Feature Disabled</h2>
          <p className="text-sm text-muted-foreground mb-4">This feature is not available for your account. Contact your super admin to enable it.</p>
          <p className="text-xs text-muted-foreground">Redirecting...</p>
        </CardContent>
      </Card>
    </div>
  );
}