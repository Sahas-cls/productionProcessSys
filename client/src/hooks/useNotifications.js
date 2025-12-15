import axios from "axios";
import { useEffect, useState } from "react";

function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);

      const response = await axios.get(`${apiUrl}/api/user/get_notifications`, {
        withCredentials: true,
      });

      if (response.status === 200) {
        setNotifications(response.data?.data || []);
      }
      console.log("Notification response: ", response);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch once on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  return {
    notificationsList: notifications, // final data
    isLoading,
    refresh: fetchNotifications, // call again to refresh
  };
}

export default useNotifications;
