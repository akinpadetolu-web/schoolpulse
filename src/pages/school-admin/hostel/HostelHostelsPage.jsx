import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { useHostelData } from '@/hooks/useHostelData';
import HostelManagementPanel from '@/components/hostel/HostelManagementPanel';

export default function HostelHostelsPage() {
  const { hostels, loading, refresh } = useHostelData();
  const [search, setSearch] = useState('');

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hostels</h1>
        <p className="text-muted-foreground">Manage hostel facilities and configurations</p>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search hostels..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <HostelManagementPanel hostels={hostels} search={search} onRefresh={refresh} />
    </div>
  );
}