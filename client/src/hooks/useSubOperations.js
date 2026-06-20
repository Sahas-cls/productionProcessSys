import axios from "axios";
import { useState, useEffect } from "react";

function useSubOperations(keyword) {
  const [subOperations, setSubOperations] = useState();
  const apiUrl = import.meta.env.VITE_API_URL;
  const endpoint = `${apiUrl}/api/sub-op/get-subOperations/${keyword}`;

  const fetchSubOp = async () => {
    console.log("fetching sub operations 🔨");
    try {
      const response = await axios.get(endpoint);
      if (response.status == 200) {
        setSubOperations(response.data.data);
      }
    } catch (error) {
      console.error("Error while fetching sub operations: ", error);
    }
  };

  useEffect(() => {
    fetchSubOp();
  }, [endpoint]);

  return {
    subOpList: subOperations,
    refresh: fetchSubOp,
  };
}

export default useSubOperations;
