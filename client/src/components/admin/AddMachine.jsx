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
import Swal from "sweetalert2";
import { FaCheckCircle } from "react-icons/fa";
import { IoCloseCircle } from "react-icons/io5";

const AddMachine = ({ onViewMachine, userRole }) => {
  const [isAddStyle, setIsAddStyle] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMachine, setEditingMachine] = useState(null);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  // to fetch machine dataset
  const { machineList, isLoading, refresh } = useMachine();
  console.log("machine list; ", machineList);

  const handleExcelDownload = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/machine/getExcel`, {
        withCredentials: true,
        responseType: "blob", // 👈 important for file download
      });

      // Create file URL
      const fileUrl = window.URL.createObjectURL(new Blob([response.data]));

      // Create hidden download link
      const link = document.createElement("a");
      link.href = fileUrl;
      link.setAttribute("download", "machines.xlsx"); // 👈 filename
      document.body.appendChild(link);

      // Trigger click → download starts immediately
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
    } catch (error) {
      if (error.status === 401) {
        Swal.fire({
          title: "Unauthorized",
          text: "Your don't have permission to perform this action, please login again",
          icon: "error",
        }).then(() => navigate("/"));
      }
      console.error("Excel download failed:", error);
    }
  };

  // Get distinct style names for a machine
  const getStyleNames = (machine) => {
    if (!machine.sub_operations || machine.sub_operations.length === 0) {
      return "Empty";
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
          Swal.fire({
            title: "Success!",
            text: "Machine updated successfully.",
            icon: "success",
            confirmButtonText: "OK",
            confirmButtonColor: "#3085d6",
            background: "#f5f8fa",
            iconColor: "#28a745",
            showClass: {
              popup: "animate__animated animate__fadeInDown",
            },
            hideClass: {
              popup: "animate__animated animate__fadeOutUp",
            },
          });
          refresh();
        }
      } else {
        const response = await axios.post(
          `${apiUrl}/api/machine/createMachine`,
          values,
          { withCredentials: true }
        );

        if (response.status === 201) {
          Swal.fire({
            position: "center", // Top right corner
            icon: "success", // Success icon
            title: "Machine added successfully!",
            showConfirmButton: true, //show ok btn
            timer: 3000, // Auto close after 3 seconds
            timerProgressBar: true, // Show progress bar
            background: "#f5f8fa",
            iconColor: "#28a745", // Green icon
          });
          refresh();
        }
      }

      setEditingMachine(null);
      resetForm();
      setIsAddStyle(false);
    } catch (error) {
      console.error(error);
      if (error.status === 401) {
        Swal.fire({
          title: "Unauthorized",
          text: "Your don't have permission to perform this action, please login again",
          icon: "error",
        }).then(() => navigate("/"));
      }
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
      service_date: machine.service_date
        ? new Date(machine.service_date).toISOString().split("T")[0]
        : "",
      supplier: machine.supplier,
      purchase_date: machine.purchase_date
        ? new Date(machine.purchase_date).toISOString().split("T")[0]
        : "",
      breakdown_date: machine.breakdown_date
        ? new Date(machine.purchase_date).toISOString().split("T")[0]
        : "",
    };

    setEditingMachine(machineToEdit);
    setIsAddStyle(true);
  };

  const handleDelete = async (machineId) => {
    const isConfirmed = await Swal.fire({
      title: "Are you sure?",
      text: "Deleting this machine is permanent and cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33", // red for destructive action
      cancelButtonColor: "#3085d6", // blue for safe action
      reverseButtons: true, // places cancel button on the left
      background: "#f5f8fa",
      showClass: {
        popup: "animate__animated animate__fadeInDown",
      },
      hideClass: {
        popup: "animate__animated animate__fadeOutUp",
      },
    });

    if (!isConfirmed.isConfirmed) {
      return;
    }

    try {
      const response = await axios.delete(
        `${apiUrl}/api/machine/deleteMachine/${machineId}`,
        { withCredentials: true }
      );

      if (response.status === 200) {
        Swal.fire({
          title: "Operation Successful!",
          text: "The machine has been added successfully.",
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#3085d6",
          background: "#f5f8fa",
          iconColor: "#28a745",
          timer: 3000,
          timerProgressBar: true,
        });

        refresh();
      }
    } catch (error) {
      console.error(error);
      if (error.status === 401) {
        Swal.fire({
          title: "Unauthorized",
          text: "Your don't have permission to perform this action, please login again",
          icon: "error",
        }).then(() => navigate("/"));
      }
      // alert("Failed to delete machine");
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
    breakdown_date: "",
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
            className="bg-green-600 py-1 md:py-2 px-6 md:px-6 rounded-md text-white flex-1 md:flex-none text-sm md:text-base"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => handleExcelDownload()}
          >
            <div className="flex items-center gap-2">
              <IoCloudUploadOutline className="text-lg" />
              Download
            </div>
          </motion.button>
          {userRole === "Admin" ? (
            <motion.button
              type="button"
              className="bg-blue-600 py-2 px-6 rounded-md text-white flex-1 md:flex-none text-sm md:text-base"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => {
                setEditingMachine(null);
                setIsAddStyle(!isAddStyle);
              }}
            >
              {isAddStyle ? "Close" : "Add"}
            </motion.button>
          ) : (
            ""
          )}
        </div>
      </motion.div>

      {/* Add/Edit Machine Form */}
      <AnimatePresence>
        {isAddStyle && (
          <motion.div
            className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 duration-200 mx-2 sm:mx-0"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-lg sm:text-xl font-semibold mb-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Machine Type
                      </label>
                      <Field
                        type="text"
                        name="machine_type"
                        className="w-full p-2 border rounded-md text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="machine_type"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Machine Number
                      </label>
                      <Field
                        type="text"
                        name="machine_no"
                        className="w-full p-2 border rounded-md text-sm sm:text-base"
                        disabled={!!editingMachine}
                      />
                      <ErrorMessage
                        name="machine_no"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Machine Name
                      </label>
                      <Field
                        type="text"
                        name="machine_name"
                        className="w-full p-2 border rounded-md text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="machine_name"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Machine Brand
                      </label>
                      <Field
                        type="text"
                        name="machine_brand"
                        className="w-full p-2 border rounded-md text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="machine_brand"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Machine Location
                      </label>
                      <Field
                        type="text"
                        name="machine_location"
                        className="w-full p-2 border rounded-md text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="machine_location"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Purchase Date
                      </label>
                      <Field
                        type="date"
                        name="purchase_date"
                        className="w-full p-2 border rounded-md text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="purchase_date"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Supplier
                      </label>
                      <Field
                        type="text"
                        name="supplier"
                        className="w-full p-2 border rounded-md text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="supplier"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Service Date
                      </label>
                      <Field
                        type="date"
                        name="service_date"
                        className="w-full p-2 border rounded-md text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="service_date"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
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
                            <span className="text-sm sm:text-base">Active</span>
                          </label>

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
                            <span className="text-sm sm:text-base">
                              Inactive
                            </span>
                          </label>
                        </div>
                      </div>
                      <ErrorMessage
                        name="service_date"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
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
                          className="sm:col-span-2 lg:col-span-3"
                        >
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date of Breakdown
                          </label>
                          <Field
                            type="date"
                            name="breakdown_date"
                            className="w-full p-2 border rounded-md text-sm sm:text-base"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <fieldset className="mt-4 border rounded-lg p-3 sm:p-4">
                    <legend className="text-sm sm:text-base px-2">
                      Your barcode will appear here
                    </legend>
                    <div className="flex justify-center w-[100px]">
                      <PrintableBarcode
                        value={`${values.machine_no} | ${values.machine_name} | ${values.status}`}
                      />
                    </div>
                  </fieldset>

                  <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-200 rounded-md text-sm sm:text-base order-2 sm:order-1"
                      onClick={() => {
                        setIsAddStyle(false);
                        setEditingMachine(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-blue-400 text-sm sm:text-base order-1 sm:order-2"
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
      <div className="rounded-xl overflow-hidden overflow-x-auto pb-6">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-700 to-blue-600/80 text-white text-sm md:text-base">
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
              {userRole === "Admin" ? (
                <th className="whitespace-nowrap border-r border px-2 py-3">
                  Actions
                </th>
              ) : (
                ""
              )}
            </tr>
          </thead>
          <tbody className="text-sm md:text-base">
            {Array.isArray(filteredMachines) && filteredMachines.length > 0 ? (
              filteredMachines.map((machine) => (
                <tr
                  key={machine.machine_id}
                  className="bg-white border hover:bg-gray-50"
                >
                  <td className="py-2 text-center whitespace-nowrap border">
                    <span className="flex items-center justify-center gap-x-2">
                      {machine.machine_status === "active" ? (
                        <FaCheckCircle className="text-green-600" />
                      ) : (
                        <IoCloseCircle className="text-red-600" />
                      )}
                      {machine.machine_type}
                    </span>
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
                  {userRole === "Admin" && (
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
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={userRole === "Admin" ? 7 : 6}
                  className="text-center py-4"
                >
                  There are no machines yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default AddMachine;
