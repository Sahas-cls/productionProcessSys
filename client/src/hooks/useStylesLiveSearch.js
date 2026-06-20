import axios from "axios";
import { useState, useEffect } from "react";

function useStylesLiveSearch(keyword) {
  const [subOperations, setSubOperations] = useState();
  const apiUrl = import.meta.env.VITE_API_URL;
  const endpoint = `${apiUrl}/api/styles/getStylesLS/${keyword}`;

  const fetchStyle = async () => {
    console.log("fetching Styles 🔨");
    try {
      const response = await axios.get(endpoint);
      if (response.status == 200) {
        setSubOperations(response.data.data);
      }
    } catch (error) {
      console.error("Error while fetching Styles: ", error);
    }
  };

  useEffect(() => {
    fetchStyle();
  }, [endpoint]);

  return {
    stylesList: subOperations,
    refresh: fetchStyle,
  };
}

export default useStylesLiveSearch;
