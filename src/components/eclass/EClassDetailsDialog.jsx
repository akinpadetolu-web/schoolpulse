import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';

export default function EClassDetailsDialog({ open, onOpenChange, eclass, onSave }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meetLink: '',
    startDateTime: '',
    endDateTime: '',
  });

  useEffect(() => {
    if (eclass) {
      setFormData({
        title: eclass.title || '',
        description: eclass.description || '',
        meetLink: eclass.meetLink || '',
        startDateTime: eclass.startDateTime?.slice(0, 16) || '',
        endDateTime: eclass.endDateTime?.slice(0, 16) || '',
      });
    }
  }, [eclass, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }
    if (!formData.meetLink.trim()) {
      toast({ title: 'Error', description: 'Meeting link is required', variant: 'destructive' });
      return;
    }
    if (!formData.startDateTime) {
      toast({ title: 'Error', description: 'Start date/time is required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        meetLink: formData.meetLink,
        startDateTime: new Date(formData.startDateTime).toISOString(),
        endDateTime: formData.endDateTime ? new Date(formData.endDateTime).toISOString() : '',
      };

      if (eclass?.id) {
        await base44.entities.VirtualClass.update(eclass.id, payload);
        toast({ title: 'Success', description: 'E-Class details updated' });
      } else {
        await base44.entities.VirtualClass.create(payload);
        toast({ title: 'Success', description: 'E-Class created successfully' });
      }

      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save E-Class details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{eclass?.id ? 'Edit E-Class Details' : 'Create E-Class'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <Input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="E-Class title"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Topics or description"
              className="resize-none h-20"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Meeting Link *</label>
            <Input
              name="meetLink"
              value={formData.meetLink}
              onChange={handleChange}
              placeholder="Google Meet or other video link"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Start Date & Time *</label>
            <Input
              name="startDateTime"
              type="datetime-local"
              value={formData.startDateTime}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">End Date & Time</label>
            <Input
              name="endDateTime"
              type="datetime-local"
              value={formData.endDateTime}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              {loading ? 'Saving...' : 'Save Details'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}