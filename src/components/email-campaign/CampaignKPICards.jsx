import { Card, CardContent } from '@/components/ui/card';
import { Mail, Send, Eye, MousePointer, TrendingUp, Users, AlertCircle, UserMinus } from 'lucide-react';

export default function CampaignKPICards({ campaigns }) {
  const sent = campaigns.filter(c => c.status === 'sent');
  const totalSent = sent.reduce((s, c) => s + (c.totalSent || 0), 0);
  const totalDelivered = sent.reduce((s, c) => s + (c.totalDelivered || 0), 0);
  const totalBounced = sent.reduce((s, c) => s + (c.totalBounced || 0), 0);
  const totalUnsubscribed = sent.reduce((s, c) => s + (c.totalUnsubscribed || 0), 0);
  const avgOpenRate = sent.length > 0 ? (sent.reduce((s, c) => s + (c.openRate || 0), 0) / sent.length).toFixed(1) : '0.0';
  const avgClickRate = sent.length > 0 ? (sent.reduce((s, c) => s + (c.clickRate || 0), 0) / sent.length).toFixed(1) : '0.0';
  const avgDeliveryRate = sent.length > 0 ? (sent.reduce((s, c) => s + (c.deliveryRate || 0), 0) / sent.length).toFixed(1) : '0.0';

  const kpis = [
    { label: 'Total Campaigns', value: campaigns.length, icon: Mail, color: 'text-blue-600 bg-blue-50' },
    { label: 'Emails Delivered', value: totalDelivered.toLocaleString(), icon: Send, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Avg Open Rate', value: `${avgOpenRate}%`, icon: Eye, color: 'text-purple-600 bg-purple-50' },
    { label: 'Avg Click Rate', value: `${avgClickRate}%`, icon: MousePointer, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Avg Delivery Rate', value: `${avgDeliveryRate}%`, icon: TrendingUp, color: 'text-cyan-600 bg-cyan-50' },
    { label: 'Total Recipients', value: totalSent.toLocaleString(), icon: Users, color: 'text-orange-600 bg-orange-50' },
    { label: 'Bounced', value: totalBounced.toLocaleString(), icon: AlertCircle, color: 'text-red-600 bg-red-50' },
    { label: 'Unsubscribed', value: totalUnsubscribed.toLocaleString(), icon: UserMinus, color: 'text-slate-600 bg-slate-50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
      {kpis.map(k => (
        <Card key={k.label} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${k.color}`}>
              <k.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold leading-tight">{k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{k.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}