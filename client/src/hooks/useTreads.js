import axios from "axios";
import { useState, useEffect } from "react";

function useThreads() {
  const [isLoading, setIsLoading] = useState(false);
  const [threadList, setTreadList] = useState([]);
  const [error, setError] = useState("");
  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchTreads = async () => {
    try {
      const threads = await axios.get(`${apiUrl}/api/thread/getThread`, {
        withCredentials: true,
      });

      if (threads.status === 200) {
        setTreadList(threads.data.data);
      }
    } catch (error) {
      setError(error);
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTreads();
  }, [apiUrl]);

  return {
    threadList,
    isLoading,
    treadErrors: error,
    refreshThreads: fetchTreads,
  };
}

export default useThreads;
