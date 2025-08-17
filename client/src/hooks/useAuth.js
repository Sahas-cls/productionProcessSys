import { useEffect, useState } from "react";
import axios from "axios";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const res = await axios.get("/api/auth/validate", {
          withCredentials: true,    
        });
        setUser(res.data.user);
      } catch (err) {
        setUser(null);
        setError("Authentication failed");
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  return { user, loading, error };
};
