import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, AlertCircle, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function QuizBulkImportDialog({ open, onOpenChange, onImport }) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('manual'); // manual or ai
  const [format, setFormat] = useState('csv'); // csv, json, pdf, docx
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (mode === 'ai' && (format === 'pdf' || format === 'docx' || format === 'txt')) {
      // Upload file for AI processing
      try {
        setLoading(true);
        const res = await base44.integrations.Core.UploadFile({ file });
        setFileUrl(res.file_url);
        setError('');
        toast.success('File uploaded. Click "Generate with AI" to create questions.');
      } catch (err) {
        setError('Failed to upload file');
      } finally {
        setLoading(false);
      }
    } else {
      // Manual parsing
      const reader = new FileReader();
      reader.onload = (event) => {
        setContent(event.target?.result || '');
        setError('');
      };
      reader.readAsText(file);
    }
  };

  const parseQuestions = () => {
    try {
      setError('');
      let questions = [];

      if (format === 'csv') {
        const lines = content.trim().split('\n');
        if (lines.length < 2) throw new Error('CSV must have at least a header and one question');

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const qIdx = headers.indexOf('question');
        const tIdx = headers.indexOf('type');
        const ansIdx = headers.indexOf('answer');
        const optIdx = headers.indexOf('options');
        const pIdx = headers.indexOf('points');

        if (qIdx === -1) throw new Error('CSV must have "question" column');
        if (tIdx === -1) throw new Error('CSV must have "type" column (multiple_choice, true_false, short_answer)');

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim());
          if (parts.length < 2) continue;

          const type = parts[tIdx]?.toLowerCase() || 'short_answer';
          const q = {
            question: parts[qIdx],
            type,
            points: Number(parts[pIdx]) || 1,
            correctAnswer: parts[ansIdx] || '',
            options: parts[optIdx] ? parts[optIdx].split('|').map(o => o.trim()) : [],
          };
          questions.push(q);
        }
      } else {
        // JSON format
        const parsed = JSON.parse(content);
        questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
        if (!Array.isArray(questions)) throw new Error('JSON must be an array of questions or have a "questions" property');
      }

      if (questions.length === 0) throw new Error('No questions found in file');
      return questions;
    } catch (err) {
      setError(err.message || 'Failed to parse questions');
      throw err;
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      const questions = parseQuestions();

      // Use AI to arrange and validate questions
      const response = await base44.functions.invoke('arrangeQuizQuestions', {
        questions,
      });

      if (response.data?.arranged) {
        onImport(response.data.arranged);
        setContent('');
        setError('');
        onOpenChange(false);
        toast.success(`Imported and arranged ${response.data.arranged.length} questions`);
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSmartImport = async () => {
    if (!fileUrl) {
      setError('Please upload a file first');
      return;
    }

    try {
      setLoading(true);
      const response = await base44.functions.invoke('smartQuizImport', {
        fileUrl,
        fileType: format,
        topic,
        subjectName: ''
      });

      if (response.data?.questions) {
        onImport(response.data.questions);
        setFileUrl('');
        setTopic('');
        setContent('');
        setError('');
        onOpenChange(false);
        toast.success(`Generated ${response.data.questions.length} questions with Gemini Pro`);
      } else {
        setError(response.data?.error || 'Failed to generate questions');
      }
    } catch (err) {
      console.error('Smart import error:', err);
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selector */}
          <div>
            <Label>Import Method</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={mode === 'manual' ? 'default' : 'outline'}
                onClick={() => { setMode('manual'); setError(''); }}
                disabled={loading}
              >
                Manual Entry
              </Button>
              <Button
                variant={mode === 'ai' ? 'default' : 'outline'}
                onClick={() => { setMode('ai'); setError(''); }}
                disabled={loading}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                AI Generator
              </Button>
            </div>
          </div>

          {mode === 'manual' && (
            <>
              {/* Format Selector */}
              <div>
                <Label>Format</Label>
                <div className="flex gap-2 mt-2">
                  {['csv', 'json'].map(f => (
                    <Button
                      key={f}
                      variant={format === f ? 'default' : 'outline'}
                      onClick={() => { setFormat(f); setContent(''); setError(''); }}
                      disabled={loading}
                    >
                      {f.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode === 'ai' && (
            <>
              {/* AI Format Selector */}
              <div>
                <Label>Document Type</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {['pdf', 'docx', 'txt'].map(f => (
                    <Button
                      key={f}
                      variant={format === f ? 'default' : 'outline'}
                      onClick={() => { setFormat(f); setFileUrl(''); setError(''); }}
                      disabled={loading}
                      size="sm"
                    >
                      {f.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Topic Input */}
              <div>
                <Label>Topic/Subject (optional)</Label>
                <Input
                  placeholder="e.g. Biology - Photosynthesis, English - Shakespeare"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  disabled={loading}
                />
              </div>
            </>
          )}

          {mode === 'manual' ? (
            <>
              {/* Manual File Upload */}
              <div>
                <Label>Upload or Paste Content</Label>
                <div className="mt-2 space-y-2">
                  <Input
                    type="file"
                    accept={format === 'csv' ? '.csv' : '.json'}
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                  <div className="relative">
                    <Textarea
                      value={content}
                      onChange={(e) => { setContent(e.target.value); setError(''); }}
                      placeholder={format === 'csv' 
                        ? `question,type,answer,options,points\nWhat is 2+2?,multiple_choice,4,2|3|4|5,1\nIs the sky blue?,true_false,true,,1`
                        : `[{"question": "What is 2+2?", "type": "multiple_choice", "correctAnswer": "4", "options": ["2", "3", "4", "5"], "points": 1}]`
                      }
                      className="font-mono text-sm h-40 resize-none"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Help Text */}
              <div className="bg-muted p-3 rounded text-sm text-muted-foreground">
                <p className="font-semibold mb-1">Supported Question Types:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><code>multiple_choice</code> - options separated by |</li>
                  <li><code>true_false</code> - answer is "true" or "false"</li>
                  <li><code>short_answer</code> - free text answer</li>
                  <li><code>long_answer</code> - essay questions</li>
                  <li><code>passage_based</code> - reading comprehension</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* AI File Upload */}
              <div>
                <Label>Upload Document</Label>
                <div className="mt-2">
                  <Input
                    type="file"
                    accept={format === 'pdf' ? '.pdf' : format === 'docx' ? '.docx' : '.txt'}
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                </div>
              </div>

              {fileUrl && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-sm text-emerald-700">
                  ✓ File uploaded. Ready to generate questions.
                </div>
              )}

              {/* Help Text */}
              <div className="bg-muted p-3 rounded text-sm text-muted-foreground">
                <p className="font-semibold mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Upload a document (PDF, DOCX, or TXT)</li>
                  <li>Enter the topic/subject (optional)</li>
                  <li>Click "Generate with AI"</li>
                  <li>Gemini Pro will create diverse questions automatically</li>
                </ul>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/50 p-3 rounded flex gap-2">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            {mode === 'manual' ? (
              <Button onClick={handleImport} disabled={loading || !content}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {loading ? 'Importing...' : 'Import & Arrange'}
              </Button>
            ) : (
              <Button onClick={handleSmartImport} disabled={loading || !fileUrl}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                {loading ? 'Generating...' : 'Generate with AI'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}