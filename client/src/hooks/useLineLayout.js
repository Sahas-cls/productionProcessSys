import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export function useFetchLayout() {
  const apiUrl = import.meta.env.VITE_API_URL; // Check your Vite env variable naming
  const [lineLayout, setLineLayout] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const getLayout = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/api/layout/getLayouts`);
      if (response.status === 200) {
        setLineLayout(response.data.data);
      } else {
        setLineLayout(null);
        throw new Error("Data cannot be fetched...");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    getLayout();
  }, [getLayout]);

  return {
    isLoading,
    layoutList: lineLayout,
    refresh: getLayout,
  };
}

export default useFetchLayout;

