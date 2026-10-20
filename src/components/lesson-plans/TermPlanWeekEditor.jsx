import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown, ChevronUp, FileText, Loader2, Upload, X,
  GraduationCap, ClipboardList,
} from 'lucide-react';
import { weekRange } from '@/lib/termPlanUtils';

export default function TermPlanWeekEditor({ week, expanded, onToggle, onChange, onUploadPdf, uploading }) {
  const marked = week.isMidterm || week.isExam;

  return (
    <div className={`border rounded-lg overflow-hidden ${marked ? 'border-amber-200 bg-amber-50/40' : ''}`}>
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onToggle}>
        <span className="text-xs font-bold text-primary bg-primary/10 rounded-md px-2 py-1 shrink-0">
          W{week.weekNumber}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{weekRange(week)}</span>
            {week.isMidterm && (
              <Badge className="text-xs bg-amber-100 text-amber-700 border-0">
                <GraduationCap className="w-3 h-3 mr-1" /> Midterm
              </Badge>
            )}
            {week.isExam && (
              <Badge className="text-xs bg-red-100 text-red-700 border-0">
                <ClipboardList className="w-3 h-3 mr-1" /> Exam week
              </Badge>
            )}
            {week.pdfFileUri && <FileText className="w-3.5 h-3.5 text-primary" />}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {week.topic?.trim() || 'No topic yet'}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>

      {expanded && (
        <div className="border-t px-3 pb-3 pt-3 space-y-3 bg-card">
          <div className="space-y-1.5">
            <Label className="text-xs">Topic for this week</Label>
            <Input
              value={week.topic || ''}
              onChange={e => onChange({ topic: e.target.value })}
              placeholder="e.g. Photosynthesis — light and dark reactions"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Objectives (optional)</Label>
            <Textarea
              rows={2}
              className="text-sm"
              value={week.objectives || ''}
              onChange={e => onChange({ objectives: e.target.value })}
              placeholder="What students should be able to do by the end of the week"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={week.isMidterm ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => onChange({ isMidterm: !week.isMidterm })}
            >
              <GraduationCap className="w-3.5 h-3.5 mr-1" /> Midterm week
            </Button>
            <Button
              type="button"
              size="sm"
              variant={week.isExam ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => onChange({ isExam: !week.isExam })}
            >
              <ClipboardList className="w-3.5 h-3.5 mr-1" /> Exam week
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Topic PDF (optional)</Label>
            {week.pdfFileUri ? (
              <div className="flex items-center gap-2 p-2.5 border rounded-lg bg-secondary/20">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm flex-1 truncate">{week.pdfFileName || 'Attached PDF'}</span>
                <Button
                  type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground"
                  onClick={() => onChange({ pdfFileUri: '', pdfFileName: '' })}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center gap-2 p-2.5 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/20 transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                <span className="text-sm text-muted-foreground">{uploading ? 'Uploading…' : 'Attach a PDF for this topic'}</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={e => { onUploadPdf(e.target.files?.[0]); e.target.value = ''; }}
                />
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}