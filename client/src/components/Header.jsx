import { GiHamburgerMenu } from "react-icons/gi";
import { FiUser } from "react-icons/fi";
import { useUser } from "../contexts/userContext";
import { useState, useRef, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import { MdOutlineNotificationsActive } from "react-icons/md";
import useNotifications from "../hooks/useNotifications";
import { FaDAndD } from "react-icons/fa6";

const Header = ({ toggleSidebar, setToggleSidebar }) => {
  const { user: loggedUser, loading } = useAuth();
  const { user, logout } = useUser(); // assuming logout() is defined in context
  // console.log("user name from factory page: ", user);
  const [showOptions, setShowOptions] = useState(false);
  const dropdownRef = useRef(null);
  const userName = localStorage.getItem("userName");
  const firstName = userName ? userName.split(" ")[0] : "Guest";
  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const handleSidebar = () => {
    setToggleSidebar(!toggleSidebar);
  };
  const {
    isLoading,
    notificationsList,
    refresh: refreshNotifications,
  } = useNotifications();

  // Hide the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    const response = await axios.post(
      `${apiUrl}/api/user/logout`,
      {},
      { withCredentials: true },
    );
    if (response.status === 200) {
      navigate("/", { replace: true });
    }
  };

  return (
    <header className="flex h-14 w-full items-center justify-between bg-white  px-4 py-3 relative border-b-2 border-black/20">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <button className="lg:hidden" onClick={handleSidebar}>
          <GiHamburgerMenu size={24} />
        </button>
        <h1 className="text-xl font-bold text-black/70 font-sans italic">
          {loggedUser?.userRole === "Admin" ||
          loggedUser?.userRole === "SuperAdmin"
            ? "Admin "
            : "User "}
          Panel
        </h1>
        {/* <button onClick={() => navigate("/test")}>
          <FaDAndD />
        </button> */}
      </div>

      {/* Right section */}
      <div className="flex items-center relative" ref={dropdownRef}>
        <button
          className="text-black hover:bg-gray-200 rounded-xl px-2 py-1 transition-colors flex items-center gap-2"
          onClick={() => setShowOptions(!showOptions)}
        >
          Hi {firstName || "Guest"}
          <FiUser size={20} />
        </button>

        <button
          className="hover:bg-gray-300 p-1 rounded-md group relative"
          title="Notifications"
          onClick={() => {
            navigate("/user/notifications", { state: { userId: 1 } });
          }}
        >
          <MdOutlineNotificationsActive
            size={20}
            className="group-hover:scale-105 duration-150"
          />
          {/* Only show count if there are unread notifications */}
          {notificationsList &&
            notificationsList.filter((n) => !n.isRead).length > 0 && (
              <div className="bg-red-600/80 text-white absolute rounded-full w-5 h-5 bottom-1 left-4 flex items-center justify-center text-xs font-bold">
                {/* Count only unread notifications */}
                {notificationsList.filter((n) => !n.isRead).length}
              </div>
            )}
        </button>

        {/* Dropdown */}
        {showOptions && (
          <div className="absolute right-0 top-10 w-32 bg-white border border-gray-200 rounded-md shadow-md z-50">
            <button
              onClick={() => handleLogout()}
              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
