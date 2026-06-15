import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_TYPE = { name: '', description: '', colorCode: '#6366f1', isMandatory: true, defaultAmount: 0 };
const EMPTY_STRUCTURE = { name: '', academicYear: '', term: '', applyToAllClasses: true, feeItems: [], status: 'draft', totalAmount: 0 };

export default function AdminFeeManagement() {
  const { schoolUser: user } = useSchoolAuth();
  const [feeTypes, setFeeTypes] = useState([]);
  const [structures, setStructures] = useState([]);
  const [tab, setTab] = useState('types');
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE);
  const [showStructureDialog, setShowStructureDialog] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [structureForm, setStructureForm] = useState(EMPTY_STRUCTURE);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [user?.schoolId]);

  async function loadAll() {
    if (!user?.schoolId) return;
    try {
      const [ft, fs] = await Promise.all([
        base44.entities.FeeType.filter({ schoolId: user.schoolId }),
        base44.entities.FeeStructure.filter({ schoolId: user.schoolId }),
      ]);
      setFeeTypes(ft);
      setStructures(fs);
    } catch (e) {}
    setLoading(false);
  }

  function openNewType() { setEditingType(null); setTypeForm(EMPTY_TYPE); setShowTypeDialog(true); }
  function openEditType(t) { setEditingType(t); setTypeForm({ name: t.name, description: t.description || '', colorCode: t.colorCode || '#6366f1', isMandatory: t.isMandatory !== false, defaultAmount: t.defaultAmount || 0 }); setShowTypeDialog(true); }

  async function saveType() {
    if (!typeForm.name) { toast.error('Name is required'); return; }
    if (editingType) {
      await base44.entities.FeeType.update(editingType.id, { ...typeForm, schoolId: user.schoolId });
      toast.success('Fee type updated');
    } else {
      await base44.entities.FeeType.create({ ...typeForm, schoolId: user.schoolId });
      toast.success('Fee type created');
    }
    setShowTypeDialog(false);
    loadAll();
  }

  async function deleteType(id) {
    if (!confirm('Delete this fee type?')) return;
    await base44.entities.FeeType.delete(id);
    toast.success('Deleted');
    loadAll();
  }

  function openNewStructure() { setEditingStructure(null); setStructureForm(EMPTY_STRUCTURE); setShowStructureDialog(true); }
  function openEditStructure(s) { setEditingStructure(s); setStructureForm({ name: s.name, academicYear: s.academicYear || '', term: s.term || '', applyToAllClasses: s.applyToAllClasses !== false, feeItems: s.feeItems || [], status: s.status || 'draft', totalAmount: s.totalAmount || 0 }); setShowStructureDialog(true); }

  async function saveStructure() {
    if (!structureForm.name) { toast.error('Name is required'); return; }
    const total = (structureForm.feeItems || []).reduce((s, i) => s + (+i.amount || 0), 0);
    const data = { ...structureForm, schoolId: user.schoolId, totalAmount: total };
    if (editingStructure) {
      await base44.entities.FeeStructure.update(editingStructure.id, data);
      toast.success('Fee structure updated');
    } else {
      await base44.entities.FeeStructure.create(data);
      toast.success('Fee structure created');
    }
    setShowStructureDialog(false);
    loadAll();
  }

  async function deleteStructure(id) {
    if (!confirm('Delete this fee structure?')) return;
    await base44.entities.FeeStructure.delete(id);
    toast.success('Deleted');
    loadAll();
  }

  function addFeeItem() {
    const item = { id: Date.now().toString(), feeTypeId: '', feeTypeName: '', amount: 0, isMandatory: true, paymentType: 'full' };
    setStructureForm(f => ({ ...f, feeItems: [...(f.feeItems || []), item] }));
  }

  function updateFeeItem(idx, field, value) {
    setStructureForm(f => {
      const items = [...f.feeItems];
      items[idx] = { ...items[idx], [field]: value };
      if (field === 'feeTypeId') {
        const ft = feeTypes.find(t => t.id === value);
        if (ft) {
          items[idx].feeTypeName = ft.name;
          if (ft.defaultAmount > 0) items[idx].amount = ft.defaultAmount;
        }
      }
      return { ...f, feeItems: items };
    });
  }

  function removeFeeItem(idx) {
    setStructureForm(f => ({ ...f, feeItems: f.feeItems.filter((_, i) => i !== idx) }));
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Fee Management</h1><p className="text-sm text-muted-foreground mt-1">Manage fee types and structures</p></div>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'types' ? 'default' : 'outline'} onClick={() => setTab('types')}>Fee Types</Button>
        <Button variant={tab === 'structures' ? 'default' : 'outline'} onClick={() => setTab('structures')}>Fee Structures</Button>
      </div>

      {tab === 'types' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={openNewType}><Plus className="w-4 h-4 mr-2" />New Fee Type</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {feeTypes.map(ft => (
              <Card key={ft.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: ft.colorCode || '#6366f1' }} />
                      <span className="font-semibold">{ft.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditType(ft)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteType(ft.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  {ft.description && <p className="text-sm text-muted-foreground mt-2">{ft.description}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant={ft.isMandatory ? 'default' : 'outline'}>{ft.isMandatory ? 'Mandatory' : 'Optional'}</Badge>
                    {ft.defaultAmount > 0 && <span className="text-sm font-bold">₦{(ft.defaultAmount || 0).toLocaleString()}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {feeTypes.length === 0 && <p className="text-muted-foreground col-span-3 text-center py-8">No fee types yet.</p>}
          </div>
        </div>
      )}

      {tab === 'structures' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={openNewStructure}><Plus className="w-4 h-4 mr-2" />New Fee Structure</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {structures.map(s => (
              <Card key={s.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.term} · {s.academicYear}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditStructure(s)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteStructure(s.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant={s.status === 'active' ? 'default' : 'outline'}>{s.status}</Badge>
                    <span className="text-sm font-bold">₦{(s.totalAmount || 0).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{(s.feeItems || []).length} fee items</p>
                </CardContent>
              </Card>
            ))}
            {structures.length === 0 && <p className="text-muted-foreground col-span-3 text-center py-8">No fee structures yet.</p>}
          </div>
        </div>
      )}

      {/* Fee Type Dialog */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingType ? 'Edit Fee Type' : 'New Fee Type'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-sm mb-1 block">Name *</Label><Input value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label className="text-sm mb-1 block">Description</Label><Input value={typeForm.description} onChange={e => setTypeForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label className="text-sm mb-1 block">Default Amount (₦)</Label><Input type="number" min="0" value={typeForm.defaultAmount} onChange={e => setTypeForm(f => ({ ...f, defaultAmount: +e.target.value }))} placeholder="0" /></div>
            <div><Label className="text-sm mb-1 block">Color</Label><Input type="color" value={typeForm.colorCode} onChange={e => setTypeForm(f => ({ ...f, colorCode: e.target.value }))} className="h-9 w-20 p-1" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="mandatory" checked={typeForm.isMandatory} onChange={e => setTypeForm(f => ({ ...f, isMandatory: e.target.checked }))} />
              <Label htmlFor="mandatory">Mandatory</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowTypeDialog(false)}>Cancel</Button>
              <Button onClick={saveType}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fee Structure Dialog */}
      <Dialog open={showStructureDialog} onOpenChange={setShowStructureDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingStructure ? 'Edit Fee Structure' : 'New Fee Structure'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm mb-1 block">Name *</Label><Input value={structureForm.name} onChange={e => setStructureForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label className="text-sm mb-1 block">Status</Label>
                <Select value={structureForm.status} onValueChange={v => setStructureForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-sm mb-1 block">Academic Year</Label><Input value={structureForm.academicYear} onChange={e => setStructureForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="e.g. 2025/2026" /></div>
              <div><Label className="text-sm mb-1 block">Term</Label><Input value={structureForm.term} onChange={e => setStructureForm(f => ({ ...f, term: e.target.value }))} placeholder="e.g. Term 1" /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Fee Items</Label>
                <Button size="sm" variant="outline" onClick={addFeeItem}><Plus className="w-3 h-3 mr-1" />Add Item</Button>
              </div>
              {(structureForm.feeItems || []).map((item, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 mb-2 items-center">
                  <Select value={item.feeTypeId} onValueChange={v => updateFeeItem(idx, 'feeTypeId', v)}>
                    <SelectTrigger><SelectValue placeholder="Fee type" /></SelectTrigger>
                    <SelectContent>{feeTypes.map(ft => <SelectItem key={ft.id} value={ft.id}>{ft.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" placeholder="Amount" value={item.amount} onChange={e => updateFeeItem(idx, 'amount', +e.target.value)} />
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeFeeItem(idx)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              {(structureForm.feeItems || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No items added yet</p>}
              {(structureForm.feeItems || []).length > 0 && (
                <p className="text-sm font-bold text-right mt-2">Total: ₦{(structureForm.feeItems || []).reduce((s, i) => s + (+i.amount || 0), 0).toLocaleString()}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowStructureDialog(false)}>Cancel</Button>
              <Button onClick={saveStructure}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}