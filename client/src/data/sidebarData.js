import { MdFactory } from "react-icons/md";
import { MdGroups } from "react-icons/md";
import { FiCalendar } from "react-icons/fi";
import { FaTshirt } from "react-icons/fa";
import { GiSewingMachine } from "react-icons/gi";
import { PiListBulletsFill } from "react-icons/pi";
import { IoAddCircleSharp } from "react-icons/io5";
import { FaRegEye } from "react-icons/fa";
import { RiLayoutMasonryFill } from "react-icons/ri";
import { TbReport } from "react-icons/tb";
import { MdSpaceDashboard } from "react-icons/md";
import { TbNeedleThread } from "react-icons/tb";
import { FaUsersCog } from "react-icons/fa";
import { TbToolsOff } from "react-icons/tb";

export const adminSidebarData = [
  {
    id: 0,
    title: "Dashboard",
    icon: MdSpaceDashboard,
    navigateTo: "/dashboard",
  },
  {
    id: 1,
    title: "Factory",
    icon: MdFactory,
    navigateTo: "/factory",
  },
  {
    id: 2,
    title: "Customer",
    icon: MdGroups,
    navigateTo: "/customer",
  },
  {
    id: 3,
    title: "Season",
    icon: FiCalendar,
    navigateTo: "/season",
  },
  {
    id: 4,
    title: "Style",
    icon: FaTshirt,
    navigateTo: "/style",
  },
  {
    id: 5,
    title: "Machine",
    icon: GiSewingMachine,
    navigateTo: "/machine",
  },
  {
    id: 6,
    title: "Needle & Threads",
    icon: TbNeedleThread,
    navigateTo: "/needleThreats",
  },
  {
    id: 7,
    title: "Operation Bulletin",
    icon: PiListBulletsFill,
    submenu: [
      {
        id: 71,
        title: "Add New",
        icon: IoAddCircleSharp,
        navigateTo: "/operation-bulletin/add",
      },
      {
        id: 72,
        title: "View Operations",
        icon: FaRegEye,
        navigateTo: "/operation-bulletin/list",
      },
    ],
  },
  /*{
    id: 8,
    title: "Technical Data",
    icon: TbToolsOff,
    navigateTo: "/technical-data",
  },*/
  {
    id: 9,
    title: "Layout",
    icon: RiLayoutMasonryFill,
    submenu: [
      {
        id: 91,
        title: "New Layout",
        icon: IoAddCircleSharp,
        navigateTo: "/layout/create-new-layout",
      },
      {
        id: 92,
        title: "View Layout",
        icon: FaRegEye,
        navigateTo: "/layout/list-view",
      },
    ],
  },
  {
    id: 10,
    title: "Report",
    icon: TbReport,
    navigateTo: "/reports",
  },
  {
    id: 11,
    title: "Manage Users",
    icon: FaUsersCog,
    navigateTo: "/manage-users",
  },
];

export const userSidebar = [
  {
    id: 1,
    title: "Factory",
    icon: MdFactory,
    navigateTo: "/factory",
  },
  {
    id: 2,
    title: "Customer",
    icon: MdGroups,
    navigateTo: "/customer",
  },
];
