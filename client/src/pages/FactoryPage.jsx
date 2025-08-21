import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import AddFactory from "../components/admin/AddFactory";
import Sidebar from "../components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const FactoryPage = () => {
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

        <AnimatePresence mode="wait">
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gray-200 w-full min-h-screen"
          >
            <AddFactory userRole={user.userRole} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FactoryPage;
