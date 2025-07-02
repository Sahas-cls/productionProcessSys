// useFactories.js
import axios from "axios";
import { useState, useEffect } from "react";

function useFactories() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [factoryList, setFactoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFactories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `${apiUrl}/api/factories/getFactories`,
        { withCredentials: true }
      );
      if (response.status === 200) {
        setFactoryList(response.data.data || []);
      }
    } catch (err) {
      setError(err);
      setFactoryList([]);
      console.error("Failed to fetch factories:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchFactories();
  }, [apiUrl]);

  return {
    factories: factoryList,
    loading,
    error,
    refresh: fetchFactories, // Expose the refresh function
  };
}

export default useFactories;