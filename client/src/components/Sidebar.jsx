import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import concordLogo from "../assets/Sidebar-a/concord_logo.png";
import { adminSidebarData } from "../data/sidebarData";
import { IoIosArrowDropdown } from "react-icons/io";
import { IoIosArrowDropupCircle } from "react-icons/io";
import { IoIosArrowDropup } from "react-icons/io";

const Sidebar = ({
  toggleSidebar,
  setToggleSidebar,
  currentView,
  setCurrentView,
}) => {
  const sidebarRef = useRef();
  const [expandedMenu, setExpandedMenu] = useState(null);

  const navVariant = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.4, type: "tween" },
    },
    hover: { x: 15, scale: 1.05 },
  };

  // Click outside to close
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
    setToggleSidebar(false);
    setCurrentView(view);
  };

  const toggleSubmenu = (id) => {
    setExpandedMenu((prev) => (prev === id ? null : id));
  };

  return (
    <aside
      ref={sidebarRef}
      className={`md:w-[18%] h-full ${
        toggleSidebar ? "block" : "hidden"
      } md:block w-[70%] absolute md:relative z-30 bg-white overflow-y-hidden overflow-x-hidden`}
    >
      {/* Logo */}
      <div className="flex flex-col items-center justify-center mt-10 ml-1">
        <img src={concordLogo} alt="Logo" className="w-20" />
        <h1 className="text-xl uppercase font-semibold">Concord Group</h1>
      </div>

      {/* Navigation */}
      <nav className="mt-10">
        <ul className="space-y-2 cursor-pointer px-2">
          {Array.isArray(adminSidebarData) &&
            adminSidebarData.map((item) => (
              <div key={item.id}>
                <motion.li
                  variants={navVariant}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded"
                  onClick={() =>
                    item.submenu
                      ? toggleSubmenu(item.id)
                      : handleNavigations(item.title)
                  }
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="text-2xl" />
                    <span className="text-base">{item.title}</span>
                  </div>
                  {item.submenu && (
                    <span className="text-xl">
                      {expandedMenu === item.id ? (
                        <IoIosArrowDropup />
                      ) : (
                        <IoIosArrowDropdown />
                      )}
                    </span>
                  )}
                </motion.li>

                {/* Submenu */}
                {item.submenu && expandedMenu === item.id && (
                  <ul className="ml-8 mt-1 space-y-1 text-sm text-gray-700">
                    {item.submenu.map((subItem) => (
                      <li
                        key={subItem.id}
                        className="transition flex items-center gap-2 hover:scale-110 py-2 pl-2 hover:bg-gray-200 duration-300"
                        onClick={() => handleNavigations(subItem.navigateTo)}
                      >
                        <subItem.icon className="text-xl" />
                        {subItem.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
