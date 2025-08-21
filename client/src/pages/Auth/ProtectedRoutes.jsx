import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const ProtectedRoutes = () => {
  const { user, loading, error } = useAuth();

  if (loading) {
    return <p>Loading...</p>; // or spinner
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return user ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoutes;
