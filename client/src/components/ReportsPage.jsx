import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AddFactory from "./admin/AddFactory";
import { motion, AnimatePresence } from "framer-motion";
import Report from "./Report";

const ReportsPage = () => {
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
            <Report />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReportsPage;
