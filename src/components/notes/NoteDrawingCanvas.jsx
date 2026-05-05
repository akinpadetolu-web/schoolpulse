import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Pencil, Eraser, Trash2, Undo, Redo, Cloud, Loader2, Download, Share2 } from 'lucide-react';

const COLORS = ['#000000', '#1d4ed8', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#f59e0b', '#ec4899', '#14b8a6', '#64748b', '#ffffff'];

export default function NoteDrawingCanvas({ onSave, onCancel, existingImageUrl, onShare, isSaved }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const history = useRef([]); // stack of ImageData snapshots
  const redoStack = useRef([]);
  const autoSaveTimer = useRef(null);
  const isSavingRef = useRef(false);

  const [tool, setTool] = useState('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [downloading, setDownloading] = useState(false);

  // Initialize canvas and load existing image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (existingImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        pushHistory();
      };
      img.src = existingImageUrl;
    } else {
      pushHistory();
    }
  }, [existingImageUrl]);

  const pushHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.current.length > 50) history.current.shift();
    redoStack.current = [];
  };

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    isDrawing.current = true;
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : strokeColor;
    ctx.lineWidth = tool === 'eraser' ? strokeWidth * 3 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  }, [tool, strokeColor, strokeWidth]);

  const stopDrawing = useCallback((e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    isDrawing.current = false;
    lastPos.current = null;
    pushHistory();
    triggerAutoSave();
  }, []);

  const triggerAutoSave = useCallback(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setSaveStatus('saving');
      try {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        await onSave(dataUrl);
        setSaveStatus('saved');
      } catch (e) {
        console.error('Drawing auto-save failed:', e);
        setSaveStatus('idle');
      } finally {
        isSavingRef.current = false;
      }
    }, 2000);
  }, [onSave]);

  const handleUndo = () => {
    if (history.current.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    redoStack.current.push(history.current.pop());
    ctx.putImageData(history.current[history.current.length - 1], 0, 0);
    triggerAutoSave();
  };

  const handleRedo = () => {
    if (redoStack.current.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const next = redoStack.current.pop();
    history.current.push(next);
    ctx.putImageData(next, 0, 0);
    triggerAutoSave();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    pushHistory();
    triggerAutoSave();
  };

  const handleManualSave = async () => {
    clearTimeout(autoSaveTimer.current);
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaveStatus('saving');
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      await onSave(dataUrl);
      setSaveStatus('saved');
    } catch (e) {
      console.error('Drawing save failed:', e);
      setSaveStatus('idle');
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleDownload = () => {
    setDownloading(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `drawing-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!isSaved) {
      setSaveStatus('saving');
      try {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        await onSave(dataUrl);
        setSaveStatus('saved');
        setTimeout(() => onShare?.(), 300);
      } catch (e) {
        console.error('Save before share failed:', e);
        setSaveStatus('idle');
      }
    } else {
      onShare?.();
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

        <Button size="sm" variant="ghost" onClick={handleUndo}><Undo className="w-4 h-4" /></Button>
        <Button size="sm" variant="ghost" onClick={handleRedo}><Redo className="w-4 h-4" /></Button>
        <Button size="sm" variant="ghost" onClick={handleClear}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>

        <div className="ml-auto">
          {saveStatus === 'saving' && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
          {saveStatus === 'saved' && <span className="flex items-center gap-1 text-xs text-emerald-600"><Cloud className="w-3 h-3" /> Saved</span>}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 border rounded-lg overflow-hidden bg-white" style={{ minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          style={{ width: '100%', height: '100%', touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
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
            <Button size="sm" variant="outline" onClick={handleShare} disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
              Share with Teacher
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