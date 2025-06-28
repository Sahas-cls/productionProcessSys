import React from "react";
import { MdManageAccounts } from "react-icons/md";
import concordLogo from "../assets/Sidebar-a/concord_logo.png";
import { MdFactory } from "react-icons/md"; //for factory nav
import { MdGroups } from "react-icons/md"; //for customer nav
import { FiCalendar } from "react-icons/fi"; //for season nav
import { motion, AnimatePresence, transform, scale } from "framer-motion";
import { adminSidebarData } from "../data/sidebarData.js";

const Sidebar = () => {
  const navVareant = {
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
    exit: {},
  };
  return (
    <aside className="md:w-[15%] h-screen bg-white border-r overflow-hidden">
      <div className="flex flex-col items-center justify-center mt-10 ml-1">
        <img src={concordLogo} alt="Logo" className="w-20" />
        <h1 className="text-xl uppercase font-semibold">Concord Group</h1>
      </div>
      <nav className="mt-10">
        <ul className="space-y-4 cursor-pointer">
          {/* nav */}

          {Array.isArray(adminSidebarData) &&
            adminSidebarData.map((item) => {
              return (
                <motion.li
                  variants={navVareant}
                  className="flex items-center px-2 py-2 hover:bg-gray-500/10 hover:shadow"
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                >
                  <item.icon className="md:mr-2 text-4xl" />
                  <h4 className="text-lg">{item.title}</h4>
                </motion.li>
              );
            })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
