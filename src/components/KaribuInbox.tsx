"use client";

import { useEffect, useState } from "react";

export default function KaribuInbox() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  async function load() {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setNotifications(data);
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <div className="fixed bottom-4 right-4">
      <button
        onClick={() => setOpen(!open)}
        className="bg-black text-white px-4 py-2 rounded-full"
      >
        Inbox ({unreadCount})
      </button>

      {open && (
        <div className="mt-2 w-80 max-h-96 overflow-y-auto bg-white shadow-lg rounded-xl p-4 border">
          {notifications.length === 0 && (
            <p className="text-sm text-gray-500">No notifications</p>
          )}

          {notifications.map(n => (
            <div
              key={n.id}
              className={`mb-3 p-3 rounded-lg border ${!n.readAt ? "bg-yellow-50" : "bg-gray-50"}`}
            >
              <div className="font-semibold text-sm">{n.title}</div>
              <div className="text-xs text-gray-600">{n.body}</div>
              {!n.readAt && (
                <button
                  onClick={() => markRead(n.id)}
                  className="text-xs mt-2 text-blue-600"
                >
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
