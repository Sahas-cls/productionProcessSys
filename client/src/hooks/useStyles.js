import axios from "axios";
import { useEffect, useState } from "react";

function useStyles() {
  const [styles, setStyles] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchStyles = async () => {
    console.log("fetching styles");
    try {
      setIsLoading(true);
      const response = await axios.get(`${apiUrl}/api/styles/getStyles`, {
        withCredentials: true,
      });

      if (response.status === 200) {
        setStyles(response.data?.data);
        // console.log("styles", response.data.data);
      }
    } catch (error) {
      console.error("Error fetching styles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStyles();
  }, []);

  return {
    stylesList: styles,
    isLoading,
    refresh: fetchStyles,
  };
}

export default useStyles;
