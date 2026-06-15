import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const statusColors = {
  active: 'bg-green-100 text-green-700',
  damaged: 'bg-red-100 text-red-700',
  maintenance: 'bg-amber-100 text-amber-700',
  retired: 'bg-slate-100 text-slate-700',
  lost: 'bg-destructive/10 text-destructive',
};

const categoryLabel = {
  classroom_equipment: 'Classroom',
  laboratory_equipment: 'Laboratory',
  sports_equipment: 'Sports',
  office_equipment: 'Office',
  furniture: 'Furniture',
  ict_equipment: 'ICT',
  cleaning_supplies: 'Cleaning',
  other: 'Other',
};

export default function InventoryTable({ assets, onEdit, onRefresh }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await base44.entities.Inventory.update(deleteConfirm.id, { isArchived: true });
      toast.success('Asset archived');
      onRefresh?.();
      setDeleteConfirm(null);
    } catch (error) {
      toast.error('Failed to archive asset');
    }
  };

  if (assets.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center text-muted-foreground">
          <p>No assets found. Create your first asset to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {assets.map(asset => (
          <Card key={asset.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold">{asset.name}</h3>
                    <Badge className={statusColors[asset.status]}>{asset.status}</Badge>
                    <Badge variant="outline" className="text-xs">{categoryLabel[asset.category]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">ID:</span> {asset.assetId} • <span className="font-medium">Qty:</span> {asset.quantity} {asset.unit || 'units'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Location:</span> {asset.location}
                    {asset.purchaseDate && <span className="ml-4"><span className="font-medium">Purchased:</span> {asset.purchaseDate}</span>}
                  </p>
                  {asset.purchasePrice && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">Value:</span> {asset.purchaseCurrency} {asset.purchasePrice.toLocaleString()}
                      {asset.currentValue && asset.currentValue !== asset.purchasePrice && (
                        <span className="ml-2 text-amber-600">(Current: {asset.purchaseCurrency} {asset.currentValue.toLocaleString()})</span>
                      )}
                    </p>
                  )}
                  {asset.notes && <p className="text-xs text-muted-foreground mt-2 italic">{asset.notes}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => onEdit(asset)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm(asset)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" /> Archive Asset?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will archive "{deleteConfirm?.name}". You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Archive</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}