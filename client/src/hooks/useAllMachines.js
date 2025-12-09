import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export function useAllMachine() {
  const apiUrl = import.meta.env.VITE_API_URL; // Check your Vite env variable naming
  const [machines, setMachies] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const getMachine = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/api/machine/getMachiens`);
      if (response.status === 200) {
        setMachies(response.data.data);
      } else {
        setMachies(null);
        throw new Error("Data cannot be fetched...");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    getMachine();
  }, [getMachine]);

  return {
    isLoading,
    machineList: machines,
    refresh: getMachine,
  };
}

export default useAllMachine;
