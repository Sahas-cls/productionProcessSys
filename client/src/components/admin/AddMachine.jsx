import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoSearchSharp, IoCloudUploadOutline } from "react-icons/io5";
import { MdModeEditOutline, MdDeleteForever } from "react-icons/md";
import { TbEyeSpark } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import useMachine from "../../hooks/useMachine";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import PrintableBarcode from "../PrintableBarcode";

const AddMachine = ({ onViewMachine }) => {
  const [isAddStyle, setIsAddStyle] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMachine, setEditingMachine] = useState(null);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  // to fetch machine dataset
  const { machineList, isLoading, refresh } = useMachine();
  console.log("machine list; ", machineList);

  // Get distinct style names for a machine
  const getStyleNames = (machine) => {
    if (!machine.sub_operations || machine.sub_operations.length === 0) {
      return "N/A";
    }

    const styleNames = new Set();
    machine.sub_operations.forEach((op) => {
      if (op.style?.style_name) {
        styleNames.add(op.style.style_name);
      }
    });

    return Array.from(styleNames).join(" | ") || "N/A";
  };

  // Validation schema
  const machineSchema = Yup.object().shape({
    machine_type: Yup.string().required("Machine type is required"),
    machine_no: Yup.string().required("Machine number is required"),
    machine_name: Yup.string().required("Machine name is required"),
    machine_brand: Yup.string().required("Machine brand is required"),
    machine_location: Yup.string().required("Machine location is required"),
  });

  // Animation variants
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

  const filteredMachines =
    machineList?.filter(
      (machine) =>
        machine.machine_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.machine_type.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const handleSubmit = async (values, { resetForm, setFieldError }) => {
    // const barcodeValue = JSON.stringify({
    //   machine_no: values.machine_no,
    //   machine_name: values.machine_name,
    //   status: values.status,
    // });
    console.log(values);
    // return;
    try {
      console.log(values);
      // return;
      if (editingMachine) {
        const response = await axios.put(
          `${apiUrl}/api/machine/editMachine/${values.machine_id}`,
          values,
          { withCredentials: true }
        );

        if (response.status === 200 || response.status === 201) {
          alert("Machine updated successfully");
          refresh();
        }
      } else {
        const response = await axios.post(
          `${apiUrl}/api/machine/createMachine`,
          values,
          { withCredentials: true }
        );

        if (response.status === 201) {
          alert("Machine added successfully");
          refresh();
        }
      }

      setEditingMachine(null);
      resetForm();
      setIsAddStyle(false);
    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 400) {
        const serverMsg = error.response.data.message;
        const field = error.response.data.field || "machine_no";
        setFieldError(field, serverMsg);
      } else {
        alert("An error occurred. Please try again.");
      }
    }
  };

  const handleEdit = (machine) => {
    // Map the backend data structure to form fields
    console.log("machine", machine);
    const machineToEdit = {
      machine_id: machine.machine_id,
      machine_type: machine.machine_type,
      machine_no: machine.machine_no,
      machine_name: machine.machine_name,
      machine_brand: machine.machine_brand,
      machine_location: machine.machine_location,
      status: machine.machine_status,
      service_date: machine.service_date,
      supplier: machine.supplier,
      purchase_date: machine.purchase_date,
    };

    setEditingMachine(machineToEdit);
    setIsAddStyle(true);
  };

  const handleDelete = async (machineId) => {
    if (window.confirm("Are you sure you want to delete this machine?")) {
      try {
        const response = await axios.delete(
          `${apiUrl}/api/machine/deleteMachine/${machineId}`,
          { withCredentials: true }
        );

        if (response.status === 200) {
          alert("Machine deleted successfully");
          refresh();
        }
      } catch (error) {
        console.error(error);
        alert("Failed to delete machine");
      }
    }
  };

  const initialValues = {
    machine_type: "",
    machine_no: "",
    machine_name: "",
    machine_brand: "",
    machine_location: "",
    purchase_date: "",
    supplier: "",
    service_date: "",
    status: "active",
    machine_id: "", // For editing
  };

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
            onClick={() => {
              setEditingMachine(null);
              setIsAddStyle(!isAddStyle);
            }}
          >
            {isAddStyle ? "Close Form" : "Add Machine"}
          </motion.button>
        </div>
      </motion.div>

      {/* Add/Edit Machine Form */}
      <AnimatePresence>
        {isAddStyle && (
          <motion.div
            className="bg-white p-6 rounded-lg shadow-md mb-6 duration-200"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-semibold mb-4">
              {editingMachine ? "Edit Machine" : "Add New Machine"}
            </h3>
            <Formik
              initialValues={editingMachine || initialValues}
              validationSchema={machineSchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ isSubmitting, values }) => (
                <Form>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Machine Type
                      </label>
                      <Field
                        type="text"
                        name="machine_type"
                        className="w-full p-2 border rounded-md"
                      />
                      <ErrorMessage
                        name="machine_type"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Machine Number
                      </label>
                      <Field
                        type="text"
                        name="machine_no"
                        className="w-full p-2 border rounded-md"
                        disabled={!!editingMachine}
                      />
                      <ErrorMessage
                        name="machine_no"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Machine Name
                      </label>
                      <Field
                        type="text"
                        name="machine_name"
                        className="w-full p-2 border rounded-md"
                      />
                      <ErrorMessage
                        name="machine_name"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Machine Brand
                      </label>
                      <Field
                        type="text"
                        name="machine_brand"
                        className="w-full p-2 border rounded-md"
                      />
                      <ErrorMessage
                        name="machine_brand"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Machine Location
                      </label>
                      <Field
                        type="text"
                        name="machine_location"
                        className="w-full p-2 border rounded-md"
                      />
                      <ErrorMessage
                        name="machine_location"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {/* <div className="col-span-2">
                      <h1 className="font-bold text-center tracking-wide uppercase">
                        Additional Informations
                      </h1>
                    </div> */}

                    <div className="">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Purchase Date
                      </label>
                      <Field
                        type="date"
                        name="purchase_date"
                        className="w-full p-2 border rounded-md"
                      />
                      <ErrorMessage
                        name="purchase_date"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div className="">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Supplier
                      </label>
                      <Field
                        type="text"
                        name="supplier"
                        className="w-full p-2 border rounded-md"
                      />
                      <ErrorMessage
                        name="supplier"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                    <div className="">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Service Date
                      </label>
                      <Field
                        type="date"
                        name="service_date"
                        className="w-full p-2 border rounded-md"
                      />
                      <ErrorMessage
                        name="service_date"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                    <div className="">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <div className="flex gap-6">
                        {/* Active */}
                        <div className="flex gap-4">
                          <label
                            htmlFor="status_active"
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Field
                              type="radio"
                              id="status_active"
                              name="status"
                              value="active"
                              className="h-4 w-4"
                            />
                            <span>Active</span>
                          </label>

                          {/* Inactive */}
                          <label
                            htmlFor="status_inactive"
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Field
                              type="radio"
                              id="status_inactive"
                              name="status"
                              value="inactive"
                              className="h-4 w-4"
                            />
                            <span>Inactive</span>
                          </label>
                        </div>
                      </div>
                      <ErrorMessage
                        name="service_date"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <AnimatePresence>
                      {values.status === "inactive" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: [1.2, 1] }}
                          exit={{ opacity: 0, scale: 0 }}
                          transition={{
                            type: "spring",
                          }}
                          className="grid grid-cols-1 col-span-2"
                        >
                          <label htmlFor="">Date of Breakdown</label>
                          <Field
                            type="date"
                            name="breakdown_date"
                            className="w-full p-2 border rounded-md"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <fieldset className="mt-4 border rounded-lg py-2">
                    <legend>Your barcode will appear here</legend>
                    {/* <Barcode
                      value={`${values.machine_no} | ${values.machine_name} | ${values.status}`}
                      lineColor="#13949A"
                      width={1}
                      height={90}
                    /> */}

                    <PrintableBarcode
                      value={`${values.machine_no} | ${values.machine_name} | ${values.status}`}
                    />
                  </fieldset>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-200 rounded-md"
                      onClick={() => {
                        setIsAddStyle(false);
                        setEditingMachine(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-blue-400"
                      disabled={isSubmitting}
                    >
                      {editingMachine ? "Update Machine" : "Save Machine"}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </motion.div>
        )}
      </AnimatePresence>

      {/* machines table */}
      <div className="rounded-xl overflow-hidden overflow-x-auto">
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
              <tr
                key={machine.machine_id}
                className="bg-white border hover:bg-gray-50"
              >
                <td className="py-2 text-center whitespace-nowrap border">
                  {machine.machine_type}
                </td>
                <td className="py-2 text-center whitespace-nowrap border">
                  {machine.machine_no}
                </td>
                <td className="py-2 text-center whitespace-nowrap border">
                  {machine.machine_name}
                </td>
                <td className="py-2 text-center whitespace-nowrap border">
                  {machine.machine_brand}
                </td>
                <td className="py-2 text-center whitespace-nowrap border">
                  {machine.machine_location}
                </td>
                <td className="py-2 text-center whitespace-nowrap border">
                  {getStyleNames(machine)}
                </td>
                <td className="py-2 text-center whitespace-nowrap">
                  <div className="flex justify-center gap-3">
                    <TbEyeSpark
                      onClick={() =>
                        navigate("/view-machine", { state: machine })
                      }
                      className="text-2xl text-black hover:text-blue-600 hover:scale-125 duration-300 cursor-pointer"
                    />
                    <MdModeEditOutline
                      onClick={() => handleEdit(machine)}
                      className="text-2xl text-black hover:text-yellow-600 hover:scale-125 duration-300 cursor-pointer"
                    />
                    <MdDeleteForever
                      onClick={() => handleDelete(machine.machine_id)}
                      className="text-2xl text-black hover:text-red-600 hover:scale-125 duration-300 cursor-pointer"
                    />
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
