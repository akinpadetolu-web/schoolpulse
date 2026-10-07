import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { getActiveTerm } from '@/lib/academicTermUtils';

export default function ActiveTermBadge({ schoolId }) {
  const [activeTerm, setActiveTerm] = useState(null);

  useEffect(() => {
    loadActiveTerm();
  }, [schoolId]);

  async function loadActiveTerm() {
    const term = await getActiveTerm(schoolId);
    setActiveTerm(term);
  }

  if (!activeTerm) return null;

  return (
    <Badge className="bg-green-100 text-green-800 text-xs font-semibold">
      📚 {activeTerm.name} {activeTerm.academicYear}
    </Badge>
  );
}