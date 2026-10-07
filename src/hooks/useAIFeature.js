import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

/**
 * School-wide AI switch.
 *
 * The flag lives on the school's admin feature configuration (the per-school
 * Feature Toggles console). It is deliberately read as ONE school-level value so
 * a single switch turns AI off for every portal rather than just one role.
 *
 * Returns `null` while resolving, then a boolean. Defaults to enabled for
 * schools that have never configured it.
 */
export function useAIFeature() {
  const { schoolUser } = useSchoolAuth();
  const [enabled, setEnabled] = useState(null);

  useEffect(() => {
    const schoolId = schoolUser?.schoolId;
    if (!schoolId) {
      setEnabled(false);
      return;
    }
    let active = true;
    base44.entities.FeatureToggle.filter({ schoolId, role: 'admin', isActive: true })
      .then(toggles => {
        if (!active) return;
        const record = (toggles || []).find(t => !t.userId && typeof t.features?.aiFeatures === 'boolean');
        setEnabled(record ? record.features.aiFeatures : true);
      })
      .catch(() => { if (active) setEnabled(true); });
    return () => { active = false; };
  }, [schoolUser?.schoolId]);

  return enabled;
}