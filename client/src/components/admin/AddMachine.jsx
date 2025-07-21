import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoSearchSharp, IoCloudUploadOutline } from "react-icons/io5";
import { MdModeEditOutline, MdDeleteForever } from "react-icons/md";
import { TbEyeSpark } from "react-icons/tb";

const AddMachine = ({ onViewMachine }) => {
  const [isAddStyle, setIsAddStyle] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Sample machine data - replace with your actual data
  const [machines, setMachines] = useState([
    {
      id: "MCH-001",
      type: "Type 1",
      name: "Example Name",
      brand: "Brand 1",
      location: "Cutting",
      styles: ["style 1", "style 2"],
    },
    {
      id: "MCH-002",
      type: "Type 2",
      name: "Example Name 2",
      brand: "Brand 2",
      location: "Sewing",
      styles: ["style 3", "style 4"],
    },
  ]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        when: "beforeChildren",
      },
    },
    exit: {
      opacity: 0,
      transition: {
        when: "afterChildren",
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10,
      },
    },
    exit: {
      y: -20,
      opacity: 0,
      transition: {
        duration: 0.1,
      },
    },
  };

  const buttonVariants = {
    hover: { scale: 1.03, boxShadow: "0px 5px 15px rgba(0,0,0,0.1)" },
    tap: { scale: 0.98 },
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const filteredMachines = machines.filter(
    (machine) =>
      machine.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      className="px-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* header of the page search download add machine */}
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pt-6"
        variants={itemVariants}
      >
        <motion.div
          className="relative w-full md:w-96"
          whileHover={{ scale: 1.01 }}
        >
          <input
            type="text"
            placeholder="Search machines..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            onChange={(e) => setSearchTerm(e.target.value)}
            value={searchTerm}
          />
          <IoSearchSharp className="absolute left-3 top-3 text-gray-400" />
        </motion.div>

        <div className="flex gap-4 w-full md:w-auto">
          <motion.button
            type="button"
            className="bg-green-600 py-2 px-6 rounded-md text-white flex-1 md:flex-none"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <div className="flex items-center gap-2">
              <IoCloudUploadOutline className="text-lg" />
              Download
            </div>
          </motion.button>
          <motion.button
            type="button"
            className="bg-blue-600 py-2 px-6 rounded-md text-white flex-1 md:flex-none"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => setIsAddStyle(!isAddStyle)}
          >
            {isAddStyle ? "Close Form" : "Add Machine"}
          </motion.button>
        </div>
      </motion.div>

      {/* Add Machine Form */}
      <AnimatePresence>
        {isAddStyle && (
          <motion.div
            className="bg-white p-6 rounded-lg shadow-md mb-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-semibold mb-4">Add New Machine</h3>
            {/* Add your form fields here */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Machine Type
                  </label>
                  <input type="text" className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Machine Number
                  </label>
                  <input type="text" className="w-full p-2 border rounded-md" />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Machine Name
                  </label>
                  <input type="text" className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Machine Brand
                  </label>
                  <input type="text" className="w-full p-2 border rounded-md" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-200 rounded-md"
                onClick={() => setIsAddStyle(false)}
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
                Save Machine
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* machines table */}
      <div className="rounded-md overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-700 to-blue-600/80 text-white">
            <tr>
              <th className="whitespace-nowrap border-r border px-2 py-3">
                Machine Type
              </th>
              <th className="whitespace-nowrap border-r border px-2 py-3">
                Machine No
              </th>
              <th className="whitespace-nowrap border-r border px-2 py-3">
                Machine Name
              </th>
              <th className="whitespace-nowrap border-r border px-2 py-3">
                Machine Brand
              </th>
              <th className="whitespace-nowrap border-r border px-2 py-3">
                Machine Location
              </th>
              <th className="whitespace-nowrap border-r border px-2 py-3">
                Existing Style
              </th>
              <th className="whitespace-nowrap border-r border px-2 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMachines.map((machine) => (
              <tr key={machine.id} className="bg-white border hover:bg-gray-50">
                <td className="py-2 text-center whitespace-nowrap border">
                  {machine.type}
                </td>
                <td className="py-2 text-center whitespace-nowrap border">
                  {machine.id}
                </td>
                <td className="py-2 text-center whitespace-nowrap border">
                  {machine.name}
                </td>
                <td className="py-2 text-center whitespace-nowrap border">
                  {machine.brand}
                </td>
                <td className="py-2 text-center whitespace-nowrap border">
                  {machine.location}
                </td>
                <td className="py-2 text-center whitespace-nowrap border">
                  {machine.styles.join(" | ")}
                </td>
                <td className="py-2 text-center whitespace-nowrap">
                  <div className="flex justify-center gap-3">
                    <TbEyeSpark
                      onClick={() => onViewMachine(machine.id)}
                      className="text-2xl text-black hover:text-blue-600 hover:scale-125 duration-300 cursor-pointer"
                    />
                    <MdModeEditOutline className="text-2xl text-black hover:text-yellow-600 hover:scale-125 duration-300 cursor-pointer" />
                    <MdDeleteForever className="text-2xl text-black hover:text-red-600 hover:scale-125 duration-300 cursor-pointer" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default AddMachine;
