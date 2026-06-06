import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, LayoutTemplate, BarChart2, Calendar, Mail, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

import CampaignKPICards from '@/components/email-campaign/CampaignKPICards';
import CampaignsTable from '@/components/email-campaign/CampaignsTable';
import CampaignBuilder from '@/components/email-campaign/CampaignBuilder';
import CampaignAnalyticsReport from '@/components/email-campaign/CampaignAnalyticsReport';
import TemplateManager from '@/components/email-campaign/TemplateManager';
import ScheduledCampaignsView from '@/components/email-campaign/ScheduledCampaignsView';

// VIEW MODES: 'dashboard' | 'builder' | 'report' | 'templates' | 'scheduled'
export default function AdminEmailCampaign() {
  const { schoolUser: user } = useSchoolAuth();
  const [view, setView] = useState('dashboard');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { load(); }, []);

  async function load() {
    const list = await base44.entities.EmailCampaign.filter({ schoolId: user?.schoolId });
    setCampaigns(list || []);
    setLoading(false);
  }

  async function handleDuplicate(c) {
    const { id, created_date, updated_date, sentAt, ...rest } = c;
    await base44.entities.EmailCampaign.create({ ...rest, name: `${c.name} (Copy)`, status: 'draft', totalSent: 0, totalDelivered: 0, totalBounced: 0, totalOpened: 0, totalClicked: 0, openRate: 0, clickRate: 0, deliveryRate: 0 });
    toast.success('Campaign duplicated');
    load();
  }

  async function handleDelete(c) {
    if (!window.confirm(`Delete campaign "${c.name}"?`)) return;
    await base44.entities.EmailCampaign.delete(c.id);
    toast.success('Campaign deleted');
    load();
  }

  function handleViewReport(c) {
    setSelectedCampaign(c);
    setView('report');
  }

  function handleEdit(c) {
    setEditingCampaign(c);
    setView('builder');
  }

  function handleUseTemplate(t) {
    setEditingCampaign({ emailBody: t.emailBody, templateId: t.id, templateName: t.name });
    setView('builder');
  }

  const filtered = campaigns.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.subject?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  // Sub-view routing
  if (view === 'builder') {
    return (
      <CampaignBuilder
        schoolUser={user}
        existingCampaign={editingCampaign}
        onCancel={() => { setView('dashboard'); setEditingCampaign(null); }}
        onCreated={() => { setView('dashboard'); setEditingCampaign(null); load(); }}
      />
    );
  }

  if (view === 'report' && selectedCampaign) {
    return (
      <CampaignAnalyticsReport
        campaign={selectedCampaign}
        onBack={() => { setView('dashboard'); setSelectedCampaign(null); }}
      />
    );
  }

  if (view === 'templates') {
    return (
      <TemplateManager
        schoolUser={user}
        onBack={() => setView('dashboard')}
        onUseTemplate={(t) => { setView('dashboard'); handleUseTemplate(t); }}
      />
    );
  }

  if (view === 'scheduled') {
    return (
      <ScheduledCampaignsView
        campaigns={campaigns}
        onBack={() => setView('dashboard')}
        onEdit={handleEdit}
        onRefresh={load}
      />
    );
  }

  // Dashboard
  const scheduledCount = campaigns.filter(c => c.status === 'scheduled').length;
  const draftCount = campaigns.filter(c => c.status === 'draft').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" /> Email Campaigns
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Professional email marketing for your school community</p>
        </div>
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setEditingCampaign(null); setView('builder'); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Create Campaign
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setView('templates')}>
            <LayoutTemplate className="w-4 h-4" /> Templates
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setView('scheduled')}>
            <Calendar className="w-4 h-4" />
            Scheduled
            {scheduledCount > 0 && <span className="ml-1 bg-blue-500 text-white text-[10px] rounded-full px-1.5">{scheduledCount}</span>}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <CampaignKPICards campaigns={campaigns} />

      {/* Campaigns Table */}
      <Card className="border-0 shadow-sm">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-base flex-1">All Campaigns</h2>
          {draftCount > 0 && (
            <span className="text-xs text-muted-foreground">{draftCount} draft{draftCount > 1 ? 's' : ''}</span>
          )}
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search campaigns…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardContent className="p-0">
          <CampaignsTable
            campaigns={filtered}
            onViewReport={handleViewReport}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
}