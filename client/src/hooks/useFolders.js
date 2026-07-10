// hooks/useFolders.js
import { useState, useEffect } from "react";
import axios from "axios";

const useFolders = (keyword, type = "jig") => {
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
        // Determine which endpoint to use based on type
        const endpoint =
          type === "jig"
            ? `${apiUrl}/api/jig-folders/get-folders/${keyword}`
            : `${apiUrl}/api/attachment-folder/get-folders/${keyword}`;

        const response = await axios.get(endpoint, {
          withCredentials: true,
        });
        setFolders(response.data.data || []);
      } catch (error) {
        console.error(`Error fetching ${type} folders:`, error);
        setError(
          error.response?.data?.msg || `Failed to fetch ${type} folders`,
        );
        setFolders([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchFolders, 300);
    return () => clearTimeout(debounceTimer);
  }, [keyword, type]);

  const refresh = () => {
    if (keyword && keyword.trim().length > 2) {
      setFolders([]);
    }
  };

  return { folders, loading, error, refresh };
};

export default useFolders;
