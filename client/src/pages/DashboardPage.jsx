import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import AddFactory from "../components/admin/AddFactory";
import Sidebar from "../components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import Dashboard from "../components/Dashboard";

const DashboardPage = () => {
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const { user, loading, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      Swal.fire({
        title: "Unauthorized",
        text: "Please login to continue",
        icon: "error",
      }).then(() => navigate("/"));
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="">Loading...</div>;
  }

  if (!user) {
    return null;
  }
  return (
    <div className="flex overflow-x-hidden">
      <Sidebar
        toggleSidebar={toggleSidebar}
        setToggleSidebar={setToggleSidebar}
      />

      <div className="w-full h-full">
        <Header
          toggleSidebar={toggleSidebar}
          setToggleSidebar={setToggleSidebar}
        />

        <AnimatePresence mode="wait">
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-accent w-full min-h-screen"
          >
            <Dashboard />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DashboardPage;
