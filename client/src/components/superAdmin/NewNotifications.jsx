import React, { useState, useEffect } from "react";
import { FiArrowLeft, FiChevronRight, FiAlertCircle, FiCheckCircle, FiInfo, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { GiEmptyHourglass } from "react-icons/gi";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const NewNotifications = ({ notifications = [] }) => {
  const navigate = useNavigate();
  const [expandedNtf, setExpandedNtf] = useState(null);
  const [oldData, setOldData] = useState({});
  const [newValue, setNewValue] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [markingAsRead, setMarkingAsRead] = useState([]);
  
  const apiUrl = import.meta.env.VITE_API_URL;
  
  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return "Just now";
    
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
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter only unread notifications (isRead === false)
  const unreadNotifications = notifications.filter(notification => !notification.isRead);
  
  const hasNew = unreadNotifications.length > 0;

  const getNotificationIcon = (type) => {
    switch (type) {
      case "ALERT":
        return <FiAlertCircle className="text-red-500" size={24} />;
      case "WARNING":
        return <FiAlertCircle className="text-amber-500" size={24} />;
      case "SYSTEM":
        return <FiInfo className="text-gray-500" size={24} />;
      default:
        return <FiInfo className="text-blue-500" size={24} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "ALERT":
        return "border-l-4 border-l-red-500";
      case "WARNING":
        return "border-l-4 border-l-amber-500";
      case "SYSTEM":
        return "border-l-4 border-l-gray-500";
      default:
        return "border-l-4 border-l-blue-500";
    }
  };

  // Handle notification expand
  const handleNtfExpand = async (ntfId) => {
    if (expandedNtf === ntfId) {
      setExpandedNtf(null);
      return;
    }
    
    setExpandedNtf(ntfId);
    setLoadingId(ntfId);
    
    try {
      const response = await axios.get(
        `${apiUrl}/api/user/get_notification/${ntfId}`,
        { withCredentials: true }
      );
      setOldData(prev => ({ ...prev, [ntfId]: response.data.oldData || {} }));
      setNewValue(prev => ({ ...prev, [ntfId]: response.data.newData || {} }));
    } catch (error) {
      console.error("Error fetching notification details:", error);
    } finally {
      setLoadingId(null);
    }
  };

  const handleMarkAsRead = async (ntfId, e) => {
    if (e) e.stopPropagation();
    
    setMarkingAsRead(prev => [...prev, ntfId]);
    
    try {
      // If you have an endpoint to mark as read
      // await axios.patch(`${apiUrl}/api/user/notifications/${ntfId}/read`, {}, { withCredentials: true });
      
      // For now, just simulate it and update parent if needed
      console.log(`Marking notification ${ntfId} as read`);
      
      // Update local state or trigger refresh
      setTimeout(() => {
        setMarkingAsRead(prev => prev.filter(id => id !== ntfId));
        if (expandedNtf === ntfId) setExpandedNtf(null);
      }, 500);
      
    } catch (error) {
      console.error("Error marking as read:", error);
      setMarkingAsRead(prev => prev.filter(id => id !== ntfId));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadNotifications.length === 0) return;
    
    try {
      // If you have an endpoint to mark all as read
      // await axios.patch(`${apiUrl}/api/user/notifications/mark-all-read`, {}, { withCredentials: true });
      
      console.log("Marking all notifications as read");
      
      // You might want to refresh notifications here or update parent state
      // For now, show a message
      alert("All notifications marked as read! (Backend integration needed)");
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  if (!hasNew) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="bg-blue-50 rounded-full p-6 mb-4">
          <FiCheckCircle className="text-blue-500" size={48} />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No New Notifications
        </h3>
        <p className="text-gray-500 text-center max-w-md">
          You're all caught up! Check back later for updates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="hidden md:flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
            <span className="font-medium">Back</span>
          </button>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">New Notifications</h3>
            <p className="text-sm text-gray-500">
              {unreadNotifications.length} unread notification{unreadNotifications.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        {/* {unreadNotifications.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 self-start"
          >
            <FiCheckCircle size={16} />
            Mark All as Read
          </button>
        )} */}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {unreadNotifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-xl shadow-sm border ${getNotificationColor(n.type)} hover:shadow-md transition-shadow duration-200`}
          >
            {/* Notification Header */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => handleNtfExpand(n.id)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {getNotificationIcon(n.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {n.title}
                    </h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {n.message}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      n.type === 'ALERT' ? 'bg-red-100 text-red-800' : 
                      n.type === 'WARNING' ? 'bg-amber-100 text-amber-800' : 
                      n.type === 'SYSTEM' ? 'bg-gray-100 text-gray-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {n.type}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {/* <button
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        disabled={markingAsRead.includes(n.id)}
                        className={`text-xs px-3 py-1 rounded-lg flex items-center gap-1 ${
                          markingAsRead.includes(n.id)
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } transition-colors`}
                      >
                        {markingAsRead.includes(n.id) ? (
                          <>
                            <GiEmptyHourglass className="animate-spin" size={12} />
                            Marking...
                          </>
                        ) : (
                          <>
                            <FiCheckCircle size={12} />
                            Mark Read
                          </>
                        )}
                      </button> */}
                      
                      <FiChevronRight
                        className={`text-gray-400 transition-transform duration-200 ${
                          expandedNtf === n.id ? 'rotate-90' : ''
                        }`}
                        size={16}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Details */}
            <AnimatePresence>
              {expandedNtf === n.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden border-t"
                >
                  {loadingId === n.id ? (
                    <div className="p-8 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <GiEmptyHourglass className="animate-spin text-blue-500" size={24} />
                        <p className="text-sm text-gray-500">Loading details...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* New Values */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <h5 className="font-semibold text-gray-900">Current Values</h5>
                          </div>
                          <div className="bg-white rounded-lg border overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-blue-50">
                                <tr>
                                  <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Field</th>
                                  <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b">
                                  <td className="p-3 text-sm text-gray-600">Style</td>
                                  <td className="p-3 text-sm font-medium">
                                    {newValue[n.id]?.mainOperation?.style?.style_no || "N/A"}
                                  </td>
                                </tr>
                                <tr className="border-b">
                                  <td className="p-3 text-sm text-gray-600">Main Operation</td>
                                  <td className="p-3 text-sm font-medium">
                                    {newValue[n.id]?.mainOperation?.operation_name || "N/A"}
                                  </td>
                                </tr>
                                <tr className="border-b">
                                  <td className="p-3 text-sm text-gray-600">Sub Operation</td>
                                  <td className="p-3 text-sm font-medium">
                                    {newValue[n.id]?.sub_operation_name || "N/A"}
                                  </td>
                                </tr>
                                <tr className="border-b">
                                  <td className="p-3 text-sm text-gray-600">Machine Type</td>
                                  <td className="p-3 text-sm font-medium">
                                    {newValue[n.id]?.machine_type || "N/A"}
                                  </td>
                                </tr>
                                <tr className="border-b">
                                  <td className="p-3 text-sm text-gray-600">Needle Count</td>
                                  <td className="p-3 text-sm font-medium">
                                    {newValue[n.id]?.needle_count || "N/A"}
                                  </td>
                                </tr>
                                <tr className="border-b">
                                  <td className="p-3 text-sm text-gray-600">SMV</td>
                                  <td className="p-3 text-sm font-medium">
                                    {newValue[n.id]?.smv || "N/A"}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-3 text-sm text-gray-600">SPI</td>
                                  <td className="p-3 text-sm font-medium">
                                    {newValue[n.id]?.spi || "N/A"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Old Values */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                            <h5 className="font-semibold text-gray-900">Previous Values</h5>
                          </div>
                          <div className="bg-white rounded-lg border overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Field</th>
                                  <th className="text-left p-3 text-sm font-semibold text-gray-700 border-b">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b">
                                  <td className="p-3 text-sm text-gray-600">Sub Operation</td>
                                  <td className="p-3 text-sm font-medium">
                                    {oldData[n.id]?.sub_operation_name || "N/A"}
                                  </td>
                                </tr>
                                <tr className="border-b">
                                  <td className="p-3 text-sm text-gray-600">Machine Type</td>
                                  <td className="p-3 text-sm font-medium">
                                    {oldData[n.id]?.machine_type || "N/A"}
                                  </td>
                                </tr>
                                <tr className="border-b">
                                  <td className="p-3 text-sm text-gray-600">Needle Count</td>
                                  <td className="p-3 text-sm font-medium">
                                    {oldData[n.id]?.needle_count || "N/A"}
                                  </td>
                                </tr>
                                <tr className="border-b">
                                  <td className="p-3 text-sm text-gray-600">SMV</td>
                                  <td className="p-3 text-sm font-medium">
                                    {oldData[n.id]?.smv || "N/A"}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-3 text-sm text-gray-600">SPI</td>
                                  <td className="p-3 text-sm font-medium">
                                    {oldData[n.id]?.spi || "N/A"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-6 pt-4 border-t">
                        <p className="text-sm text-gray-500">
                          Operation ID: {n.operation_id || 'N/A'}
                        </p>
                        <div className="flex gap-2">
                          {n.link && (
                            <a
                              href={n.link}
                              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              View Related Item
                            </a>
                          )}
                          <button
                            onClick={() => setExpandedNtf(null)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Close Details
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default NewNotifications;