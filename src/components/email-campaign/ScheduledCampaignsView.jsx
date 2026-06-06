import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, Users, Edit, Pause, X, Send, CalendarDays } from 'lucide-react';
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  paused: 'bg-orange-100 text-orange-700',
};

export default function ScheduledCampaignsView({ campaigns, onBack, onEdit, onRefresh }) {
  const [calMonth, setCalMonth] = useState(new Date());
  const [view, setView] = useState('list');

  const scheduled = campaigns.filter(c => c.status === 'scheduled' || c.status === 'paused');

  async function handleAction(c, action) {
    if (action === 'cancel') {
      if (!window.confirm(`Cancel campaign "${c.name}"?`)) return;
      await base44.entities.EmailCampaign.update(c.id, { status: 'draft' });
      toast.success('Campaign cancelled (moved to draft)');
      onRefresh();
    } else if (action === 'pause') {
      await base44.entities.EmailCampaign.update(c.id, { status: 'paused' });
      toast.success('Campaign paused');
      onRefresh();
    } else if (action === 'resume') {
      await base44.entities.EmailCampaign.update(c.id, { status: 'scheduled' });
      toast.success('Campaign resumed');
      onRefresh();
    } else if (action === 'send_now') {
      await base44.entities.EmailCampaign.update(c.id, { status: 'sent', sentAt: new Date().toISOString() });
      toast.success('Campaign sent!');
      onRefresh();
    }
  }

  // Calendar helpers
  const monthStart = startOfMonth(calMonth);
  const monthEnd = endOfMonth(calMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  function campaignsOnDay(day) {
    return scheduled.filter(c => c.scheduledAt && isSameDay(parseISO(c.scheduledAt), day));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h2 className="text-xl font-bold">Scheduled Campaigns</h2>
        <div className="ml-auto flex gap-2">
          <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" className="gap-1.5 h-8" onClick={() => setView('list')}>
            <Clock className="w-3.5 h-3.5" /> List
          </Button>
          <Button variant={view === 'calendar' ? 'default' : 'ghost'} size="sm" className="gap-1.5 h-8" onClick={() => setView('calendar')}>
            <CalendarDays className="w-3.5 h-3.5" /> Calendar
          </Button>
        </div>
      </div>

      {scheduled.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No scheduled campaigns</p>
          <p className="text-sm mt-1">Campaigns you schedule will appear here</p>
        </div>
      ) : view === 'list' ? (
        <div className="space-y-3">
          {scheduled.map(c => (
            <Card key={c.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{c.name}</p>
                      <Badge className={STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-700'}>
                        {(c.status || '').charAt(0).toUpperCase() + (c.status || '').slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{c.subject}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {c.scheduledAt ? format(parseISO(c.scheduledAt), 'MMM d, yyyy HH:mm') : '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {c.recipientCount || 0} recipients
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onEdit(c)}>
                      <Edit className="w-3 h-3" /> Edit
                    </Button>
                    {c.status === 'scheduled' ? (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction(c, 'pause')}>
                        <Pause className="w-3 h-3" /> Pause
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAction(c, 'resume')}>Resume</Button>
                    )}
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleAction(c, 'send_now')}>
                      <Send className="w-3 h-3" /> Send Now
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-500" onClick={() => handleAction(c, 'cancel')}>
                      <X className="w-3 h-3" /> Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Calendar view
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Campaign Calendar</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCalMonth(m => subMonths(m, 1))}>‹</Button>
                <span className="text-sm font-medium min-w-[120px] text-center">{format(calMonth, 'MMMM yyyy')}</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCalMonth(m => addMonths(m, 1))}>›</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 mb-1">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calDays.map(day => {
                const dayCampaigns = campaignsOnDay(day);
                const inMonth = isSameMonth(day, calMonth);
                return (
                  <div key={day.toISOString()} className={`min-h-[72px] rounded-lg border p-1 ${!inMonth ? 'opacity-30 bg-muted/20' : 'bg-card'}`}>
                    <p className="text-xs font-medium mb-1">{format(day, 'd')}</p>
                    {dayCampaigns.map(c => (
                      <div key={c.id} className="bg-blue-100 text-blue-700 rounded px-1 py-0.5 text-[9px] font-medium truncate mb-0.5">{c.name}</div>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}