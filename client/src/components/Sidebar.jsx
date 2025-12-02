import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import concordLogo from "../assets/Sidebar-a/concord_logo.png";
import { adminSidebarData } from "../data/sidebarData";
import { IoIosArrowDropdown, IoIosArrowDropup } from "react-icons/io";

const Sidebar = ({ toggleSidebar, setToggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef();
  const [expandedMenu, setExpandedMenu] = useState(null);

  // Close sidebar on outside click (mobile)
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

  const handleNavigations = (path) => {
    setToggleSidebar(false); // close sidebar on mobile
    navigate(path);
  };

  const toggleSubmenu = (id) => {
    setExpandedMenu((prev) => (prev === id ? null : id));
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const navVariant = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.4, type: "tween" },
    },
    hover: { x: 15, scale: 1.05 },
  };

  const logoVariant = {
    hidden: { y: -200, opacity: 0.2 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        type: "spring",
        stiffness: 100,
        staggerChildren: 0.3,
      },
    },
  };

  const ulVariant = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.4, staggerChildren: 0.4 },
    },
    exit: { opacity: 0 },
  };

  const liVariant = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4 } },
    exit: { opacity: 0 },
  };

  return (
    <aside
      ref={sidebarRef}
      className={` md:w-[28%] lg:w-[19%] min-h-full ${
        toggleSidebar ? "block" : "hidden"
      } md:block w-[70%] fixed md:relative z-30 bg-secondary shadow-sm overflow-y-auto overflow-clip `}
    >
      {/* Logo */}
      <motion.div
        variants={logoVariant}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-center mt-10 ml-1"
      >
        <motion.img src={concordLogo} alt="Logo" className="w-9 md:w-20" />
        <motion.h1 className="mt-2 text-lg md:text-xl uppercase font-semibold text-white text-center font-sans">
          Concord Group
        </motion.h1>
      </motion.div>

      {/* Navigation */}
      <nav className="mt-10 px-2">
        <motion.ul
          variants={ulVariant}
          initial="hidden"
          animate="visible"
          className="space-y-2 cursor-pointer text-white"
        >
          {adminSidebarData.map((item) => (
            <div key={item.id}>
              <motion.li
                variants={navVariant}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className={`flex items-center justify-between px-3 py-2 rounded ${
                  isActive(item.navigateTo || "")
                    ? "bg-[#3A4156] text-white font-bold"
                    : "hover:bg-[#3A4156]"
                }`}
                onClick={() =>
                  item.submenu
                    ? toggleSubmenu(item.id)
                    : handleNavigations(item.navigateTo)
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
                <ul className="ml-8 mt-1 space-y-1 text-sm text-white">
                  {item.submenu.map((subItem) => (
                    <li
                      key={subItem.id}
                      className={`flex items-center gap-2 py-2 pl-2 rounded-md transition hover:scale-[1.03] duration-200 ${
                        isActive(subItem.navigateTo)
                          ? "bg-gray-300 font-semibold"
                          : "hover:bg-[#3A4156]"
                      }`}
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
        </motion.ul>
      </nav>
    </aside>
  );
};

export default Sidebar;