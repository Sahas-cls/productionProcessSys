import React, { useEffect, useRef } from "react";
import { MdManageAccounts, MdFactory, MdGroups } from "react-icons/md";
import { FiCalendar } from "react-icons/fi";
import { motion } from "framer-motion";
import concordLogo from "../assets/Sidebar-a/concord_logo.png";
import { adminSidebarData } from "../data/sidebarData.js";

const Sidebar = ({
  toggleSidebar,
  setToggleSidebar,
  currentView,
  setCurrentView,
}) => {
  const sidebarRef = useRef();

  // Variants for motion animation
  const navVariant = {
    hidden: {
      scale: 0,
      opacity: 0,
    },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.4,
        type: "tween",
      },
    },
    hover: {
      x: 15,
      scale: 1.1,
    },
  };

  // Handle click outside the sidebar to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        toggleSidebar &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        setToggleSidebar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [toggleSidebar, setToggleSidebar]);

  const handleNavigations = (view) => {
    // alert(view);
    setToggleSidebar(false);
    setCurrentView(view);
  };

  return (
    <aside
      ref={sidebarRef}
      className={`md:w-[18%] ${
        toggleSidebar ? "block" : "hidden"
      } md:block w-[70%] absolute md:relative z-30 h-full bg-white border-r overflow-hidden`}
    >
      {/* Logo & Heading */}
      <div className="flex flex-col items-center justify-center mt-10 ml-1">
        <img src={concordLogo} alt="Logo" className="w-20" />
        <h1 className="text-xl uppercase font-semibold">Concord Group</h1>
      </div>

      {/* Navigation */}
      <nav className="mt-10">
        <ul className="space-y-4 cursor-pointer">
          {Array.isArray(adminSidebarData) &&
            adminSidebarData.map((item) => (
              <motion.li
                key={item.id}
                variants={navVariant}
                className="flex items-center px-2 py-2 hover:bg-gray-500/10 hover:shadow"
                initial="hidden"
                animate="visible"
                whileHover="hover"
                onClick={() => handleNavigations(item.title)}
              >
                <item.icon className="md:mr-2 text-4xl" />
                <h4 className="text-lg">{item.title}</h4>
              </motion.li>
            ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
