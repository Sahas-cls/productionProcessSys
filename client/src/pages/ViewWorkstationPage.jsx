import React, { useState } from "react";
import Header from "../components/Header";
import AddFactory from "../components/admin/AddFactory";
import Sidebar from "../components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import ViewWorkstations from "../components/ViewWorkstations";
import { useNavigate, useParams } from "react-router-dom";

const ViewWorkstationPage = () => {
  // alert("author role: ", userRole);
  const {
    layoutId: pLayoutId,
    layoutId: upLayoutId,
    styleId,
    styleNo: pStyleNo,
  } = useParams();
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const navigator = useNavigate();
  const [layoutId, setLayoutId] = useState(upLayoutId || null);
  const [styleNo, setStyleNo] = useState(styleId || null);
  // const [currentPage, setCurrentPage] = useState("SO");
  // alert(currentPage);
  console.log(`layout id: ${layoutId} && style no: ${styleNo}`);
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
            {/* <div className="">
              <div className="flex gap-x-2 text-blue-600 pt-2 px-8">
                <button
                  className="hover:underline font-semibold disabled:cursor-not-allowed"
                  disabled={true}
                >
                  Main operations
                </button>
                <div className="w-0.5 bg-black"></div>
                <button
                  className="hover:underline font-semibold"
                  onClick={() =>
                    layoutId != ""
                      ? navigator(`/helper-workstation/${styleNo}/${layoutId}`)
                      : ""
                  }
                >
                  Helper operations
                </button>
              </div>
            </div> */}
            <ViewWorkstations
              setLayoutId={setLayoutId}
              setStyleNo={setStyleNo}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ViewWorkstationPage;
