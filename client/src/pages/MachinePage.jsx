import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { motion, AnimatePresence } from "framer-motion";
import AddCustomer from "../components/admin/AddCustomer";
import AddSeason from "../components/admin/AddSeason";
import AddStyle from "../components/admin/AddStyle";
import AddMachine from "../components/admin/AddMachine";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";

const MachinePage = () => {
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const navigate = useNavigate();
  const { user, loading, error } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      Swal.fire({
        title: "Unauthorized",
        text: "Please login to continue",
        icon: "error",
      }).then(() => navigate("/"));
    }
  }, [user, loading, navigate]);

  // Debug: Check if sidebar should be visible
  useEffect(() => {
    // console.log("Sidebar state:", {
    //   toggleSidebar,
    //   screenWidth: window.innerWidth,
    //   isMediumScreen: window.innerWidth >= 768
    // });
  }, [toggleSidebar]);

  if (loading) {
    return <div className="">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-200">
      {/* Sidebar */}
      <Sidebar
        toggleSidebar={toggleSidebar}
        setToggleSidebar={setToggleSidebar}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          toggleSidebar={toggleSidebar}
          setToggleSidebar={setToggleSidebar}
        />

        <main className="flex-1 p-4 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AddMachine userRole={user.userRole} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default MachinePage;
