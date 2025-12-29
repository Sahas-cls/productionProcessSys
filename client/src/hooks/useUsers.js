import axios from "axios";
import React, { useState, useEffect } from "react";

function useUsers() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${apiUrl}/api/user/getAllUsers`, {
        withCredentials: true,
      });
      console.log("users count from hook: ", response);
      setUsers(response.data.data || []);
    } catch (error) {
      console.error(error);
      setUsers([]);
      setErrors(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [apiUrl]);

  return {
    usersList: users,
    usersLoading: isLoading,
    userError: errors,
    refreshUsers: fetchUsers,
  };
}

export default useUsers;
