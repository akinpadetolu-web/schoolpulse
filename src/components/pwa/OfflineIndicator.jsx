import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(false);
      // Auto-dismiss after 3 seconds
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center gap-3 transition-all duration-300 ${
      isOnline
        ? 'bg-emerald-50 border-b border-emerald-200'
        : 'bg-amber-50 border-b border-amber-200'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">
            You're back online! Your data is syncing.
          </p>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
          <p className="text-sm text-amber-800 font-medium">
            You're offline. Some features may be limited.
          </p>
        </>
      )}
    </div>
  );
}