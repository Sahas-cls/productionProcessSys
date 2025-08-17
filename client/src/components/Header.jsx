import { GiHamburgerMenu } from "react-icons/gi";
import { FiUser } from "react-icons/fi";
import { useUser } from "../contexts/userContext";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Header = ({ toggleSidebar, setToggleSidebar }) => {
  const { user, logout } = useUser(); // assuming logout() is defined in context
  console.log("user name from factory page: ", user);
  const [showOptions, setShowOptions] = useState(false);
  const dropdownRef = useRef(null);
  const userName = localStorage.getItem("userName");
  const firstName = userName ? userName.split(" ")[0] : "Guest";
  const navigate = useNavigate();

  const handleSidebar = () => {
    setToggleSidebar(!toggleSidebar);
  };

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

  return (
    <header className="flex h-14 w-full items-center justify-between bg-white px-4 py-3 border-b border-l relative">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <button className="md:hidden" onClick={handleSidebar}>
          <GiHamburgerMenu size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-500">Admin Panel</h1>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        <button
          className="text-gray-500 hover:text-teal-600 transition-colors flex items-center gap-2"
          onClick={() => setShowOptions(!showOptions)}
        >
          Hi {firstName || "Guest"}
          <FiUser size={20} />
        </button>

        {/* Dropdown */}
        {showOptions && (
          <div className="absolute right-0 top-10 w-32 bg-white border border-gray-200 rounded-md shadow-md z-50">
            <button
              onClick={() => navigate("/")}
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
