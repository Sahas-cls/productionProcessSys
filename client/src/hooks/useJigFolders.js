// hooks/useJigFolders.js
import { useState, useEffect } from "react";
import axios from "axios";

const useJigFolders = (keyword) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!keyword || keyword.trim().length <= 2) {
      setFolders([]);
      return;
    }

    const fetchFolders = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const response = await axios.get(
          `${apiUrl}/api/jig-folders/get-folders/${keyword}`,
          { withCredentials: true },
        );
        setFolders(response.data.data || []);
      } catch (error) {
        console.error("Error fetching folders:", error);
        setError(error.response?.data?.message || "Failed to fetch folders");
        setFolders([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchFolders, 300);
    return () => clearTimeout(debounceTimer);
  }, [keyword]);

  const refresh = () => {
    if (keyword && keyword.trim().length > 2) {
      // Trigger refetch
      setFolders([]);
      // The useEffect will run again
    }
  };

  return { folders, loading, error, refresh };
};

export default useJigFolders;
