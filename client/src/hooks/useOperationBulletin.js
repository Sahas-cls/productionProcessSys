import axios from "axios";
import { useEffect, useState } from "react";
const apiUrl = import.meta.env.VITE_API_URL;

function useOperationBulleting() {
  const [operationBulletingList, setOperationBulletingList] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBulletings = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${apiUrl}/api/operationBuleting/getAllOB`,
        {
          withCredentials: true,
        }
      );
      if (response.status === 200) {
        console.log("response:- ", response.data.data);
        setOperationBulletingList(response.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBulletings();
  }, []);

  return {
    isLoading,
    refreshOB: fetchBulletings,
    operationBulletingList,
    setOperationBulletingList,
  };
}

export default useOperationBulleting;
