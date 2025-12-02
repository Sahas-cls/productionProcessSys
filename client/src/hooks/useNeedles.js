import axios from "axios";
import { useState, useEffect } from "react";

function useNeedles() {
  const [isLoading, setIsLoading] = useState(false);
  const [needleList, setNeedleList] = useState([]);
  const [error, setError] = useState("");
  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchNeedles = async () => {
    try {
      const threads = await axios.get(`${apiUrl}/api/needleType/getNT`, {
        withCredentials: true,
      });

      if (threads.status === 200) {
        setNeedleList(threads.data.data);
      }
    } catch (error) {
      setError(error);
      console.error(error);
    }
  };

  useEffect(() => {
    fetchNeedles();
  }, [apiUrl]);

  return {
    needleList,
    isLoading,
    needleErrors: error,
    refreshNeedle: fetchNeedles,
  };
}

export default useNeedles;
