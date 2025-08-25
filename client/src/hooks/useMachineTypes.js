import { useState, useEffect } from "react";
import axios from "axios";

export function useMachineTypes() {
  const [machineTypes, setMachinTypes] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchMachineTypes = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/api/machine/getMachineTypes`);
      response.status === 200 ? setMachinTypes(response.data.data) : "";
      console.log("machine details: ", response.data.data);
    } catch (error) {
      console.log("Error while fetching machine types: ", error);
    }
  };

  useEffect(() => {
    fetchMachineTypes();
  }, []);

  return {
    machineTList: machineTypes,
    machineTLoading: isLoading,
    machineTRefresh: fetchMachineTypes,
  };
}

export default useMachineTypes;
