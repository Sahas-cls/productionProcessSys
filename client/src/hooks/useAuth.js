import { useEffect, useState } from "react";
import axios from "axios";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const validateToken = async () => {
      // alert("user auth");
      try {
        const res = await axios.get(`${apiUrl}/api/user/authCheck`, {
          withCredentials: true,
        });

        if (res.status === 200) {
  setUser(res.data.user); // { userId, userRole }
}
      } catch (err) {
        setUser(null);
        setError("Authentication failed", error?.message);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  return { user, loading, error };
};
