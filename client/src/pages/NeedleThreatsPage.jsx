import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { motion, AnimatePresence } from "framer-motion";
import AddCustomer from "../components/admin/AddCustomer";
import AddSeason from "../components/admin/AddSeason";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AddNeedle from "../components/AddNeedle";
import AddThreat from "../components/AddThread";
import AddThread from "../components/AddThread";

const SeasonPage = () => {
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const navigate = useNavigate();
  const { user, loading, error } = useAuth();
  const [isNeedle, setIsNeedle] = useState(true);

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
    <div className="flex overflow-x-hidden min-h-screen h-full">
      <Sidebar
        toggleSidebar={toggleSidebar}
        setToggleSidebar={setToggleSidebar}
      />
      <div className="w-full h-full">
        <Header
          toggleSidebar={toggleSidebar}
          setToggleSidebar={setToggleSidebar}
        />

        <div className="bg-gray-200 flex space-x-2 px-4 pt-2">
          <button
            className="text-blue-600 hover:underline"
            onClick={() => setIsNeedle(true)}
          >
            Manage Needles
          </button>
          <div className="w-0.5 bg-black h-6  border-white"></div>
          <button
            className="text-blue-600 hover:underline"
            onClick={() => setIsNeedle(false)}
          >
            Manage Threads
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gray-200 w-full min-h-screen"
          >
            {isNeedle ? <AddNeedle userRole={user.userRole} /> : <AddThread />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SeasonPage;
