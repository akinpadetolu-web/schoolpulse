import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart2, Copy, Trash2, Calendar, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-amber-100 text-amber-700',
  sent: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  paused: 'bg-orange-100 text-orange-700',
};

const RECIPIENT_LABELS = {
  all_parents: 'All Parents', all_teachers: 'All Teachers', all_students: 'All Students',
  all_staff: 'All Staff', specific_class: 'Specific Class', specific_grade: 'Specific Grade',
  specific_teachers: 'Specific Teachers', specific_students: 'Specific Students',
  specific_parents: 'Specific Parents', custom_group: 'Custom Group',
};

export default function CampaignsTable({ campaigns, onViewReport, onDuplicate, onDelete }) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
          <BarChart2 className="w-7 h-7 opacity-40" />
        </div>
        <p className="font-medium">No campaigns yet</p>
        <p className="text-sm mt-1">Create your first campaign to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-muted/50">
          <tr>
            {['Campaign Name','Type','Recipients','Date','Status','Delivery','Open Rate','Click Rate','Actions'].map(h => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {campaigns.map(c => (
            <tr key={c.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium truncate max-w-[180px]">{c.name}</p>
                {c.subject && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{c.subject}</p>}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{(c.campaignType || '').replace(/_/g,' ')}</td>
              <td className="px-4 py-3 text-xs">
                <p>{RECIPIENT_LABELS[c.recipientType] || c.recipientType}</p>
                {c.recipientCount > 0 && <p className="text-muted-foreground">{c.recipientCount} people</p>}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {c.sentAt ? (
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(c.sentAt), 'MMM d, yyyy')}</div>
                ) : c.scheduledAt ? (
                  <div className="flex items-center gap-1 text-blue-600"><Calendar className="w-3 h-3" />{format(parseISO(c.scheduledAt), 'MMM d, yyyy HH:mm')}</div>
                ) : '—'}
              </td>
              <td className="px-4 py-3">
                <Badge className={STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-700'}>
                  {(c.status || 'draft').charAt(0).toUpperCase() + (c.status || 'draft').slice(1)}
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs font-medium">{c.status === 'sent' ? `${c.deliveryRate || 0}%` : '—'}</td>
              <td className="px-4 py-3 text-xs font-medium">{c.status === 'sent' ? `${c.openRate || 0}%` : '—'}</td>
              <td className="px-4 py-3 text-xs font-medium">{c.status === 'sent' ? `${c.clickRate || 0}%` : '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {c.status === 'sent' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewReport(c)} title="View Report">
                      <BarChart2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(c)} title="Duplicate">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => onDelete(c)} title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}