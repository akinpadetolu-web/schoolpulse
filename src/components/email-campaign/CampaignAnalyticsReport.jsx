import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Send, Eye, MousePointer, AlertCircle, UserMinus, TrendingUp, Download } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, parseISO } from 'date-fns';

const COLORS = ['#6366f1', '#10b981', '#f59e0b'];

export default function CampaignAnalyticsReport({ campaign, onBack }) {
  const [activityFilter, setActivityFilter] = useState('all');

  const delivered = campaign.totalDelivered || 0;
  const bounced = campaign.totalBounced || 0;
  const opened = campaign.totalOpened || 0;
  const clicked = campaign.totalClicked || 0;
  const unsubscribed = campaign.totalUnsubscribed || 0;
  const sent = campaign.totalSent || delivered + bounced || 0;

  const deliveryRate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : '0.0';
  const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : '0.0';
  const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : campaign.openRate || '0.0';
  const clickRate = delivered > 0 ? ((clicked / delivered) * 100).toFixed(1) : campaign.clickRate || '0.0';
  const unsubRate = delivered > 0 ? ((unsubscribed / delivered) * 100).toFixed(2) : '0.00';

  const pieData = [
    { name: 'Delivered', value: delivered },
    { name: 'Bounced', value: bounced },
    { name: 'Unsubscribed', value: unsubscribed },
  ].filter(d => d.value > 0);

  // Mock opens over time (from recipientActivity if available)
  const activity = campaign.recipientActivity || [];
  const filteredActivity = activityFilter === 'all' ? activity
    : activityFilter === 'opened' ? activity.filter(a => a.opened)
    : activityFilter === 'not_opened' ? activity.filter(a => !a.opened)
    : activityFilter === 'clicked' ? activity.filter(a => a.clicked)
    : activityFilter === 'unsubscribed' ? activity.filter(a => a.unsubscribed)
    : activity;

  const metrics = [
    { label: 'Total Sent', value: sent, icon: Send, color: 'text-blue-600 bg-blue-50' },
    { label: 'Delivered', value: `${delivered} (${deliveryRate}%)`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Bounced', value: `${bounced} (${bounceRate}%)`, icon: AlertCircle, color: 'text-red-600 bg-red-50' },
    { label: 'Opened', value: `${opened} (${openRate}%)`, icon: Eye, color: 'text-purple-600 bg-purple-50' },
    { label: 'Clicked', value: `${clicked} (${clickRate}%)`, icon: MousePointer, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Unsubscribed', value: `${unsubscribed} (${unsubRate}%)`, icon: UserMinus, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div>
          <h2 className="text-xl font-bold">{campaign.name}</h2>
          <p className="text-sm text-muted-foreground">
            Campaign Report · Sent {campaign.sentAt ? format(parseISO(campaign.sentAt), 'MMM d, yyyy HH:mm') : '—'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto gap-1.5">
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map(m => (
          <Card key={m.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${m.color}`}>
                <m.icon className="w-4 h-4" />
              </div>
              <p className="font-bold text-sm leading-tight">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Delivery Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Engagement Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                { name: 'Delivered', value: delivered, fill: '#10b981' },
                { name: 'Opened', value: opened, fill: '#6366f1' },
                { name: 'Clicked', value: clicked, fill: '#f59e0b' },
                { name: 'Unsubscribed', value: unsubscribed, fill: '#ef4444' },
              ]} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[
                    { fill: '#10b981' }, { fill: '#6366f1' }, { fill: '#f59e0b' }, { fill: '#ef4444' }
                  ].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recipient Activity */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Recipient Activity</CardTitle>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recipients</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="not_opened">Not Opened</SelectItem>
                <SelectItem value="clicked">Clicked</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {activity.length === 0 ? 'No recipient activity data available yet.' : 'No recipients match this filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[600px]">
                <thead className="bg-muted/50">
                  <tr>
                    {['Name','Email','Delivered','Opened','Clicked','Unsubscribed'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredActivity.slice(0, 100).map((a, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium">{a.name || '—'}</td>
                      <td className="px-4 py-2 text-muted-foreground">{a.email}</td>
                      <td className="px-4 py-2">{a.delivered ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Yes</Badge> : <Badge variant="outline" className="text-[10px]">No</Badge>}</td>
                      <td className="px-4 py-2">{a.opened ? <Badge className="bg-purple-100 text-purple-700 text-[10px]">Yes</Badge> : <Badge variant="outline" className="text-[10px]">No</Badge>}</td>
                      <td className="px-4 py-2">{a.clicked ? <Badge className="bg-blue-100 text-blue-700 text-[10px]">Yes</Badge> : <Badge variant="outline" className="text-[10px]">No</Badge>}</td>
                      <td className="px-4 py-2">{a.unsubscribed ? <Badge className="bg-red-100 text-red-700 text-[10px]">Yes</Badge> : <Badge variant="outline" className="text-[10px]">No</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}