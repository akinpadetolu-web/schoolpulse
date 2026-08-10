import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { clearFeatureCache } from '@/lib/featureToggleManager';
import { FEATURE_TREE, getDefaultEnabled } from '@/lib/featureHierarchy';

const GROUP_ICONS = FEATURE_TREE.reduce((acc, g) => {
  if (g.icon) acc[g.id] = g.icon;
  return acc;
}, {});

export default function SchoolFeatureToggles({ school }) {
  const [toggle, setToggle] = useState(null);
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    if (school?.id) loadData();
  }, [school?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const existing = await base44.entities.FeatureToggle.filter({
        schoolId: school.id,
        role: 'admin',
        isActive: true,
      });
      const roleToggle = (existing || []).find(t => !t.userId);
      if (roleToggle) {
        setToggle(roleToggle);
        setFeatures({ ...getDefaultEnabled(), ...(roleToggle.features || {}) });
      } else {
        setToggle(null);
        setFeatures(getDefaultEnabled());
      }
    } catch {
      setFeatures(getDefaultEnabled());
    }
    setLoading(false);
  }

  function setKey(key, value) {
    setFeatures(prev => ({ ...prev, [key]: value }));
  }

  function setGroupAll(group, value) {
    const updates = { ...features };
    if (group.masterId) updates[group.masterId] = value;
    for (const f of group.features) {
      updates[f.id] = value;
      (f.subFeatures || []).forEach(s => { updates[s.id] = value; });
    }
    setFeatures(updates);
  }

  function setAll(value) {
    const updates = {};
    Object.keys(features).forEach(k => { updates[k] = value; });
    setFeatures(updates);
  }

  function toggleGroup(id) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        schoolId: school.id,
        schoolName: school.schoolName,
        role: 'admin',
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
      toast.success('Feature configuration saved');
    } catch {
      toast.error('Failed to save feature configuration');
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

  const allKeys = Object.keys(features);
  const enabledCount = allKeys.filter(k => features[k]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {enabledCount} of {allKeys.length} features & sub-features enabled for {school?.schoolName}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setAll(true)}>Enable All</Button>
          <Button size="sm" variant="ghost" onClick={() => setAll(false)}>Disable All</Button>
        </div>
      </div>

      <div className="space-y-3">
        {FEATURE_TREE.map(group => {
          const GroupIcon = GROUP_ICONS[group.id];
          const groupKeys = [
            ...(group.masterId ? [group.masterId] : []),
            ...group.features.flatMap(f => [f.id, ...(f.subFeatures || []).map(s => s.id)]),
          ];
          const groupEnabled = groupKeys.filter(k => features[k]).length;
          const allGroupOn = groupEnabled === groupKeys.length;
          const isCollapsed = collapsed[group.id];

          return (
            <Card key={group.id} className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-3 border-b">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    {GroupIcon && <GroupIcon className="w-4 h-4 text-primary shrink-0" />}
                    <span className="font-semibold text-sm truncate">{group.label}</span>
                    <span className="text-xs text-muted-foreground ml-1">{groupEnabled}/{groupKeys.length}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setGroupAll(group, !allGroupOn)}>
                      {allGroupOn ? 'Disable all' : 'Enable all'}
                    </Button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="divide-y">
                    {group.masterId && (
                      <div className="flex items-center justify-between p-3 bg-primary/5">
                        <div>
                          <p className="font-semibold text-sm">Master toggle — {group.label}</p>
                          <p className="text-xs text-muted-foreground">Enable or disable the entire module</p>
                        </div>
                        <Switch
                          checked={features[group.masterId] || false}
                          onCheckedChange={c => setKey(group.masterId, c)}
                        />
                      </div>
                    )}
                    {group.features.map(f => (
                      <div key={f.id}>
                        <div className="flex items-center justify-between p-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{f.label}</p>
                            <p className="text-xs text-muted-foreground">{f.description}</p>
                          </div>
                          <Switch
                            checked={features[f.id] || false}
                            onCheckedChange={c => setKey(f.id, c)}
                          />
                        </div>
                        {f.subFeatures && f.subFeatures.length > 0 && (
                          <div className="pl-6 pb-2 space-y-1">
                            {f.subFeatures.map(s => (
                              <div key={s.id} className="flex items-center justify-between py-1.5 px-3 rounded-md hover:bg-accent/40">
                                <div className="min-w-0">
                                  <p className="text-sm">{s.label}</p>
                                  <p className="text-xs text-muted-foreground">{s.description}</p>
                                </div>
                                <Switch
                                  checked={features[s.id] || false}
                                  onCheckedChange={c => setKey(s.id, c)}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Save Feature Configuration
      </Button>
    </div>
  );
}