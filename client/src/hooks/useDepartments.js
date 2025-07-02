import { useState, useEffect } from "react";
import axios from "axios";

function useDepartments(factoryId) {
  const [departmentList, setDepartmentList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!factoryId) {
      setDepartmentList([]); // reset if no factory selected
      return;
    }

    const controller = new AbortController();
    const fetchDepartments = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(
          `${apiUrl}/api/departments/${factoryId}`,
          { signal: controller.signal }
        );
        setDepartmentList(response.data.data || []);
      } catch (err) {
        if (axios.isCancel(err)) {
          // Request was canceled
          console.log("Request canceled:", err.message);
        } else {
          setError("Failed to load departments");
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();

    // Cleanup: cancel previous request if factoryId changes quickly
    return () => controller.abort();
  }, [factoryId, apiUrl]);

  return {
    data: departmentList,
    loading,
    error,
  };
}

export default useDepartments;
