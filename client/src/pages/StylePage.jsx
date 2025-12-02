import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { motion, AnimatePresence } from "framer-motion";
import AddStyle from "../components/admin/AddStyle";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";

const StylePage = () => {
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      Swal.fire({
        title: "Unauthorized",
        text: "Please login to continue",
        icon: "error",
      }).then(() => navigate("/"));
    }
  }, [user, loading, navigate]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-200 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        toggleSidebar={toggleSidebar}
        setToggleSidebar={setToggleSidebar}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto">
        <Header
          toggleSidebar={toggleSidebar}
          setToggleSidebar={setToggleSidebar}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key="add-style"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="p-4 flex-1 min-h-[calc(100vh-64px)]" // 64px if header height
          >
            <AddStyle userRole={user.userRole} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StylePage;
