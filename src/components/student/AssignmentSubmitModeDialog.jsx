import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import DigitalArtboard from '@/components/artboard/DigitalArtboard';

export default function AssignmentSubmitModeDialog({ open, onClose, assignment, onSubmit, subject = 'general' }) {
  const [mode, setMode] = useState('text'); // 'text' or 'artboard'
  const [textContent, setTextContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTextSubmit = async () => {
    if (!textContent.trim()) {
      alert('Please enter your response');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        mode: 'text',
        content: textContent,
        submittedAt: new Date().toISOString(),
      });
      setTextContent('');
      setMode('text');
      onClose();
    } catch (error) {
      console.error('Submit failed:', error);
      setIsSubmitting(false);
    }
  };

  const handleArtboardSave = async (blob) => {
    setIsSubmitting(true);
    try {
      // Upload blob as image
      const file = new File([blob], 'submission.png', { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const { fileUrl } = await uploadRes.json();

      await onSubmit({
        mode: 'artboard',
        imageUrl: fileUrl,
        submittedAt: new Date().toISOString(),
      });
      onClose();
    } catch (error) {
      console.error('Submit failed:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Assignment</DialogTitle>
          <DialogDescription>
            {assignment?.title} - Choose how you'd like to submit your work
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode} defaultValue="text">
          <TabsList className="w-full">
            <TabsTrigger value="text" className="flex-1">📝 Text Mode</TabsTrigger>
            <TabsTrigger value="artboard" className="flex-1">✏️ Draw/Artboard</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-4">
            <div className="p-4 bg-secondary/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                Type your answer using text. Supports basic formatting.
              </p>
              <textarea
                placeholder="Enter your response here..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full p-3 border rounded-lg min-h-[300px] font-sans text-sm"
                disabled={isSubmitting}
              />
              <Button
                onClick={handleTextSubmit}
                disabled={isSubmitting || !textContent.trim()}
                className="w-full mt-4 gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Text Response
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="artboard" className="space-y-4 mt-4">
            <div className="p-4 bg-secondary/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                Draw, write, or sketch your answer using the digital canvas.
              </p>
              <DigitalArtboard
                subject={subject}
                disabled={isSubmitting}
                onSave={handleArtboardSave}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}