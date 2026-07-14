import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Area, AreaChart,
} from 'recharts';
import { Activity, Stethoscope, AlertTriangle, BookOpen, TrendingUp } from 'lucide-react';

const CHART_COLOR = {
  visits: '#22d3ee',
  incidents: '#f87171',
  borrows: '#a78bfa',
  returns: '#34d399',
  grid: '#2a3050',
  axis: '#64748b',
};

function buildDailySeries(records, dateField, days, range) {
  const dayMap = {};
  eachDayOfInterval({ start: range.from, end: range.to }).forEach(d => {
    dayMap[format(d, 'yyyy-MM-dd')] = 0;
  });
  (records || []).forEach(r => {
    const d = r[dateField] ? new Date(r[dateField]) : null;
    if (!d) return;
    const key = format(d, 'yyyy-MM-dd');
    if (key in dayMap) dayMap[key]++;
  });
  return Object.entries(dayMap).map(([date, count]) => ({ date: format(new Date(date), 'MMM d'), count }));
}

function buildCategoryBreakdown(records, field, labels = {}) {
  const map = {};
  (records || []).forEach(r => {
    const key = r[field] || 'other';
    const label = labels[key] || key;
    map[label] = (map[label] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

const tooltipStyle = {
  backgroundColor: '#1e2340',
  border: '1px solid #2a3050',
  borderRadius: '0.5rem',
  color: '#fff',
  fontSize: '12px',
};

export default function ActivityTrends({ filters }) {
  const { schoolUser: user } = useSchoolAuth();
  const schoolId = user?.schoolId;
  const [data, setData] = useState({ visits: [], incidents: [], borrows: [], returns: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }
    async function load() {
      const [visits, incidents, borrows, returns] = await Promise.all([
        base44.entities.NurseVisitLog.filter({ schoolId }).catch(() => []),
        base44.entities.MedicalIncident.filter({ schoolId }).catch(() => []),
        base44.entities.BookBorrow.filter({ schoolId }).catch(() => []),
        base44.entities.BookReturn.filter({ schoolId }).catch(() => []),
      ]);
      setData({ visits: visits || [], incidents: incidents || [], borrows: borrows || [], returns: returns || [] });
      setLoading(false);
    }
    load();
  }, [schoolId]);

  const days = useMemo(() => {
    if (filters?.timePeriod === 'today') return 1;
    if (filters?.timePeriod === 'this_week' || filters?.timePeriod === 'last_week') return 7;
    if (filters?.timePeriod === 'this_month' || filters?.timePeriod === 'last_month') return 30;
    return 30;
  }, [filters]);

  const range = useMemo(() => {
    const now = new Date();
    const from = startOfDay(subDays(now, days - 1));
    return { from, to: now };
  }, [days]);

  const series = useMemo(() => {
    const visitsSeries = buildDailySeries(data.visits, 'visitDate', days, range);
    const incidentSeries = buildDailySeries(data.incidents, 'incidentDate', days, range);
    const borrowSeries = buildDailySeries(data.borrows, 'borrowDate', days, range);
    const returnSeries = buildDailySeries(data.returns, 'returnDate', days, range);

    const combined = visitsSeries.map((v, i) => ({
      date: v.date,
      visits: v.count,
      incidents: incidentSeries[i]?.count || 0,
      borrows: borrowSeries[i]?.count || 0,
      returns: returnSeries[i]?.count || 0,
    }));

    return {
      combined,
      visitReasons: buildCategoryBreakdown(data.visits, 'reason', {
        illness: 'Illness', injury: 'Injury', routine_checkup: 'Routine Checkup',
        medication_administration: 'Medication', allergy_reaction: 'Allergy',
        mental_health: 'Mental Health', dental: 'Dental', other: 'Other',
      }),
      incidentTypes: buildCategoryBreakdown(data.incidents, 'incidentType', {
        injury: 'Injury', poisoning: 'Poisoning', allergic_reaction: 'Allergic Reaction',
        collapse: 'Collapse', assault: 'Assault', accident: 'Accident', other: 'Other',
      }),
      borrowStatus: buildCategoryBreakdown(data.borrows, 'status', {
        active: 'Active', overdue: 'Overdue', returned: 'Returned',
      }),
    };
  }, [data, days, range]);

  const kpis = useMemo(() => [
    { label: 'Nurse Visits', value: data.visits.length, icon: Stethoscope, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    { label: 'Medical Incidents', value: data.incidents.length, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20' },
    { label: 'Books Borrowed', value: data.borrows.length, icon: BookOpen, color: 'text-violet-400', bg: 'bg-violet-500/20' },
    { label: 'Books Returned', value: data.returns.length, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  ], [data]);

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-bold text-white">Activity Trends</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(card => (
          <div key={card.label} className="bg-[#1e2340] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Trend Chart - Visits & Incidents over time */}
      <div className="bg-[#1e2340] rounded-2xl p-5">
        <p className="font-semibold text-white mb-4">Health Activity — Last {days} Days</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={series.combined}>
            <defs>
              <linearGradient id="visitsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLOR.visits} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLOR.visits} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="incidentsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLOR.incidents} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLOR.incidents} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLOR.grid} />
            <XAxis dataKey="date" stroke={CHART_COLOR.axis} fontSize={11} tickLine={false} />
            <YAxis stroke={CHART_COLOR.axis} fontSize={11} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area type="monotone" dataKey="visits" name="Nurse Visits" stroke={CHART_COLOR.visits} fill="url(#visitsGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="incidents" name="Incidents" stroke={CHART_COLOR.incidents} fill="url(#incidentsGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Library Circulation */}
      <div className="bg-[#1e2340] rounded-2xl p-5">
        <p className="font-semibold text-white mb-4">Library Book Circulation — Last {days} Days</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={series.combined}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLOR.grid} />
            <XAxis dataKey="date" stroke={CHART_COLOR.axis} fontSize={11} tickLine={false} />
            <YAxis stroke={CHART_COLOR.axis} fontSize={11} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="borrows" name="Borrowed" stroke={CHART_COLOR.borrows} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="returns" name="Returned" stroke={CHART_COLOR.returns} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {series.visitReasons.length > 0 && (
          <div className="bg-[#1e2340] rounded-2xl p-5">
            <p className="font-semibold text-white mb-3 text-sm">Nurse Visits by Reason</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={series.visitReasons} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLOR.grid} horizontal={false} />
                <XAxis type="number" stroke={CHART_COLOR.axis} fontSize={10} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke={CHART_COLOR.axis} fontSize={10} tickLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#252b48' }} />
                <Bar dataKey="value" name="Visits" fill={CHART_COLOR.visits} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {series.incidentTypes.length > 0 && (
          <div className="bg-[#1e2340] rounded-2xl p-5">
            <p className="font-semibold text-white mb-3 text-sm">Incidents by Type</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={series.incidentTypes} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLOR.grid} horizontal={false} />
                <XAxis type="number" stroke={CHART_COLOR.axis} fontSize={10} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke={CHART_COLOR.axis} fontSize={10} tickLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#252b48' }} />
                <Bar dataKey="value" name="Incidents" fill={CHART_COLOR.incidents} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {series.borrowStatus.length > 0 && (
          <div className="bg-[#1e2340] rounded-2xl p-5">
            <p className="font-semibold text-white mb-3 text-sm">Book Loans by Status</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={series.borrowStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLOR.grid} />
                <XAxis dataKey="name" stroke={CHART_COLOR.axis} fontSize={10} tickLine={false} />
                <YAxis stroke={CHART_COLOR.axis} fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#252b48' }} />
                <Bar dataKey="value" name="Books" fill={CHART_COLOR.borrows} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}