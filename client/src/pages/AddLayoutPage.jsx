import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import AddFactory from "../components/admin/AddFactory";
import Sidebar from "../components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import AddLineLayout from "../components/AddLineLayout";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const AddLayoutPage = () => {
  const { user, loading, error } = useAuth();
  // console.log("auth user ====== ", user);
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading) {
      if (!user) {
        Swal.fire({
          title: "Unauthorized",
          text: "Please login to continue",
          icon: "error",
        }).then(() => navigate("/"));
      } else if (user.userRole !== "Admin") {
        Swal.fire({
          title: "Unauthorized",
          text: "You are not allowed to access this page",
          icon: "error",
        }).then(() => navigate(-1));
      }
    }
  }, [loading, user, navigate]);

  const [toggleSidebar, setToggleSidebar] = useState(false);

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
            <AddLineLayout />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AddLayoutPage;
