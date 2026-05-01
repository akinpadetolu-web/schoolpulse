import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Bell, X, CheckCircle2, AlertCircle, FileText, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

const notificationIcons = {
  assignment: FileText,
  quiz: Radio,
  announcement: AlertCircle,
};

export default function NotificationCenter() {
  const { schoolUser: user } = useSchoolAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create') {
        loadNotifications();
        toast.info(`New notification: ${event.data.title}`);
      }
    });
    return unsubscribe;
  }, []);

  async function loadNotifications() {
    try {
      if (!user?.schoolId || !user?.role) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      let notifs = await base44.entities.Notification.filter({
        schoolId: user.schoolId,
        targetRole: user.role,
      });
      notifs = (notifs || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 20);
      setNotifications(notifs);
      const unread = notifs.filter(n => !(n.readBy || []).includes(user?.email)).length;
      setUnreadCount(unread);
    } catch {
      console.error('Failed to load notifications');
    }
    setLoading(false);
  }

  async function markAsRead(notification) {
    if (!user?.email || notification.readBy?.includes(user.email)) return;
    const updated = {
      readBy: [...(notification.readBy || []), user.email],
    };
    await base44.entities.Notification.update(notification.id, updated);
    await loadNotifications();
  }

  async function markAllAsRead() {
    if (!user?.email) return;
    for (const notif of notifications) {
      if (!notif.readBy?.includes(user.email)) {
        const updated = {
          readBy: [...(notif.readBy || []), user.email],
        };
        await base44.entities.Notification.update(notif.id, updated);
      }
    }
    await loadNotifications();
  }

  const unreadNotifs = user?.email ? notifications.filter(n => !(n.readBy || []).includes(user.email)) : [];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="fixed inset-0 z-40 md:absolute md:inset-auto md:top-12 md:right-0 md:w-80 md:border md:rounded-lg md:shadow-lg md:bg-background">
          <div className="bg-background rounded-lg shadow-lg border md:border-0">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadNotifs.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={markAllAsRead} className="text-xs">
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  className="md:hidden"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(notif => {
                  const Icon = notificationIcons[notif.type] || AlertCircle;
                  const isRead = notif.readBy?.includes(user?.email);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif)}
                      className={`p-4 border-b cursor-pointer transition-colors hover:bg-accent ${
                        isRead ? 'opacity-60' : 'bg-primary/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                          </p>
                        </div>
                        {isRead && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}