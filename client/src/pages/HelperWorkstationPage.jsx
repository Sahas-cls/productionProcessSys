import React, { useState } from "react";
import Header from "../components/Header";
import AddFactory from "../components/admin/AddFactory";
import Sidebar from "../components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import ViewWorkstations from "../components/ViewWorkstations";
import HelperWorkstations from "../components/HelperWorkstations";
import { useNavigate, useParams } from "react-router-dom";
import { LuConstruction } from "react-icons/lu";

const HelperWorkstationPage = () => {
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const navigator = useNavigate();
  const { styId, layoutId } = useParams();

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
            <div className="">
              {/* <div className="flex gap-x-2 text-blue-600 pt-2 px-8">
                <button
                  className="hover:underline font-semibold disabled:cursor-not-allowed"
                  onClick={() => {
                    navigator(-1);
                  }}
                >
                  Main operations
                </button>
                <div className="w-0.5 bg-black"></div>
                <button
                  disabled={true}
                  className="hover:underline font-semibold disabled:cursor-not-allowed"
                  onClick={() => {
                    setCurrentPage("HO");
                    navigator(`/helper-workstation/style/:sty-001`);
                  }}
                >
                  Helper operations
                </button>
              </div> */}
            </div>
            <HelperWorkstations styleId={styId} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HelperWorkstationPage;
