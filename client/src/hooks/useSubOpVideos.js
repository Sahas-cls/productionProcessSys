import { useState, useEffect, useCallback } from "react";
import axios from "axios";

function useSubOpVideos(subOpId) {
  const [isLoading, setIsLoading] = useState(false);
  const [videoRecords, setVideoRecords] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchVideos = useCallback(async () => {
    if (!subOpId) {
      setVideoRecords([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.get(
        `${apiUrl}/api/subOperationMedia/getVideos/${subOpId}`
      );

      if (response.status !== 200) {
        setVideoRecords([]);
        return;
      }
      setVideoRecords(response.data.data);
    } catch (error) {
      console.error("Error while fetching medias: ", error);
      setVideoRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [subOpId, apiUrl]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return {
    isLoading,
    videosList: videoRecords,
    refreshVideos: fetchVideos,
  };
}

export default useSubOpVideos;
