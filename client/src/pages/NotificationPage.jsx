import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";

import NewNotifications from "../components/superAdmin/NewNotifications";
import OldNotifications from "../components/superAdmin/OldNotifications";
import useNotifications from "../hooks/useNotifications";

const NotificationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = location.state || {};
  const { notificationsList, isLoading } = useNotifications();

  const [activeTab, setActiveTab] = useState("new");
  const [unreadCount, setUnreadCount] = useState(0);

  // Calculate unread count (you would fetch this from your data source)
  useEffect(() => {
    // Mock data - replace with actual API call
    setUnreadCount(notificationsList.length || 0);
  }, []);

  // In NotificationPage component, update the tabs:
  const tabs = [
    {
      id: "new",
      label: "New Notifications",
      icon: BellIcon,
      count: notificationsList.filter((n) => !n.isRead).length, // Filter unread
      component: (
        <NewNotifications
          notifications={notificationsList.filter((n) => !n.isRead)}
        />
      ),
    },
    {
      id: "old",
      label: "Seen Notifications",
      icon: CheckCircleIcon,
      count: notificationsList.filter((n) => n.isRead).length, // Add count for read
      component: (
        <OldNotifications
          notifications={notificationsList.filter((n) => n.isRead)}
        />
      ),
    },
  ];

  const activeTabComponent = tabs.find(
    (tab) => tab.id === activeTab
  )?.component;

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Back Button - Mobile & Tablet */}
            <button
              onClick={handleBack}
              className="md:hidden flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Back</span>
            </button>

            {/* Title */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-xl font-semibold text-gray-900">
                Notifications
              </h1>
              <p className="text-sm text-gray-500 hidden md:block">
                Manage and review your notifications
              </p>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden md:flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                  {tab.count && tab.count > 0 && (
                    <span
                      className={`ml-2 px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="md:hidden border-t border-gray-200">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 relative py-3 flex flex-col items-center"
                >
                  <div className="flex items-center">
                    <tab.icon className="h-5 w-5 mr-2" />
                    <span
                      className={`text-sm font-medium ${
                        activeTab === tab.id ? "text-blue-600" : "text-gray-500"
                      }`}
                    >
                      {tab.label}
                    </span>
                    {tab.count && tab.count > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </div>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full"
          >
            {activeTabComponent}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Action Button for Mobile - Mark All as Read */}
      {/* {activeTab === "new" && unreadCount > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 md:hidden bg-blue-600 text-white px-4 py-3 rounded-full shadow-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors z-20"
          onClick={() => {
            // Add mark all as read functionality
            setUnreadCount(0);
          }}
        >
          <CheckCircleIcon className="h-5 w-5" />
          <span className="font-medium">Mark all as read</span>
        </motion.button>
      )} */}
    </div>
  );
};

export default NotificationPage;
