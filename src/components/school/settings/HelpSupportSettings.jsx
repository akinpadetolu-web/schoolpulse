import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageCircle, Headphones, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

const CONTACTS = [
  {
    label: 'AI Assistant (WhatsApp)',
    value: '0814 448 0969',
    href: 'https://wa.me/2348144480969',
    icon: MessageCircle,
    hint: 'Instant answers, any time',
  },
  {
    label: 'Talk to a human',
    value: '0906 597 7895',
    href: 'https://wa.me/2349065977895',
    icon: Headphones,
    hint: 'Mon–Fri, business hours',
  },
  {
    label: 'Support email',
    value: 'support@schooledupulse.com',
    href: 'mailto:support@schooledupulse.com',
    icon: Mail,
    hint: 'For account and billing issues',
  },
];

const SETUP_STEPS = [
  { label: 'Create your classes and subjects', to: '/school-admin/classes' },
  { label: 'Add teachers and assign their classes', to: '/school-admin/teachers' },
  { label: 'Add students, or import them in bulk', to: '/school-admin/students' },
  { label: 'Build the class timetable', to: '/school-admin/timetable' },
  { label: 'Set up grading and fee structures', to: '/school-admin/grading-system' },
];

export default function HelpSupportSettings() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>Help &amp; Support</CardTitle>
        <CardDescription>Reach us on WhatsApp or email, and follow the setup checklist to get your school running.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {CONTACTS.map(c => {
            const Icon = c.icon;
            return (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-sm font-semibold truncate">{c.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.hint}</p>
                </div>
              </a>
            );
          })}
        </div>

        <div>
          <p className="text-sm font-semibold mb-3">Getting started checklist</p>
          <div className="space-y-1">
            {SETUP_STEPS.map(step => (
              <Link
                key={step.to}
                to={step.to}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 text-foreground">{step.label}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}