import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import AddFactory from "../../components/admin/AddFactory";
import useScreenWidth from "../../hooks/useScreenWidth.js";
import AddCustomer from "../../components/admin/AddCustomer.jsx";
import AddSeason from "../../components/admin/AddSeason.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "../../contexts/userContext.jsx";
import { useNavigate } from "react-router-dom";
import AddStyle from "../../components/admin/AddStyle.jsx";

const AdminPanel = () => {
  const screenWidth = useScreenWidth();
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const [currentView, setCurrentView] = useState("Factory");
  const { user } = useUser();
  const navigate = useNavigate();

  const pageVariant = {
    hidden: {
      x: -200,
      opacity: 0,
      transition: {
        duration: 0.5,
        ease: "easeInOut",
      },
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeInOut",
      },
    },
    exit: {
      x: 200,
      opacity: 0,
      transition: {
        duration: 0.5,
        ease: "easeInOut",
      },
    },
  };

  const views = {
    Factory: <AddFactory />,
    Customer: <AddCustomer />,
    Season: <AddSeason />,
    Style: <AddStyle />,
  };

  // useEffect(() => {
  //   if (!user || user.userCategoryN !== "Admin") {
  //     navigate("/login");
  //   }
  // }, [user, navigate]);

  return (
    <div className="flex overflow-x-hidden">
      <Sidebar
        toggleSidebar={toggleSidebar}
        setToggleSidebar={setToggleSidebar}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />
      <div className="w-full">
        <Header
          toggleSidebar={toggleSidebar}
          setToggleSidebar={setToggleSidebar}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            variants={pageVariant}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gray-200" // Add some padding
          >
            {views[currentView]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminPanel;
