import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Search, AlertTriangle, Wrench, ShoppingCart, Box } from 'lucide-react';
import { toast } from 'sonner';
import InventoryTable from '@/components/inventory/InventoryTable';
import AssetDetailsDialog from '@/components/inventory/AssetDetailsDialog';
import MaintenanceRequestsPanel from '@/components/inventory/MaintenanceRequestsPanel';
import PurchaseRequestsPanel from '@/components/inventory/PurchaseRequestsPanel';

export default function AdminInventory() {
  const { schoolUser: user } = useSchoolAuth();
  const [assets, setAssets] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  useEffect(() => {
    loadData();
    const unsub = base44.entities.Inventory.subscribe(event => {
      if (event.type === 'create' || event.type === 'update') loadData();
    });
    return unsub;
  }, []);

  async function loadData() {
    try {
      const [a, m, p] = await Promise.all([
        base44.entities.Inventory.filter({ schoolId: user?.schoolId, isArchived: false }),
        base44.entities.MaintenanceRequest.filter({ schoolId: user?.schoolId, status: { $in: ['pending', 'in_progress'] } }),
        base44.entities.PurchaseRequest.filter({ schoolId: user?.schoolId, status: { $in: ['draft', 'submitted'] } }),
      ]);
      setAssets(a || []);
      setMaintenance(m || []);
      setPurchases(p || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                         a.assetId?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: assets.length,
    active: assets.filter(a => a.status === 'active').length,
    maintenance: maintenance.filter(m => m.status !== 'completed').length,
    pending: purchases.filter(p => ['draft', 'submitted'].includes(p.status)).length,
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Track school assets, equipment, and supplies</p>
        </div>
        <Button onClick={() => { setSelectedAsset(null); setShowAssetDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Asset
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Assets</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Box className="w-4 h-4" /> Active
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Wrench className="w-4 h-4" /> In Maintenance
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.maintenance}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <ShoppingCart className="w-4 h-4" /> Pending Orders
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="assets" className="w-full">
        <TabsList>
          <TabsTrigger value="assets"><Box className="w-4 h-4 mr-2" /> Assets</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="w-4 h-4 mr-2" /> Maintenance ({stats.maintenance})</TabsTrigger>
          <TabsTrigger value="purchases"><ShoppingCart className="w-4 h-4 mr-2" /> Purchases ({stats.pending})</TabsTrigger>
        </TabsList>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or asset ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md text-sm bg-background"
            >
              <option value="all">All Categories</option>
              <option value="classroom_equipment">Classroom Equipment</option>
              <option value="laboratory_equipment">Laboratory Equipment</option>
              <option value="sports_equipment">Sports Equipment</option>
              <option value="office_equipment">Office Equipment</option>
              <option value="furniture">Furniture</option>
              <option value="ict_equipment">ICT Equipment</option>
              <option value="cleaning_supplies">Cleaning Supplies</option>
              <option value="other">Other</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md text-sm bg-background"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="damaged">Damaged</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <InventoryTable
            assets={filteredAssets}
            onEdit={(asset) => { setSelectedAsset(asset); setShowAssetDialog(true); }}
            onRefresh={loadData}
          />
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <MaintenanceRequestsPanel
            requests={maintenance}
            onRefresh={loadData}
          />
        </TabsContent>

        {/* Purchases Tab */}
        <TabsContent value="purchases">
          <PurchaseRequestsPanel
            requests={purchases}
            onRefresh={loadData}
          />
        </TabsContent>
      </Tabs>

      {/* Asset Dialog */}
      <AssetDetailsDialog
        open={showAssetDialog}
        onOpenChange={setShowAssetDialog}
        asset={selectedAsset}
        onSave={loadData}
      />
    </div>
  );
}