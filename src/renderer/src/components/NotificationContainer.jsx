import { useNotificationStore } from '../stores/useNotificationStore';
import { CheckCircle, AlertCircle, InfoIcon, XCircle, X } from 'lucide-react';

export default function NotificationContainer() {
  const { notifications, removeNotification } = useNotificationStore();

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 flex-shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 flex-shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
      default:
        return <InfoIcon className="w-5 h-5 flex-shrink-0" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in fade-in slide-in-from-top-2 ${getTypeStyles(notification.type)}`}
        >
          {getIcon(notification.type)}
          <div className="flex-1 text-sm font-medium break-words whitespace-pre-wrap">
            {notification.message}
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 ml-2 hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
