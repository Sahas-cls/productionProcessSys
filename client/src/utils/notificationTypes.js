// utils/notificationTypes.js
export const NOTIFICATION_TYPES = {
  INFO: { color: "blue", icon: "ℹ️", bgColor: "bg-blue-50" },
  ALERT: { color: "amber", icon: "⚠️", bgColor: "bg-amber-50" },
  WARNING: { color: "red", icon: "🚨", bgColor: "bg-red-50" },
  SYSTEM: { color: "gray", icon: "⚙️", bgColor: "bg-gray-50" },
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};
