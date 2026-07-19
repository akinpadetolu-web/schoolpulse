import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { getDefaultFeatures, clearFeatureCache } from '@/lib/featureToggleManager';
import { PORTAL_FEATURES, PORTAL_LABELS, ALL_FEATURES } from '@/lib/featureCatalog';

export default function PortalFeaturePanel({ school, role }) {
  const [toggle, setToggle] = useState(null);
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const featureIds = PORTAL_FEATURES[role] || [];
  const featureList = featureIds
    .map(id => ALL_FEATURES.find(f => f.id === id))
    .filter(Boolean);

  useEffect(() => {
    if (school?.id && role) loadData();
  }, [school?.id, role]);

  async function loadData() {
    setLoading(true);
    try {
      const existing = await base44.entities.FeatureToggle.filter({
        schoolId: school.id,
        role,
        isActive: true,
      });
      const roleToggle = (existing || []).find(t => !t.userId);
      if (roleToggle) {
        setToggle(roleToggle);
        setFeatures(roleToggle.features || {});
      } else {
        setToggle(null);
        setFeatures(getDefaultFeatures(role));
      }
    } catch {
      setFeatures(getDefaultFeatures(role));
    }
    setLoading(false);
  }

  function handleToggle(featureId, checked) {
    setFeatures(prev => ({ ...prev, [featureId]: checked }));
  }

  function handleSelectAll() {
    const updated = { ...features };
    featureIds.forEach(id => { updated[id] = true; });
    setFeatures(updated);
  }

  function handleClearAll() {
    const updated = { ...features };
    featureIds.forEach(id => { updated[id] = false; });
    setFeatures(updated);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        schoolId: school.id,
        schoolName: school.schoolName,
        role,
        features,
        isActive: true,
      };
      if (toggle?.id) {
        await base44.entities.FeatureToggle.update(toggle.id, payload);
      } else {
        const created = await base44.entities.FeatureToggle.create(payload);
        setToggle(created);
      }
      clearFeatureCache();
      toast.success(`${PORTAL_LABELS[role]} features saved`);
    } catch {
      toast.error('Failed to save features');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const enabledCount = featureIds.filter(id => features[id]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {enabledCount} of {featureIds.length} features enabled
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={handleSelectAll}>
            Enable All
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClearAll}>
            Disable All
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        {featureList.map(f => (
          <Card key={f.id} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              <Switch
                checked={features[f.id] || false}
                onCheckedChange={checked => handleToggle(f.id, checked)}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Save {PORTAL_LABELS[role]} Configuration
      </Button>
    </div>
  );
}