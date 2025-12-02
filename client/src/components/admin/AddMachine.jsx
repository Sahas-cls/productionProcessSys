import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoSearchSharp, IoCloudUploadOutline } from "react-icons/io5";
import { MdModeEditOutline, MdDeleteForever } from "react-icons/md";
import { TbEyeSpark } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { useReactToPrint } from "react-to-print";
import PrintableQRCode from "../PrintableQRCode";
import Swal from "sweetalert2";
import { FaCheckCircle } from "react-icons/fa";
import { IoCloseCircle } from "react-icons/io5";
import { RiFileExcel2Line } from "react-icons/ri";
import { IoMdAdd } from "react-icons/io";
import { IoClose } from "react-icons/io5";
import UploadMachine from "../UploadMachine";
import useLimitedMachine from "../../hooks/useLimitedMachines";

const AddMachine = ({ onViewMachine, userRole }) => {
  const [isAddStyle, setIsAddStyle] = useState(false);
  const [isUploadExcel, setIsUploadExcel] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMachine, setEditingMachine] = useState(null);
  const [machineCount, setMachineCount] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [backendSearchResults, setBackendSearchResults] = useState(null);

  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Custom hook for machine data
  const { machineList, isLoading, refresh } = useLimitedMachine();

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

  // Validation schema
  const machineSchema = Yup.object().shape({
    machine_type: Yup.string().required("Machine type is required"),
    machine_no: Yup.string().required("Machine number is required"),
    machine_name: Yup.string().required("Machine name is required"),
    machine_brand: Yup.string().required("Machine brand is required"),
    machine_location: Yup.string().required("Machine location is required"),
  });

  // Initial form values
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
    machine_id: "",
  };

  // Effects
  useEffect(() => {
    countMachines();
  }, [machineList]);

  useEffect(() => {
    // Reset backend search results when search term is cleared
    if (!searchTerm) {
      setBackendSearchResults(null);
    }
  }, [searchTerm]);

  // API calls
  const countMachines = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/machine/countMachines`, {
        withCredentials: true,
      });
      if (response.status === 200) {
        setMachineCount(response.data.count);
      }
    } catch (error) {
      console.error("Count error:", error);
      handleAuthError(error);
    }
  };

  const handleExcelDownload = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/machine/getExcel`, {
        withCredentials: true,
        responseType: "blob",
      });

      const fileUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = fileUrl;
      link.setAttribute("download", "machines.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
    } catch (error) {
      handleAuthError(error);
      console.error("Excel download failed:", error);
    }
  };

  const search = async (searchKey) => {
    if (!searchKey.trim()) {
      setBackendSearchResults(null);
      return [];
    }

    setSearchLoading(true);
    try {
      const searchRes = await axios.get(
        `${apiUrl}/api/machine/filter/${encodeURIComponent(searchKey)}`
      );

      if (searchRes.status === 200) {
        setBackendSearchResults(searchRes.data.data);
        return searchRes.data.data;
      }
      return [];
    } catch (error) {
      console.error("Search error:", error);
      setBackendSearchResults([]);
      return [];
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((searchKey) => {
      search(searchKey);
    }, 500),
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim()) {
      debouncedSearch(value);
    } else {
      setBackendSearchResults(null);
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

  // Filter machines based on search
  const filteredMachines = useMemo(() => {
    // If we have backend search results, use them
    if (backendSearchResults !== null) {
      return backendSearchResults;
    }

    // Otherwise, filter locally
    if (!searchTerm) return machineList;

    const lowerSearch = searchTerm.toLowerCase();
    return machineList.filter(
      (machine) =>
        machine.machine_no?.toLowerCase().includes(lowerSearch) ||
        machine.machine_name?.toLowerCase().includes(lowerSearch) ||
        machine.machine_type?.toLowerCase().includes(lowerSearch) ||
        machine.machine_brand?.toLowerCase().includes(lowerSearch) ||
        machine.machine_location?.toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm, machineList, backendSearchResults]);

  // Form submission
  const handleSubmit = async (values, { resetForm, setFieldError }) => {
    try {
      let response;

      if (editingMachine) {
        response = await axios.put(
          `${apiUrl}/api/machine/editMachine/${values.machine_id}`,
          values,
          { withCredentials: true }
        );
      } else {
        response = await axios.post(
          `${apiUrl}/api/machine/createMachine`,
          values,
          { withCredentials: true }
        );
      }

      if (response.status === 200 || response.status === 201) {
        showSuccessAlert(
          editingMachine
            ? "Machine updated successfully."
            : "Machine added successfully!"
        );
        refresh();
        setEditingMachine(null);
        resetForm();
        setIsAddStyle(false);
      }
    } catch (error) {
      console.error("Submit error:", error);
      handleAuthError(error);

      if (error.response?.status === 400) {
        const serverMsg = error.response.data.message;
        const field = error.response.data.field || "machine_no";
        setFieldError(field, serverMsg);
      } else {
        showErrorAlert("An error occurred. Please try again.");
      }
    }
  };

  // Machine operations
  const handleEdit = (machine) => {
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
        ? new Date(machine.breakdown_date).toISOString().split("T")[0]
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
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      reverseButtons: true,
      background: "#f5f8fa",
      showClass: {
        popup: "animate__animated animate__fadeInDown",
      },
      hideClass: {
        popup: "animate__animated animate__fadeOutUp",
      },
    });

    if (!isConfirmed.isConfirmed) return;

    try {
      const response = await axios.delete(
        `${apiUrl}/api/machine/deleteMachine/${machineId}`,
        { withCredentials: true }
      );

      if (response.status === 200) {
        showSuccessAlert("Machine deleted successfully!");
        refresh();
      }
    } catch (error) {
      console.error("Delete error:", error);
      handleAuthError(error);
    }
  };

  // Helper functions
  const handleAuthError = (error) => {
    if (error.status === 401) {
      Swal.fire({
        title: "Unauthorized",
        text: "You don't have permission to perform this action, please login again",
        icon: "error",
      }).then(() => navigate("/"));
    }
  };

  const showSuccessAlert = (message) => {
    Swal.fire({
      title: "Success!",
      text: message,
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
  };

  const showErrorAlert = (message) => {
    Swal.fire({
      title: "Error!",
      text: message,
      icon: "error",
      confirmButtonColor: "#3085d6",
    });
  };

  const resetForms = () => {
    setEditingMachine(null);
    setIsAddStyle(false);
    setIsUploadExcel(false);
  };

  // Simple debounce implementation
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return (
    <motion.div
      className="px-3 sm:px-4 lg:px-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Header Section */}
      <motion.div
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pt-4 lg:pt-6"
        variants={itemVariants}
      >
        {/* Search Section */}
        <motion.div
          className="relative w-full lg:w-96"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search machines"
                className="w-full pl-10 pr-4 py-3 sm:py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm sm:text-base"
                onChange={handleSearchChange}
                value={searchTerm}
              />
              <IoSearchSharp className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            <button
              className="bg-red-600 py-2 px-2 sm:py-1 sm:px-1 rounded-2xl shadow-md border-white border-2 flex-shrink-0"
              onClick={() => setSearchTerm("")}
              title="Clear Search"
            >
              <IoClose className="text-xl sm:text-2xl text-white" />
            </button>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex gap-2 sm:gap-3 lg:gap-4 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
          <motion.button
            type="button"
            className="bg-green-600 py-2 px-4 sm:py-2 sm:px-6 rounded-md text-white flex items-center gap-2 whitespace-nowrap text-sm min-w-max flex-1 lg:flex-none justify-center"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleExcelDownload}
          >
            <IoCloudUploadOutline className="text-base sm:text-lg" />
            <span>Download</span>
          </motion.button>

          {userRole === "Admin" && (
            <>
              <motion.button
                type="button"
                className="bg-blue-600 py-2 px-4 sm:py-2 sm:px-6 rounded-md text-white flex items-center gap-2 whitespace-nowrap text-sm min-w-max flex-1 lg:flex-none justify-center"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => {
                  resetForms();
                  setIsAddStyle(!isAddStyle);
                }}
              >
                <div>
                  {isAddStyle ? (
                    <IoClose className="text-lg sm:text-xl group-hover:scale-125 duration-200" />
                  ) : (
                    <IoMdAdd className="text-lg sm:text-xl group-hover:scale-125 duration-200" />
                  )}
                </div>
                <span>{isAddStyle ? "Close" : "Add"}</span>
              </motion.button>

              <motion.button
                type="button"
                className="bg-blue-600 py-2 px-4 sm:py-2 sm:px-6 rounded-md text-white flex items-center gap-2 whitespace-nowrap text-sm min-w-max flex-1 lg:flex-none justify-center"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => {
                  resetForms();
                  setIsUploadExcel(!isUploadExcel);
                }}
              >
                <div>
                  {isUploadExcel ? (
                    <IoClose className="text-base sm:text-lg group-hover:scale-125 duration-200" />
                  ) : (
                    <RiFileExcel2Line className="text-base sm:text-lg group-hover:scale-125 duration-200" />
                  )}
                </div>
                <span>{isUploadExcel ? "Close" : "Upload Excel"}</span>
              </motion.button>
            </>
          )}
        </div>
      </motion.div>

      {/* Add/Edit Machine Form */}
      <AnimatePresence>
        {isAddStyle && (
          <motion.div
            className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 duration-200 mx-0"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    <div className="sm:col-span-2 xl:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Machine Type
                      </label>
                      <Field
                        type="text"
                        name="machine_type"
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="machine_type"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 xl:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Machine Number
                      </label>
                      <Field
                        type="text"
                        name="machine_no"
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        disabled={!!editingMachine}
                      />
                      <ErrorMessage
                        name="machine_no"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 xl:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Machine Name
                      </label>
                      <Field
                        type="text"
                        name="machine_name"
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="machine_name"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 xl:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Machine Brand
                      </label>
                      <Field
                        type="text"
                        name="machine_brand"
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="machine_brand"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 xl:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Machine Location
                      </label>
                      <Field
                        type="text"
                        name="machine_location"
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="machine_location"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 xl:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Purchase Date
                      </label>
                      <Field
                        type="date"
                        name="purchase_date"
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="purchase_date"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 xl:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supplier
                      </label>
                      <Field
                        type="text"
                        name="supplier"
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="supplier"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 xl:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Service Date
                      </label>
                      <Field
                        type="date"
                        name="service_date"
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                      <ErrorMessage
                        name="service_date"
                        component="div"
                        className="text-red-500 text-xs sm:text-sm mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2 xl:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          className="sm:col-span-2 xl:col-span-3"
                        >
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date of Breakdown
                          </label>
                          <Field
                            type="date"
                            name="breakdown_date"
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <fieldset className="mt-6 border rounded-lg p-4 sm:p-6">
                    <legend className="text-sm sm:text-base px-2 font-medium">
                      Your QR code will appear here
                    </legend>
                    <div className="flex justify-center">
                      <PrintableQRCode
                        value={`${values.machine_no} | ${values.machine_name} | ${values.status}`}
                      />
                    </div>
                  </fieldset>

                  <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <button
                      type="button"
                      className="px-6 py-3 bg-gray-200 rounded-md text-sm sm:text-base hover:bg-gray-300 transition-colors"
                      onClick={() => {
                        setIsAddStyle(false);
                        setEditingMachine(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-blue-600 text-white rounded-md disabled:bg-blue-400 text-sm sm:text-base hover:bg-blue-700 transition-colors"
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

        {isUploadExcel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4"
          >
            <UploadMachine />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Machines Table Section */}
      <div className="mb-4">
        <p className="flex items-center font-semibold text-sm sm:text-base">
          Showing :{" "}
          <span className="font-bold text-white bg-blue-500 border-2 border-white/70 shadow-lg py-1 px-3 rounded-xl ml-2">
            {Array.isArray(filteredMachines) ? filteredMachines.length : 0} /{" "}
            {machineCount}
          </span>
          {backendSearchResults !== null && (
            <span className="text-xs sm:text-sm text-gray-600 ml-2">
              (Search results)
            </span>
          )}
        </p>
      </div>

      <div className="rounded-xl pb-6 bg-white shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-blue-700 to-blue-600/80 text-white text-xs sm:text-sm lg:text-base sticky top-0">
              <tr>
                <th className="whitespace-nowrap border-r border-white/50 px-3 py-3 sm:px-4 sm:py-3 text-left">
                  Machine Type
                </th>
                <th className="whitespace-nowrap border-r border-white/50 px-3 py-3 sm:px-4 sm:py-3 text-left">
                  Machine No
                </th>
                <th className="whitespace-nowrap border-r border-white/50 px-3 py-3 sm:px-4 sm:py-3 text-left">
                  Machine Name
                </th>
                <th className="whitespace-nowrap border-r border-white/50 px-3 py-3 sm:px-4 sm:py-3 text-left">
                  Machine Brand
                </th>
                <th className="whitespace-nowrap border-r border-white/50 px-3 py-3 sm:px-4 sm:py-3 text-left">
                  Machine Location
                </th>
                <th className="whitespace-nowrap border-r border-white/50 px-3 py-3 sm:px-4 sm:py-3 text-left">
                  Existing Style
                </th>
                {userRole === "Admin" && (
                  <th className="whitespace-nowrap px-3 py-3 sm:px-4 sm:py-3 text-left">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm lg:text-base divide-y divide-gray-200">
              {Array.isArray(filteredMachines) &&
              filteredMachines.length > 0 ? (
                filteredMachines.map((machine) => (
                  <tr
                    key={machine.machine_id}
                    className="bg-white hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <span className="flex items-center gap-x-2">
                        {machine.machine_status === "active" ||
                        machine.machine_status === "Available" ? (
                          <FaCheckCircle className="text-green-600 text-sm sm:text-base" />
                        ) : (
                          <IoCloseCircle className="text-red-600 text-sm sm:text-base" />
                        )}
                        <span className="truncate max-w-[120px] sm:max-w-none">
                          {machine.machine_type}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      {machine.machine_no}
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <span className="truncate max-w-[120px] sm:max-w-none block">
                        {machine.machine_name}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <span className="truncate max-w-[100px] sm:max-w-none block">
                        {machine.machine_brand}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <span className="truncate max-w-[120px] sm:max-w-none block">
                        {machine.machine_location}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <span className="truncate max-w-[120px] sm:max-w-none block">
                        {getStyleNames(machine)}
                      </span>
                    </td>
                    {userRole === "Admin" && (
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <div className="flex justify-start sm:justify-center gap-2 sm:gap-3">
                          <TbEyeSpark
                            onClick={() =>
                              navigate("/view-machine", { state: machine })
                            }
                            className="text-lg sm:text-xl text-gray-600 hover:text-blue-600 hover:scale-125 duration-300 cursor-pointer"
                            title="View Machine"
                          />
                          <MdModeEditOutline
                            onClick={() => handleEdit(machine)}
                            className="text-lg sm:text-xl text-gray-600 hover:text-yellow-600 hover:scale-125 duration-300 cursor-pointer"
                            title="Edit Machine"
                          />
                          <MdDeleteForever
                            onClick={() => handleDelete(machine.machine_id)}
                            className="text-lg sm:text-xl text-gray-600 hover:text-red-600 hover:scale-125 duration-300 cursor-pointer"
                            title="Delete Machine"
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
                    className="text-center py-8 text-sm sm:text-base"
                  >
                    {searchLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600"></div>
                        <span>Searching machines...</span>
                      </div>
                    ) : searchTerm ? (
                      "No machines found matching your search"
                    ) : (
                      "There are no machines yet"
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default AddMachine;
