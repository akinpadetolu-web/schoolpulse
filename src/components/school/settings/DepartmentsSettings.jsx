import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function DepartmentsSettings({ school, onSaved }) {
  const [departments, setDepartments] = useState(school?.departments || []);
  const [newDept, setNewDept] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    const trimmed = newDept.trim();
    if (!trimmed) return;
    if (departments.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Department already exists');
      return;
    }
    setDepartments([...departments, trimmed]);
    setNewDept('');
  };

  const handleRemove = (dept) => {
    setDepartments(departments.filter(d => d !== dept));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.School.update(school.id, { departments });
      toast.success('Departments saved');
      onSaved?.();
    } catch (err) {
      toast.error('Failed to save departments');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="w-4 h-4" /> Departments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure the departments available for non-teaching staff. Only these will appear in staff department dropdowns.
        </p>

        <div className="flex gap-2">
          <Input
            value={newDept}
            onChange={e => setNewDept(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            placeholder="Add a department (e.g. Accounts, Security)"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={!newDept.trim()}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No departments configured yet</p>
          ) : (
            departments.map(dept => (
              <Badge key={dept} variant="secondary" className="gap-1 pr-1">
                {dept}
                <button type="button" onClick={() => handleRemove(dept)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))
          )}
        </div>

        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Save Departments
        </Button>
      </CardContent>
    </Card>
  );
}