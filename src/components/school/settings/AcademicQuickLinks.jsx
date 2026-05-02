import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { GraduationCap, Calendar, BarChart2, FileText, ChevronRight, TrendingUp } from 'lucide-react';

const links = [
  {
    icon: Calendar,
    label: 'Academic Terms',
    description: 'Manage academic years, terms, and their dates',
    path: '/school-admin/academic-terms',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: BarChart2,
    label: 'Grading System',
    description: 'Configure grade bands, pass marks, and assessment weights',
    path: '/school-admin/grading-system',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: TrendingUp,
    label: 'Promotion Rules',
    description: 'Set rules for student promotion and repetition',
    path: '/school-admin/promotion',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: FileText,
    label: 'Report Card Templates',
    description: 'Design and manage report card layouts for different periods',
    path: '/school-admin/report-card-templates',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    icon: GraduationCap,
    label: 'Grade Weighting',
    description: 'Configure how different assessment types are weighted',
    path: '/school-admin/grade-weighting',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
];

export default function AcademicQuickLinks() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="w-4 h-4" /> Academic Settings</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {links.map(({ icon: Icon, label, description, path, color, bg }) => (
          <Link
            key={path}
            to={path}
            className="flex items-center gap-4 px-6 py-4 border-b last:border-0 hover:bg-muted/40 transition-colors group"
          >
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}