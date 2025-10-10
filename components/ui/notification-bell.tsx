import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { EventSourcePolyfill } from "event-source-polyfill";
import { Button } from "./button";
import { Alert, AlertDescription } from "./alert";
import { apiClientWithRetry } from "../../utils/apiClientWithRetry";
import { apiBaseUrl } from "../../utils/config";

interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setErrorCount] = useState(0);

  const pollTimeout = useRef<number | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const baseInterval = 60000;

  const scheduleFetch = (delay: number) => {
    if (pollTimeout.current) {
      clearTimeout(pollTimeout.current);
    }
    pollTimeout.current = window.setTimeout(() => fetchUnread(), delay);
  };

  const handleFailure = (manual = false) => {
    setErrorCount((prev) => {
      const next = manual ? 1 : prev + 1;
      if (next >= 3) {
        esRef.current?.close();
        esRef.current = null;
      }
      const delay = manual ? baseInterval : baseInterval * Math.pow(2, next);
      scheduleFetch(delay);
      return next;
    });
  };

  function buildSseUrl(): string {
    const resource = "/notifications/stream";
    const base = apiBaseUrl || "/api";
    const isAbs = /^https?:\/\//i.test(base);
    if (isAbs) {
      const u = new URL(base);
      const basePath = u.pathname.replace(/\/+$/, "");
      const baseHasApi = /(^|\/)api(\/|$)/.test(basePath);
      const path = `${baseHasApi ? "" : "/api"}${resource}`;
      return `${u.origin}${basePath}${path}`;
    }
    return `${base.replace(/\/+$/, "")}${resource}`;
  }

  const connectSSE = () => {
    const storedAuth = localStorage.getItem("biltip_auth");
    const token = storedAuth ? JSON.parse(storedAuth).token : null;
    if (token && typeof window !== "undefined") {
      const url = buildSseUrl();
      const es = new EventSourcePolyfill(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (typeof data.unread === "number") {
            setUnread(data.unread);
          }
        } catch {
          // ignore parse errors
        }
      };
      es.onerror = () => {
        setError("Connection error");
        handleFailure();
      };
      esRef.current = es;
    }
  };

  const fetchUnread = async (manual = false) => {
    setLoading(true);
    if (manual) {
      setErrorCount(0);
    }
    try {
      const data = await apiClientWithRetry("/notifications/unread");
      setUnread((data as any)?.count || 0);
      setError(null);
      setErrorCount(0);
      if (!esRef.current) {
        connectSSE();
      }
      scheduleFetch(baseInterval);
    } catch (err) {
      setUnread(0);
      setError((err as Error).message);
      handleFailure(manual);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnread();
    connectSSE();
    return () => {
      if (pollTimeout.current) {
        clearTimeout(pollTimeout.current);
      }
      esRef.current?.close();
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
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
      {error && (
        <Alert
          variant="destructive"
          className="absolute right-0 top-full mt-2 w-64"
        >
          <AlertDescription className="space-y-2">
            <span>{error}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchUnread(true)}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
