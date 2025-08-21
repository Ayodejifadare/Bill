import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';

interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnread = async () => {
    try {
      setLoading(true);
      const storedAuth = localStorage.getItem('auth');
      const token = storedAuth ? JSON.parse(storedAuth).token : null;
      const res = await fetch('/api/notifications/unread', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        throw new Error('Failed to fetch unread notifications');
      }
      const data = await res.json();
      setUnread(data.count || 0);
      setError(null);
    } catch (err) {
      setUnread(0);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnread();
    const storedAuth = localStorage.getItem('auth');
    const token = storedAuth ? JSON.parse(storedAuth).token : null;
    let es: EventSource | null = null;
    if (token && typeof window !== 'undefined' && 'EventSource' in window) {
      es = new EventSource(`/api/notifications/stream?token=${token}`);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (typeof data.unread === 'number') {
            setUnread(data.unread);
          }
        } catch {
          // ignore parse errors
        }
      };
    }
    const interval = setInterval(fetchUnread, 60000);
    return () => {
      clearInterval(interval);
      es?.close();
    };
  }, []);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          fetchUnread();
          onClick();
        }}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {!loading && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>
      {error && (
        <Alert variant="destructive" className="absolute right-0 top-full mt-2 w-64">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

