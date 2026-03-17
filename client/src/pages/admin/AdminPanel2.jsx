import React, { useState } from "react";
import Sidebar from "../../components/Sidebar.jsx";
import Header from "../../components/Header.jsx";
import AddFactory from "../../components/admin/AddFactory.jsx";
import useScreenWidth from "../../hooks/useScreenWidth.js";
import AddCustomer from "../../components/admin/AddCustomer.jsx";
import AddSeason from "../../components/admin/AddSeason.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "../../contexts/userContext.jsx";
import { useNavigate } from "react-router-dom";
import AddStyle from "../../components/admin/AddStyle.jsx";
import AddMachine from "../../components/admin/AddMachine.jsx";
import ViewMachine from "../../components/ViewMachine.jsx";
import OperationBulleting from "../../components/OperationBulleting.jsx";
import ViewOperationBulleting from "../../components/ViewOperationBulleting.jsx";
import ViewOperation from "../../components/ViewOperation.jsx";

const AdminPanel = () => {
  const screenWidth = useScreenWidth();
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const [currentView, setCurrentView] = useState({
    name: "Factory",
    params: null,
  });
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

  const renderView = () => {
    switch (currentView.name) {
      case "Factory":
        return <AddFactory />;
      case "Customer":
        return <AddCustomer />;
      case "Season":
        return <AddSeason />;
      case "Style":
        return <AddStyle />;
      case "addNewBO":
        return <OperationBulleting />;
      case "BOList":
        return (
          <ViewOperationBulleting
            onViewBO={(data) =>
              setCurrentView({
                name: "viewOB",
                params: { operation: data },
              })
            }
          />
        );
      case "Machine":
        return (
          <AddMachine
            onViewMachine={(id) =>
              setCurrentView({
                name: "MachineDetail",
                params: { machineId: id },
              })
            }
          />
        );
      case "MachineDetail":
        return (
          <ViewMachine
            machineId={currentView.params?.machineId}
            onBack={() => setCurrentView({ name: "Machine", params: null })}
          />
        );
      case "Operation Bulletin":
        return <OperationBulleting />;
      case "viewOB":
        return (
          <ViewOperation
            operation={currentView.params}
            onBack={() => setCurrentView({ name: "Machine", params: null })}
          />
        );

      default:
        return (
          <AddMachine
            onViewMachine={(id) =>
              setCurrentView({
                name: "MachineDetail",
                params: { machineId: id },
              })
            }
          />
        );
    }
  };

  // useEffect(() => {
  //   if (!user || user.userCategoryN !== "Admin") {
  //     navigate("/login");
  //   }
  // }, [user, navigate]);

  return (
    <div className="flex overflow-x-hidden min-h-screen h-full">
      <Sidebar
        toggleSidebar={toggleSidebar}
        setToggleSidebar={setToggleSidebar}
        currentView={currentView.name}
        setCurrentView={(viewName) =>
          setCurrentView({ name: viewName, params: null })
        }
      />
      <div className="w-full h-full">
        <Header
          toggleSidebar={toggleSidebar}
          setToggleSidebar={setToggleSidebar}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentView.name}
            variants={pageVariant}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gray-200 w-full min-h-screen"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminPanel;
