import React, { useState, useEffect } from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function GlobalToast() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newNotification: Notification = {
        id: Math.random().toString(36).substr(2, 9),
        title: customEvent.detail.title,
        message: customEvent.detail.message,
        type: customEvent.detail.type || 'info',
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id));
      }, 5000);
    };

    window.addEventListener('app-notification', handleNotification);
    return () => window.removeEventListener('app-notification', handleNotification);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border min-w-[300px] max-w-md animate-fade-in-up ${
            notification.type === 'success' ? 'bg-[#1a2e1a] border-green-900/50 text-green-100' :
            notification.type === 'error' ? 'bg-[#2e1a1a] border-red-900/50 text-red-100' :
            notification.type === 'warning' ? 'bg-[#2e2a1a] border-yellow-900/50 text-yellow-100' :
            'bg-[#1a1a2e] border-blue-900/50 text-blue-100'
          }`}
        >
          <div className="mt-0.5">
            {notification.type === 'success' && <CheckCircle size={18} className="text-green-400" />}
            {notification.type === 'error' && <XCircle size={18} className="text-red-400" />}
            {notification.type === 'warning' && <AlertTriangle size={18} className="text-yellow-400" />}
            {notification.type === 'info' && <Info size={18} className="text-blue-400" />}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm">{notification.title}</h4>
            <p className="text-xs opacity-80 mt-1">{notification.message}</p>
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
