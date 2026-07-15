import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

export function useHostelData() {
  const { schoolUser: user } = useSchoolAuth();
  const [hostels, setHostels] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.schoolId) { setLoading(false); return; }
    try {
      const [h, a, att, stds] = await Promise.all([
        base44.entities.Hostel.filter({ schoolId: user.schoolId, isActive: true }),
        base44.entities.HostelAllocation.filter({ schoolId: user.schoolId, status: 'active' }),
        base44.entities.HostelAttendance.filter({ schoolId: user.schoolId }),
        base44.entities.SchoolUser.filter({ schoolId: user.schoolId, role: 'student' }),
      ]);
      setHostels(h || []);
      setAllocations(a || []);
      setAttendance(att || []);
      setStudents((stds || []).filter(s => !s.isArchived));
    } catch (error) {
      console.error('Hostel data load error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.schoolId]);

  useEffect(() => {
    loadData();
    const unsub1 = base44.entities.Hostel.subscribe(event => {
      if (event.type === 'create' || event.type === 'update') loadData();
    });
    const unsub2 = base44.entities.HostelAllocation.subscribe(event => {
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') loadData();
    });
    const unsub3 = base44.entities.HostelAttendance.subscribe(event => {
      if (event.type === 'create' || event.type === 'update') loadData();
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [loadData]);

  const genderFilter = user?.genderAccess;

  const filteredAllocations = useMemo(() => {
    if (!genderFilter || genderFilter === 'all') return allocations;
    return allocations.filter(a => (a.gender || '').toLowerCase() === genderFilter);
  }, [allocations, genderFilter]);

  const filteredAttendance = useMemo(() => {
    if (!genderFilter || genderFilter === 'all') return attendance;
    return attendance.filter(a => {
      const alloc = allocations.find(al => al.studentId === a.studentId);
      return alloc && (alloc.gender || '').toLowerCase() === genderFilter;
    });
  }, [attendance, allocations, genderFilter]);

  const filteredHostels = useMemo(() => {
    if (!genderFilter || genderFilter === 'all') return hostels;
    return hostels.filter(h => h.gender === genderFilter || h.gender === 'mixed');
  }, [hostels, genderFilter]);

  const stats = useMemo(() => ({
    totalHostels: filteredHostels.length,
    totalBeds: filteredHostels.reduce((sum, h) => sum + (h.capacity || 0), 0),
    occupied: filteredAllocations.length,
    available: Math.max(0, filteredHostels.reduce((sum, h) => sum + (h.capacity || 0), 0) - filteredAllocations.length),
    todayPresent: filteredAttendance.filter(a => a.attendanceDate === new Date().toISOString().split('T')[0] && a.status === 'present').length,
  }), [filteredHostels, filteredAllocations, filteredAttendance]);

  return {
    hostels: filteredHostels,
    allocations: filteredAllocations,
    attendance: filteredAttendance,
    students,
    stats,
    loading,
    refresh: loadData,
    genderFilter,
  };
}