import React, { useRef, useState, useCallback } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Pencil, Eraser, Trash2, Undo, Redo, Cloud, Loader2, Download, Share2 } from 'lucide-react';

const COLORS = ['#000000', '#1d4ed8', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#f59e0b', '#ec4899', '#14b8a6', '#64748b', '#ffffff'];

export default function NoteDrawingCanvas({ onSave, onCancel, existingImageUrl, onShare, isSaved }) {
  const canvasRef = useRef(null);
  const autoSaveTimer = useRef(null);
  const isSavingRef = useRef(false);
  const [tool, setTool] = useState('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [downloading, setDownloading] = useState(false);

  const triggerAutoSave = useCallback(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setSaveStatus('saving');
      try {
        const dataUrl = await canvasRef.current.exportImage('png');
        await onSave(dataUrl);
        setSaveStatus('saved');
      } catch (e) {
        console.error('Drawing save failed:', e);
        setSaveStatus('idle');
      } finally {
        isSavingRef.current = false;
      }
    }, 2000);
  }, [onSave]);

  const handleStrokeEnd = () => {
    triggerAutoSave();
  };

  const handleClear = () => {
    canvasRef.current?.clearCanvas();
    setSaveStatus('idle');
    triggerAutoSave();
  };

  const handleManualSave = async () => {
    clearTimeout(autoSaveTimer.current);
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaveStatus('saving');
    try {
      const dataUrl = await canvasRef.current.exportImage('png');
      await onSave(dataUrl);
      setSaveStatus('saved');
    } catch (e) {
      console.error('Drawing save failed:', e);
      setSaveStatus('idle');
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const dataUrl = await canvasRef.current.exportImage('png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'drawing.png';
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-lg shrink-0">
        <Button size="sm" variant={tool === 'pen' ? 'default' : 'outline'} onClick={() => setTool('pen')}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button size="sm" variant={tool === 'eraser' ? 'default' : 'outline'} onClick={() => setTool('eraser')}>
          <Eraser className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1 ml-1 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => { setStrokeColor(c); setTool('pen'); }}
              className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: strokeColor === c ? '#6366f1' : '#cbd5e1' }}
            />
          ))}
          {/* Color picker for full spectrum */}
          <label
            title="Custom color"
            className="w-6 h-6 rounded-full border-2 cursor-pointer overflow-hidden flex items-center justify-center transition-transform hover:scale-110"
            style={{
              background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
              borderColor: !COLORS.includes(strokeColor) ? '#6366f1' : '#cbd5e1'
            }}
          >
            <input
              type="color"
              value={strokeColor}
              onChange={e => { setStrokeColor(e.target.value); setTool('pen'); }}
              className="opacity-0 absolute w-0 h-0"
            />
          </label>
        </div>

        <div className="flex items-center gap-2 ml-2 flex-1 min-w-[100px] max-w-[160px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Size</span>
          <Slider
            min={1} max={20} step={1}
            value={[strokeWidth]}
            onValueChange={([v]) => setStrokeWidth(v)}
            className="flex-1"
          />
        </div>

        <Button size="sm" variant="ghost" onClick={() => { canvasRef.current?.undo(); triggerAutoSave(); }}><Undo className="w-4 h-4" /></Button>
        <Button size="sm" variant="ghost" onClick={() => { canvasRef.current?.redo(); triggerAutoSave(); }}><Redo className="w-4 h-4" /></Button>
        <Button size="sm" variant="ghost" onClick={handleClear}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>

        {/* Save status */}
        <div className="ml-auto">
          {saveStatus === 'saving' && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
          {saveStatus === 'saved' && <span className="flex items-center gap-1 text-xs text-emerald-600"><Cloud className="w-3 h-3" /> Saved</span>}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 border rounded-lg overflow-hidden bg-white" style={{ minHeight: 0 }}>
        <ReactSketchCanvas
          ref={canvasRef}
          strokeColor={tool === 'eraser' ? '#ffffff' : strokeColor}
          strokeWidth={tool === 'eraser' ? strokeWidth * 3 : strokeWidth}
          eraserWidth={strokeWidth * 3}
          canvasColor="white"
          style={{ width: '100%', height: '100%' }}
          withTimestamp={false}
          onStroke={handleStrokeEnd}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            Download
          </Button>
          {onShare && (
            <Button size="sm" variant="outline" onClick={onShare} disabled={!isSaved}>
              <Share2 className="w-4 h-4 mr-1" /> Share with Teacher
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>Close</Button>
          <Button size="sm" onClick={handleManualSave} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Cloud className="w-4 h-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}