import { MdFactory } from "react-icons/md"; //for factory nav
import { MdGroups } from "react-icons/md"; //for customer nav
import { FiCalendar } from "react-icons/fi"; //for season nav
import { FaTshirt } from "react-icons/fa"; // for style nav
import { GiSewingMachine } from "react-icons/gi"; // for machine nav
import { PiListBulletsFill } from "react-icons/pi"; //for operation buleting nav
import { IoAddCircleSharp } from "react-icons/io5"; //add new operation bulletin nav
import { FaRegEye } from "react-icons/fa"; //view operation nav

export const adminSidebarData = [
  {
    id: 1,
    title: "Factory",
    icon: MdFactory,
  },
  {
    id: 2,
    title: "Customer",
    icon: MdGroups,
  },
  {
    id: 3,
    title: "Season",
    icon: FiCalendar,
  },
  {
    id: 4,
    title: "Style",
    icon: FaTshirt,
  },
  {
    id: 5,
    title: "Machine",
    icon: GiSewingMachine,
  },
  {
    id: 6,
    title: "Operation Bulletin",
    icon: PiListBulletsFill,
    submenu: [
      {
        id: 51,
        title: "Add New",
        icon: IoAddCircleSharp,
        navigateTo: "addNewBO",
      },
      {
        id: 52,
        title: "View Operations",
        icon: FaRegEye,
        navigateTo: "BOList",
      },
    ],
  },
];

export const userSidebar = [
  {
    id: 1,
    title: "Factory",
    icon: MdFactory,
  },
  {
    id: 2,
    title: "Customer",
    icon: MdGroups,
  },
];
