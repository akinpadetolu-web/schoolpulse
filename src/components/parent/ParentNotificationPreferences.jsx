import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Bell, Loader2, Plus, Trash2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function ParentNotificationPreferences() {
  const { schoolUser: user } = useSchoolAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceToken, setDeviceToken] = useState('');

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    try {
      const tokens = await base44.entities.ParentDeviceToken.filter({
        parentId: user?.id
      });
      setDevices(tokens || []);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
    setLoading(false);
  }

  async function handleAddDevice(e) {
    e.preventDefault();
    if (!deviceName || !deviceToken) {
      toast.error('Device name and token are required');
      return;
    }

    setSaving(true);
    try {
      await base44.entities.ParentDeviceToken.create({
        schoolId: user?.schoolId,
        parentId: user?.id,
        parentEmail: user?.email,
        deviceName,
        deviceToken,
        isActive: true,
        notificationTypes: {
          gradeUpdates: true,
          assignmentScores: true,
          announcements: true,
          gradeAlerts: true
        }
      });
      toast.success('Device registered successfully');
      setDeviceName('');
      setDeviceToken('');
      setShowAddDevice(false);
      loadDevices();
    } catch (error) {
      toast.error('Failed to register device');
    }
    setSaving(false);
  }

  async function toggleDevice(deviceId, isActive) {
    try {
      await base44.entities.ParentDeviceToken.update(deviceId, { isActive: !isActive });
      toast.success(`Device ${!isActive ? 'enabled' : 'disabled'}`);
      loadDevices();
    } catch (error) {
      toast.error('Failed to update device');
    }
  }

  async function updateNotificationPreference(deviceId, prefKey, value) {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    const newPrefs = { ...device.notificationTypes };
    newPrefs[prefKey] = value;

    try {
      await base44.entities.ParentDeviceToken.update(deviceId, {
        notificationTypes: newPrefs
      });
      toast.success('Preference updated');
      loadDevices();
    } catch (error) {
      toast.error('Failed to update preference');
    }
  }

  async function deleteDevice(deviceId) {
    if (!confirm('Delete this device from notifications?')) return;
    try {
      await base44.entities.ParentDeviceToken.delete(deviceId);
      toast.success('Device removed');
      loadDevices();
    } catch (error) {
      toast.error('Failed to delete device');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifications
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage devices and notification preferences for grade updates and assignments
          </p>
        </div>
        <Button onClick={() => setShowAddDevice(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Register Device
        </Button>
      </div>

      {devices.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No devices registered yet.</p>
            <p className="text-xs mt-2">Register a device to receive push notifications.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {devices.map(device => (
            <Card key={device.id} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-base">{device.deviceName}</CardTitle>
                    {device.isActive ? (
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    ) : (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDevice(device.id, device.isActive)}
                    >
                      {device.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteDevice(device.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Notification Types</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Grade Updates</span>
                      <Switch
                        checked={device.notificationTypes?.gradeUpdates !== false}
                        onCheckedChange={(val) =>
                          updateNotificationPreference(device.id, 'gradeUpdates', val)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Assignment Scores</span>
                      <Switch
                        checked={device.notificationTypes?.assignmentScores !== false}
                        onCheckedChange={(val) =>
                          updateNotificationPreference(device.id, 'assignmentScores', val)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Grade Alerts (Low Scores)</span>
                      <Switch
                        checked={device.notificationTypes?.gradeAlerts !== false}
                        onCheckedChange={(val) =>
                          updateNotificationPreference(device.id, 'gradeAlerts', val)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Announcements</span>
                      <Switch
                        checked={device.notificationTypes?.announcements !== false}
                        onCheckedChange={(val) =>
                          updateNotificationPreference(device.id, 'announcements', val)
                        }
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Token: {device.deviceToken.substring(0, 20)}...
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddDevice} onOpenChange={setShowAddDevice}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Register Device for Push Notifications</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDevice} className="space-y-4">
            <div>
              <Label className="text-sm">Device Name *</Label>
              <Input
                placeholder="e.g., iPhone, Android Phone"
                value={deviceName}
                onChange={e => setDeviceName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm">Device Token *</Label>
              <Input
                placeholder="FCM or APNs device token"
                value={deviceToken}
                onChange={e => setDeviceToken(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your device will provide this token through the app's notification service
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Register Device
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}