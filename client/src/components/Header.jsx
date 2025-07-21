import { GiHamburgerMenu } from "react-icons/gi";
import { FiBell, FiUser } from "react-icons/fi";
import { useUser } from "../contexts/userContext";

const Header = ({ toggleSidebar, setToggleSidebar }) => {
  const { user } = useUser();
  const handleSidebar = () => {
    setToggleSidebar(!toggleSidebar);
  };

  return (
    <header className="flex h-14 w-full items-center justify-between bg-white px-4 py-3  border-b border-l">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Hamburger (visible on mobile only) */}
        <button className="md:hidden" onClick={handleSidebar}>
          <GiHamburgerMenu size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-500">Admin Panel</h1>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <button className="text-black hover:text-teal-600 transition-colors">
          {/* <FiBell size={20} /> */}
        </button>
        <button className="text-gray-500 hover:text-teal-600 transition-colors flex items-center">
          Hi {user?.userName || "cannot read name"}
          <FiUser size={20} />
        </button>
        {/* <div className="w-28 h-36 z-50 bg-black/70 absolute right-5 top-10 text-white">
          <ul>
            <li className="flex justify-center absolute">
              <div className="flex items-center justify-center h-full">
                <button className="bg-red-500 px-2 py-1 rounded-md hover:bg-red-600">Log out</button>
              </div>
            </li>
          </ul>
        </div> */}
      </div>
    </header>
  );
};

export default Header;
