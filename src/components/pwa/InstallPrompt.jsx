import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { getInstallPrompt, triggerInstallPrompt } from '@/lib/pwaManager';
import { Button } from '@/components/ui/button';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalledApp, setIsInstalledApp] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalledApp(isInstalled);

    // Show prompt if available
    const deferredPrompt = getInstallPrompt();
    if (deferredPrompt && !isInstalled) {
      setShowPrompt(true);
    }

    // Listen for changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e) => {
      if (e.matches) {
        setIsInstalledApp(true);
        setShowPrompt(false);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleInstall = async () => {
    const accepted = await triggerInstallPrompt();
    if (accepted) {
      setShowPrompt(false);
      setIsInstalledApp(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || isInstalledApp) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:bottom-6 md:right-6 md:left-auto md:w-96 md:max-w-sm">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm text-foreground">Install SchoolPulse</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Install our app for faster access, offline support, and a home screen shortcut.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleInstall}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Install
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
              >
                Not Now
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