import React, { useState } from "react";
import Header from "../components/Header";
import AddFactory from "../components/admin/AddFactory";
import Sidebar from "../components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import ViewLayout from "../components/ViewLayout";
import Layouts from "../components/Layouts";

const LayoutPage = () => {
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
            {/* page body */}
            <div className="p-2">
              <Layouts />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LayoutPage;
