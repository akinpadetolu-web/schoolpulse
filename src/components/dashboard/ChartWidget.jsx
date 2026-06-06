import React, { useState, useRef, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { BarChart2, ChevronDown } from 'lucide-react';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a78bfa', '#f97316', '#ec4899'];

const CHART_TYPES = {
  bar:          { label: 'Bar Chart',           icon: '▐▐▐' },
  bar_h:        { label: 'Horizontal Bar',       icon: '═══' },
  line:         { label: 'Line Chart',           icon: '〜〜' },
  area:         { label: 'Area Chart',           icon: '▲▲▲' },
  pie:          { label: 'Pie Chart',            icon: '◉' },
  donut:        { label: 'Donut Chart',          icon: '⊙' },
  radar:        { label: 'Radar Chart',          icon: '✦' },
  stacked_bar:  { label: 'Stacked Bar',          icon: '▐▌▐' },
};

const COMMON_STYLE = {
  tooltip: { background: '#12152a', border: '1px solid #2a2f4a', borderRadius: 8 },
  labelStyle: { color: '#fff' },
  itemStyle: { color: '#94a3b8' },
  tick: { fill: '#94a3b8', fontSize: 11 },
  grid: '#2a2f4a',
};

function renderChart(type, data, dataKeys, height = 200) {
  const mainKey = dataKeys[0];
  if (!data || data.length === 0) return null;

  const xKey = data[0] && Object.keys(data[0]).find(k => typeof data[0][k] === 'string') || 'name';

  if (type === 'line') return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COMMON_STYLE.grid} />
        <XAxis dataKey={xKey} tick={COMMON_STYLE.tick} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={COMMON_STYLE.tick} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={COMMON_STYLE.tooltip} labelStyle={COMMON_STYLE.labelStyle} itemStyle={COMMON_STYLE.itemStyle} />
        {dataKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i]} strokeWidth={2.5} dot={false} connectNulls />)}
      </LineChart>
    </ResponsiveContainer>
  );

  if (type === 'area') return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          {dataKeys.map((k, i) => (
            <linearGradient key={k} id={`grad_${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS[i]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COMMON_STYLE.grid} />
        <XAxis dataKey={xKey} tick={COMMON_STYLE.tick} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={COMMON_STYLE.tick} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={COMMON_STYLE.tooltip} labelStyle={COMMON_STYLE.labelStyle} />
        {dataKeys.map((k, i) => (
          <Area key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i]} fill={`url(#grad_${k})`} strokeWidth={2} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );

  if (type === 'bar') return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COMMON_STYLE.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={COMMON_STYLE.tick} axisLine={false} tickLine={false} />
        <YAxis tick={COMMON_STYLE.tick} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={COMMON_STYLE.tooltip} labelStyle={COMMON_STYLE.labelStyle} />
        {dataKeys.map((k, i) => <Bar key={k} dataKey={k} fill={CHART_COLORS[i]} radius={[4, 4, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );

  if (type === 'bar_h') return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COMMON_STYLE.grid} horizontal={false} />
        <XAxis type="number" tick={COMMON_STYLE.tick} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey={xKey} tick={COMMON_STYLE.tick} axisLine={false} tickLine={false} width={80} />
        <Tooltip contentStyle={COMMON_STYLE.tooltip} labelStyle={COMMON_STYLE.labelStyle} />
        {dataKeys.map((k, i) => <Bar key={k} dataKey={k} fill={CHART_COLORS[i]} radius={[0, 4, 4, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );

  if (type === 'stacked_bar') return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COMMON_STYLE.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={COMMON_STYLE.tick} axisLine={false} tickLine={false} />
        <YAxis tick={COMMON_STYLE.tick} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={COMMON_STYLE.tooltip} labelStyle={COMMON_STYLE.labelStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
        {dataKeys.map((k, i) => <Bar key={k} dataKey={k} fill={CHART_COLORS[i]} stackId="stack" />)}
      </BarChart>
    </ResponsiveContainer>
  );

  if (type === 'pie' || type === 'donut') {
    const colorKey = data[0]?.color ? 'color' : null;
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey={mainKey} nameKey={xKey} cx="50%" cy="50%"
            innerRadius={type === 'donut' ? height * 0.23 : 0}
            outerRadius={height * 0.38}>
            {data.map((entry, i) => <Cell key={i} fill={colorKey ? entry.color : CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={COMMON_STYLE.tooltip} itemStyle={COMMON_STYLE.itemStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'radar') return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius={height * 0.35}>
        <PolarGrid stroke={COMMON_STYLE.grid} />
        <PolarAngleAxis dataKey={xKey} tick={COMMON_STYLE.tick} />
        <Tooltip contentStyle={COMMON_STYLE.tooltip} />
        {dataKeys.map((k, i) => <Radar key={k} dataKey={k} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.2} />)}
      </RadarChart>
    </ResponsiveContainer>
  );

  // fallback: bar
  return renderChart('bar', data, dataKeys, height);
}

export default function ChartWidget({ id, title, subtitle, data, dataKeys = ['value'], defaultType = 'bar', allowedTypes, height = 200, children, storageKey }) {
  const available = allowedTypes || ['bar', 'bar_h', 'line', 'area', 'pie', 'donut', 'radar', 'stacked_bar'];
  const sk = storageKey || `chart_type_${id}`;
  const [chartType, setChartType] = useState(() => {
    try { return localStorage.getItem(sk) || defaultType; } catch { return defaultType; }
  });
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(sk, chartType); } catch {}
  }, [chartType, sk]);

  useEffect(() => {
    function handleClick(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const hasData = data && data.length > 0;

  return (
    <div className="bg-[#1e2340] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="font-semibold text-white">{title}</p>
          {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
        </div>
        <div ref={dropRef} className="relative shrink-0 ml-2">
          <button onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-[#12152a] border border-slate-700 rounded-lg px-2 py-1 transition-colors">
            <BarChart2 className="w-3 h-3" />
            <span className="hidden sm:inline">{CHART_TYPES[chartType]?.label || 'Chart'}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {open && (
            <div className="absolute right-0 top-8 bg-[#1a1f3a] border border-slate-700 rounded-xl shadow-xl z-50 py-1 w-44">
              {available.filter(t => CHART_TYPES[t]).map(t => (
                <button key={t} onClick={() => { setChartType(t); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-[#252b48] transition-colors flex items-center gap-2 ${chartType === t ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}>
                  <span className="w-5 text-center">{CHART_TYPES[t].icon}</span>
                  {CHART_TYPES[t].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3">
        {hasData ? renderChart(chartType, data, dataKeys, height) : (
          children || <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}> No data available </div>
        )}
      </div>
    </div>
  );
}