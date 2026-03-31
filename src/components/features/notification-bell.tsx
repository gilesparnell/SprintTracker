"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";

type Notification = {
  id: string;
  userId: string;
  type: "assignment" | "reassignment" | "note";
  title: string;
  body: string | null;
  entityType: "story" | "task" | "subtask";
  entityId: string;
  read: number;
  createdAt: string;
};

function timeAgo(dateStr: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function entityLink(entityType: string, entityId: string) {
  switch (entityType) {
    case "story":
      return `/stories/${entityId}`;
    case "task":
      return `/tasks/${entityId}`;
    case "subtask":
      return `/subtasks/${entityId}`;
    default:
      return "#";
  }
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pollGeneration = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    const gen = pollGeneration.current;
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (!res.ok) return;
      const data = await res.json();
      // Discard stale poll responses
      if (gen !== pollGeneration.current) return;
      setUnreadCount(data.count);
    } catch {
      // Silently ignore polling errors
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data);
    } catch {
      // Silently ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchNotifications();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: 1 } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    pollGeneration.current += 1;

    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      });
    } catch {
      // Revert on error by refetching
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  const handleMarkAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
    setUnreadCount(0);
    pollGeneration.current += 1;

    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch {
      // Revert on error by refetching
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <a
                  key={notification.id}
                  href={entityLink(
                    notification.entityType,
                    notification.entityId
                  )}
                  onClick={() => {
                    if (!notification.read) handleMarkAsRead(notification.id);
                    setOpen(false);
                  }}
                  className={`block border-b border-gray-700/50 px-4 py-3 transition-colors hover:bg-gray-700/50 ${
                    notification.read ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notification.read && (
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {timeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
