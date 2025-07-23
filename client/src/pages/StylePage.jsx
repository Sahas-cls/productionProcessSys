import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { motion, AnimatePresence } from "framer-motion";
import AddCustomer from "../components/admin/AddCustomer";
import AddSeason from "../components/admin/AddSeason";
import AddStyle from "../components/admin/AddStyle";

const StylePage = () => {
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
            <AddStyle />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StylePage;
