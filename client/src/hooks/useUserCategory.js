// src/hooks/useUserCategory.js
import { useState, useEffect } from "react";
import axios from "axios";

function useUserCategory() {
  const [userCategories, setUserCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchUserCategories = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${apiUrl}/api/user/getUserCategories`
        );
        setUserCategories(response.data.data || []);
      } catch (err) {
        console.error("Failed to fetch user categories", err);
        setError("Failed to fetch user categories");
      } finally {
        setLoading(false);
      }
    };

    fetchUserCategories();
  }, [apiUrl]);

  return { userCategories, loading, error };
}

export default useUserCategory;
