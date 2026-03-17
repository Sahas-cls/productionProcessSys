import axios from "axios";
import { useState, useEffect } from "react";

function useCustomer() {
  const [customerList, setCustomerList] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/customers/getCustomers`, {
        withCredentials: true,
      });

      if (response.status === 200) {
        // alert("got the customers list");
        setCustomerList(response.data.data);
      }
    } catch (error) {
      console.log(error);
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [apiUrl]);

  return {
    customerList: customerList,
    refresh: fetchCustomers,
  };
}

export default useCustomer;
