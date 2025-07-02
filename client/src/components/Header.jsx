import { GiHamburgerMenu } from "react-icons/gi";
import { FiBell, FiUser } from "react-icons/fi";
import { useUser } from "../contexts/userContext";

const Header = ({ toggleSidebar, setToggleSidebar }) => {
  const { user } = useUser();
  const handleSidebar = () => {
    setToggleSidebar(!toggleSidebar);
  };

  return (
    <header className="flex h-14 w-full items-center justify-between bg-white px-4 py-3  border-b">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Hamburger (visible on mobile only) */}
        <button className="md:hidden" onClick={handleSidebar}>
          <GiHamburgerMenu size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-700">Admin Panel</h1>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <button className="text-gray-600 hover:text-teal-600 transition-colors">
          {/* <FiBell size={20} /> */}
        </button>
        <button className="text-gray-600 hover:text-teal-600 transition-colors flex items-center">
          Hi {user?.userName || "cannot read name"}
          <FiUser size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
