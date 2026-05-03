import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New service worker activated - app updated
        setShowUpdate(false);
      });

      // Listen for messages from service worker about updates
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'UPDATE_AVAILABLE') {
          setUpdateAvailable(event.data);
          setShowUpdate(true);
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SKIP_WAITING'
      });
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:right-6 md:w-96 md:max-w-sm z-50">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground mb-1">
              Update Available
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              A new version of SchoolPulse is available. Update now to get the latest features and improvements.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Update Now
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
              >
                Later
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}