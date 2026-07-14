import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, AlertCircle, Wand2, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const QUESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          type: { type: 'string', enum: ['multiple_choice', 'true_false', 'short_answer', 'long_answer'] },
          correctAnswer: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          points: { type: 'number' },
        },
      },
    },
  },
};

export default function QuizBulkImportDialog({ open, onOpenChange, onImport }) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('manual'); // manual or ai
  const [format, setFormat] = useState('pdf'); // pdf, docx
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [questionCounts, setQuestionCounts] = useState({
    multiple_choice: 2,
    true_false: 1,
    short_answer: 1,
    long_answer: 1
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    try {
      setLoading(true);
      const res = await base44.integrations.Core.UploadFile({ file });
      const uploadedUrl = res.file_url;
      setFileUrl(uploadedUrl);

      if (mode === 'manual') {
        // Extract structured questions from the PDF/DOCX using AI
        const extractRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: uploadedUrl,
          json_schema: QUESTIONS_SCHEMA,
        });

        if (extractRes.status === 'success' && extractRes.output) {
          const questions = Array.isArray(extractRes.output)
            ? extractRes.output
            : extractRes.output.questions || [];
          setExtractedQuestions(questions);
          if (questions.length > 0) {
            toast.success(`Extracted ${questions.length} questions from the document.`);
          } else {
            setError('No questions were found in the uploaded document. Try the AI Generator mode instead.');
          }
        } else {
          setError(extractRes.details || 'Failed to extract questions from the document.');
        }
      } else {
        toast.success('File uploaded. Click "Generate with AI" to create questions.');
      }
    } catch (err) {
      setError('Failed to upload file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (extractedQuestions.length === 0) {
      setError('No questions to import. Please upload a document first.');
      return;
    }

    try {
      setLoading(true);
      const response = await base44.functions.invoke('arrangeQuizQuestions', {
        questions: extractedQuestions,
      });

      if (response.data?.arranged) {
        onImport(response.data.arranged);
        resetState();
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

    const totalQuestions = Object.values(questionCounts).reduce((a, b) => a + b, 0);
    if (totalQuestions === 0) {
      setError('Specify at least one question');
      return;
    }

    try {
      setLoading(true);
      const response = await base44.functions.invoke('smartQuizImport', {
        fileUrl,
        fileType: format,
        topic,
        subjectName: '',
        questionCounts
      });

      if (response.data?.questions) {
        onImport(response.data.questions);
        resetState();
        onOpenChange(false);
        toast.success(`Generated ${response.data.questions.length} questions with AI`);
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

  function resetState() {
    setFileUrl('');
    setFileName('');
    setExtractedQuestions([]);
    setTopic('');
    setError('');
  }

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
                onClick={() => { setMode('manual'); resetState(); }}
                disabled={loading}
              >
                Manual Entry
              </Button>
              <Button
                variant={mode === 'ai' ? 'default' : 'outline'}
                onClick={() => { setMode('ai'); resetState(); }}
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
                <div className="flex gap-2 mt-2 flex-wrap">
                  {['pdf', 'docx'].map(f => (
                    <Button
                      key={f}
                      variant={format === f ? 'default' : 'outline'}
                      onClick={() => { setFormat(f); resetState(); }}
                      disabled={loading}
                      size="sm"
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
                  {['pdf', 'docx'].map(f => (
                    <Button
                      key={f}
                      variant={format === f ? 'default' : 'outline'}
                      onClick={() => { setFormat(f); resetState(); }}
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

              {/* Question Type Counts */}
              <div>
                <Label className="text-sm font-semibold">Question Distribution</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Multiple Choice</label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={questionCounts.multiple_choice}
                      onChange={e => setQuestionCounts({ ...questionCounts, multiple_choice: Math.max(0, parseInt(e.target.value) || 0) })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">True/False</label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={questionCounts.true_false}
                      onChange={e => setQuestionCounts({ ...questionCounts, true_false: Math.max(0, parseInt(e.target.value) || 0) })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Short Answer</label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={questionCounts.short_answer}
                      onChange={e => setQuestionCounts({ ...questionCounts, short_answer: Math.max(0, parseInt(e.target.value) || 0) })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Long Essay</label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={questionCounts.long_answer}
                      onChange={e => setQuestionCounts({ ...questionCounts, long_answer: Math.max(0, parseInt(e.target.value) || 0) })}
                      disabled={loading}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total: {Object.values(questionCounts).reduce((a, b) => a + b, 0)} questions
                </p>
              </div>
            </>
          )}

          {mode === 'manual' ? (
            <>
              {/* Manual File Upload */}
              <div>
                <Label>Upload Document</Label>
                <div className="mt-2 space-y-2">
                  <Input
                    type="file"
                    accept={format === 'pdf' ? '.pdf' : '.docx'}
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                  {fileName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2.5 rounded-lg">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{fileName}</span>
                      {extractedQuestions.length > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600 ml-auto flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                          {extractedQuestions.length} questions found
                        </span>
                      )}
                    </div>
                  )}
                  {extractedQuestions.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 bg-muted/30 rounded-lg">
                      {extractedQuestions.map((q, i) => (
                        <div key={i} className="text-sm p-2 bg-background rounded border">
                          <span className="text-xs font-semibold text-muted-foreground uppercase mr-2">{q.type || 'unknown'}</span>
                          <span>{q.question || '(no question text)'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Help Text */}
              <div className="bg-muted p-3 rounded text-sm text-muted-foreground">
                <p className="font-semibold mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Upload a PDF or Word document containing your questions</li>
                  <li>Questions are automatically extracted using AI</li>
                  <li>Review the extracted questions above</li>
                  <li>Click "Import & Arrange" to add them to your quiz</li>
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
                    accept={format === 'pdf' ? '.pdf' : '.docx'}
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                </div>
              </div>

              {fileUrl && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  File uploaded. Ready to generate questions.
                </div>
              )}

              {/* Help Text */}
              <div className="bg-muted p-3 rounded text-sm text-muted-foreground">
                <p className="font-semibold mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Upload a PDF or Word document</li>
                  <li>Enter the topic/subject (optional)</li>
                  <li>Click "Generate with AI"</li>
                  <li>AI will create diverse questions automatically</li>
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
              <Button onClick={handleImport} disabled={loading || extractedQuestions.length === 0}>
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