// import { MdFactory } from "react-icons/md"; //for factory nav
// import { MdGroups } from "react-icons/md"; //for customer nav
// import { FiCalendar } from "react-icons/fi"; //for season nav
// import { FaTshirt } from "react-icons/fa"; // for style nav
// import { GiSewingMachine } from "react-icons/gi"; // for machine nav
// import { PiListBulletsFill } from "react-icons/pi"; //for operation buleting nav
// import { IoAddCircleSharp } from "react-icons/io5"; //add new operation bulletin nav
// import { FaRegEye } from "react-icons/fa"; //view operation nav

// export const adminSidebarData = [
//   {
//     id: 1,
//     title: "Factory",
//     icon: MdFactory,
//   },
//   {
//     id: 2,
//     title: "Customer",
//     icon: MdGroups,
//   },
//   {
//     id: 3,
//     title: "Season",
//     icon: FiCalendar,
//   },
//   {
//     id: 4,
//     title: "Style",
//     icon: FaTshirt,
//   },
//   {
//     id: 5,
//     title: "Machine",
//     icon: GiSewingMachine,
//   },
//   {
//     id: 6,
//     title: "Operation Bulletin",
//     icon: PiListBulletsFill,
//     submenu: [
//       {
//         id: 51,
//         title: "Add New",
//         icon: IoAddCircleSharp,
//         navigateTo: "addNewBO",
//       },
//       {
//         id: 52,
//         title: "View Operations",
//         icon: FaRegEye,
//         navigateTo: "BOList",
//       },
//     ],
//   },
// ];

// export const userSidebar = [
//   {
//     id: 1,
//     title: "Factory",
//     icon: MdFactory,
//   },
//   {
//     id: 2,
//     title: "Customer",
//     icon: MdGroups,
//   },
// ];

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

export const adminSidebarData = [
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
    title: "Operation Bulletin",
    icon: PiListBulletsFill,
    submenu: [
      {
        id: 61,
        title: "Add New",
        icon: IoAddCircleSharp,
        navigateTo: "/operation-bulletin/add",
      },
      {
        id: 62,
        title: "View Operations",
        icon: FaRegEye,
        navigateTo: "/operation-bulletin/list",
      },
    ],
  },
  {
    id: 7,
    title: "Layout",
    icon: RiLayoutMasonryFill,
    submenu: [
      {
        id: 71,
        title: "New Layout",
        icon: IoAddCircleSharp,
        navigateTo: "/layout/create-new-layout",
      },
      {
        id: 72,
        title: "View Layout",
        icon: FaRegEye,
        navigateTo: "/layout/list-view",
      },
    ],
  },
  {
    id: 8,
    title: "Report",
    icon: TbReport,
    navigateTo: "/reports",
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
