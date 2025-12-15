import React, { useState } from "react";
import {
  FiClock,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiAlertCircle,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const OldNotifications = ({ notifications = [] }) => {
  const [expandedNtf, setExpandedNtf] = useState(null);
  const [filterType, setFilterType] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return "Recently";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filter only read notifications (isRead === true)
  const readNotifications = notifications.filter(
    (notification) => notification.isRead
  );

  // Apply filters
  const filteredNotifications = readNotifications.filter((ntf) => {
    if (filterType === "ALL") return true;
    return ntf.type === filterType;
  });

  // Apply sorting
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
  });

  const getNotificationCounts = () => {
    const counts = {
      ALL: readNotifications.length,
      INFO: readNotifications.filter((n) => n.type === "INFO").length,
      ALERT: readNotifications.filter((n) => n.type === "ALERT").length,
      WARNING: readNotifications.filter((n) => n.type === "WARNING").length,
      SYSTEM: readNotifications.filter((n) => n.type === "SYSTEM").length,
    };
    return counts;
  };

  const counts = getNotificationCounts();

  if (readNotifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="bg-gray-100 rounded-full p-6 mb-4">
          <FiClock className="text-gray-400" size={48} />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No Old Notifications
        </h3>
        <p className="text-gray-500 text-center max-w-md">
          All your notifications are currently unread. Mark some as read to see
          them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            Old Notifications
          </h3>
          <p className="text-sm text-gray-500">
            {readNotifications.length} read notification
            {readNotifications.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors self-start"
        >
          <FiFilter size={16} />
          <span className="text-sm font-medium">Filter & Sort</span>
          {showFilters ? (
            <FiChevronUp size={16} />
          ) : (
            <FiChevronDown size={16} />
          )}
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border rounded-xl p-4 mb-6 space-y-4">
              {/* Type Filter */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {["ALL", "INFO", "ALERT", "WARNING", "SYSTEM"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        filterType === type
                          ? type === "ALERT"
                            ? "bg-red-100 text-red-800 border-red-300"
                            : type === "WARNING"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : type === "SYSTEM"
                            ? "bg-gray-100 text-gray-800 border-gray-300"
                            : "bg-blue-100 text-blue-800 border-blue-300"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      } border`}
                    >
                      {type} ({counts[type]})
                    </button>
                  ))}
                </div>
              </div> */}

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort by
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortBy("newest")}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      sortBy === "newest"
                        ? "bg-blue-100 text-blue-800 border-blue-300"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } border`}
                  >
                    Newest First
                  </button>
                  <button
                    onClick={() => setSortBy("oldest")}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      sortBy === "oldest"
                        ? "bg-blue-100 text-blue-800 border-blue-300"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    } border`}
                  >
                    Oldest First
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification List */}
      <div className="space-y-3">
        <AnimatePresence>
          {sortedNotifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          n.type === "ALERT"
                            ? "bg-red-100 text-red-800"
                            : n.type === "WARNING"
                            ? "bg-amber-100 text-amber-800"
                            : n.type === "SYSTEM"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {n.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(n.createdAt)}
                      </span>
                    </div>

                    <h4 className="font-semibold text-gray-900 mb-1">
                      {n.title}
                    </h4>

                    <p className="text-gray-600 text-sm">{n.message}</p>

                    {n.link && (
                      <a
                        href={n.link}
                        className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        View related item →
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      setExpandedNtf(expandedNtf === n.id ? null : n.id)
                    }
                    className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {expandedNtf === n.id ? (
                      <FiChevronUp size={20} />
                    ) : (
                      <FiChevronDown size={20} />
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {expandedNtf === n.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Operation ID</p>
                            <p className="font-medium">
                              {n.operation_id || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Created At</p>
                            <p className="font-medium">
                              {n.createdAt
                                ? new Date(n.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            Read on {new Date().toLocaleDateString()}
                          </span>
                          {n.operation_id && (
                            <a
                              href={`/operations/${n.operation_id}`}
                              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              View Operation Details
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* No Results Message */}
      {sortedNotifications.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <FiClock className="mx-auto text-gray-300 mb-3" size={32} />
          <p className="text-gray-500">
            No {filterType !== "ALL" ? filterType.toLowerCase() : ""}{" "}
            notifications found
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Read Notifications Summary
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {["ALL", "INFO", "ALERT", "WARNING", "SYSTEM"].map((type) => (
            <div
              key={type}
              className={`p-3 rounded-lg ${
                type === "ALL"
                  ? "bg-blue-50 border border-blue-100"
                  : type === "INFO"
                  ? "bg-blue-50 border border-blue-100"
                  : type === "ALERT"
                  ? "bg-red-50 border border-red-100"
                  : type === "WARNING"
                  ? "bg-amber-50 border border-amber-100"
                  : "bg-gray-50 border border-gray-100"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  type === "ALL"
                    ? "text-blue-700"
                    : type === "INFO"
                    ? "text-blue-700"
                    : type === "ALERT"
                    ? "text-red-700"
                    : type === "WARNING"
                    ? "text-amber-700"
                    : "text-gray-700"
                }`}
              >
                {type}
              </p>
              <p className="text-lg font-bold text-gray-900">{counts[type]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OldNotifications;
