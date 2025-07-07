import { useState, useEffect } from "react";
import axios from "axios";
// 🔧 Rename the function so React recognizes it as a custom hook
function useCustomerTypes() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [customerTypes, setCustomerTypes] = useState(null);

  const fetchCusTypes = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/customerTypes/getCustomerTypes`,
        {
          withCredentials: true,
        }
      );
      if (response.status === 200) {
        setCustomerTypes(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCusTypes();
  }, [apiUrl]);

  return {
    customerTypes,
    refresh: fetchCusTypes,
  };
}

export default useCustomerTypes;
