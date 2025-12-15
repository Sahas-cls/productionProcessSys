import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { motion, AnimatePresence } from "framer-motion";
import AddCustomer from "../components/admin/AddCustomer";
import AddSeason from "../components/admin/AddSeason";
import AddStyle from "../components/admin/AddStyle";
import OperationBulleting from "../components/OperationBulleting";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import AddOpExcel from "../components/AddOpExcel";
import { RiFileExcel2Fill } from "react-icons/ri";
import { AiOutlineForm } from "react-icons/ai";

const AddOperationBulletingPage = () => {
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const navigate = useNavigate();
  const [screen, setScreen] = useState("manual");
  const { user, loading, error } = useAuth();

  const handleSetScreen = (screen) => {
    setScreen(screen);
  };

  useEffect(() => {
    if (!loading && !user) {
      Swal.fire({
        title: "Unauthorized",
        text: "Please login to continue",
        icon: "error",
      }).then(() => navigate("/"));
    } else if (
      !loading &&
      user &&
      user.userRole !== "Admin" &&
      user.userRole !== "SuperAdmin"
    ) {
      navigate(-1);
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
            <div className="flex justify-end space-x-2 pt-4 px-6 text-blue-700 text-lg">
              <button
                className={`hover:underline transition-all flex items-center space-x-2 duration-300 ${
                  screen == "manual" && "underline"
                }`}
                onClick={() => setScreen("manual")}
              >
                {/* <AiOutlineForm className="text-2xl text-blue-600" /> */}
                <p className="text-blue-700">Insert Manually</p>
              </button>
              <div className="border-l-2 border-black"></div>
              <button
                className={`hover:underline transition-all duration-300 flex space-x-2 items-center ${
                  screen == "excel" && "underline"
                }`}
                onClick={() => setScreen("excel")}
              >
                {/* <RiFileExcel2Fill className="text-xl text-green-600" /> */}
                <p className="text-blue-700">Upload Excel</p>
              </button>
            </div>
            <div className="mx-4 min-h-[80vh] overflow-hidden bg-white rounded-lg">
              <AnimatePresence mode="wait">
                {screen === "excel" ? (
                  <motion.div
                    key="excel"
                    initial={{ y: 40, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -40, opacity: 0, scale: 0.98 }}
                    transition={{
                      type: "spring",
                      duration: "0.2",
                      stiffness: 100,
                      damping: 14,
                      mass: 0.9,
                    }}
                    className="h-full w-full"
                  >
                    <AddOpExcel />
                  </motion.div>
                ) : (
                  <motion.div
                    key="operation"
                    initial={{ y: 40, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -40, opacity: 0, scale: 0.98 }}
                    transition={{
                      type: "spring",
                      stiffness: 100,
                      duration: "0.2",
                      damping: 14,
                      mass: 0.9,
                    }}
                    className="h-full w-full"
                  >
                    <OperationBulleting />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AddOperationBulletingPage;
