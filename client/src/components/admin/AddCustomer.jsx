import React, { useState, useEffect, useMemo } from "react";
import { IoSearchSharp } from "react-icons/io5";
import { IoMdAdd } from "react-icons/io";
import { MdModeEditOutline } from "react-icons/md";
import { MdDeleteForever } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { useFormik } from "formik";
import * as yup from "yup";
import axios from "axios";
import getUserTypes from "../../hooks/useCustomerTypes.js";
import swal from "sweetalert2";
import useCustomer from "../../hooks/useCustomer.js";
import { useUser } from "../../contexts/userContext.jsx";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const AddCustomer = ({ userRole }) => {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;
  const { customerTypes } = getUserTypes();
  const [serverMessage, setServerMessage] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCustomerId, setCurrentCustomerId] = useState(null);
  const { customerList: allCustomers, loading, error, refresh } = useCustomer();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Animation variants
  const containerVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.3,
        ease: "easeInOut",
        when: "afterChildren",
      },
    },
    visible: {
      opacity: 1,
      height: "auto",
      transition: {
        duration: 0.3,
        ease: "easeInOut",
        staggerChildren: 0.1,
        when: "beforeChildren",
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.3,
        ease: "easeInOut",
        when: "beforeChildren",
      },
    },
  };

  const formVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
    exit: {
      y: -20,
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      transition: { duration: 0.2 },
    },
    tap: {
      scale: 0.98,
    },
  };

  const tableRowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
      },
    }),
  };

  // Memoized filtered customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return allCustomers;

    return allCustomers.filter(
      (customer) =>
        customer.customer_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        customer.type?.customer_type
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        customer.customer_id.toString().includes(searchTerm)
    );
  }, [allCustomers, searchTerm]);

  // Improved search function with debounce
  const handleSearch = (e) => {
    const value = e.target.value;

    // Clear previous timeout if exists
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout
    setSearchTimeout(
      setTimeout(() => {
        setSearchTerm(value);
      }, 300) // 300ms debounce delay
    );
  };

  // Clean up timeout on component unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // yup validation rules
  const validationSchema = yup.object({
    customerType: yup.string().required("Customer type is required"),
    customerName: yup
      .string()
      .required("Customer name is required")
      .min(3, "Customer name must be at least 3 characters")
      .matches(/^[A-Za-z /]+$/, "Customer name should contain letters only"),
    userId: yup.string().required(),
  });

  useEffect(() => {
    if (user) {
      formik.setFieldValue("userId", user.userId);
    }
  }, [user]);

  // Handle form submission
  const handleSubmit = async (values, { resetForm }) => {
    if (isSubmitting) return;
    if (!formik.isValid) {
      console.log("Form is invalid", formik.errors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      let response;

      if (isEditMode) {
        response = await axios.put(
          `${apiUrl}/api/customers/editCustomer/${currentCustomerId}`,
          values,
          { withCredentials: true }
        );
      } else {
        response = await axios.post(
          `${apiUrl}/api/customers/createCustomer`,
          values,
          { withCredentials: true }
        );
      }

      if (response.status === 200 || response.status === 201) {
        swal.fire({
          title: "Success!",
          text: isEditMode
            ? "Customer updated successfully"
            : "Customer created successfully",
          icon: "success",
          confirmButtonText: "OK",
        });

        // Refresh the customer list
        await refresh();

        // Reset form and state
        resetForm({
          values: {
            customerType: "",
            customerName: "",
            userId: user?.userId,
          },
        });
        setIsAddFormOpen(false);
        setServerMessage(null);
        setIsEditMode(false);
        setCurrentCustomerId(null);
      }
    } catch (error) {
      console.error("Error:", {
        message: error.message,
        response: error.response,
        stack: error.stack
      });

      if (error.message === "Network Error") {
        setServerMessage({
          status: "error",
          message: "Network error - please check your connection",
        });
        return;
      }

      if (error.response?.status === 401) {
        Swal.fire({
          title: "Unauthorized",
          text: "You don't have permission to perform this action",
          icon: "error",
        }).then(() => navigate("/"));
      }
      
      setServerMessage({
        status: "error",
        message:
          error.response?.data?.message ||
          "An error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formik configuration
  const formik = useFormik({
    initialValues: {
      customerType: "",
      customerName: "",
      userId: user?.userId || "",
    },
    validationSchema,
    onSubmit: handleSubmit,
    enableReinitialize: true,
  });

  // Handle editing a customer
  const handleEditCustomer = (customer) => {
    formik.setValues({
      customerType: customer.customer_type_id.toString(),
      customerName: customer.customer_name,
      userId: user?.userId || null,
    });
    setCurrentCustomerId(customer.customer_id);
    setIsEditMode(true);
    setIsAddFormOpen(true);
  };

  const handleDelete = async (e, index) => {
    e.preventDefault();
    const result = await swal.fire({
      icon: "warning",
      title: "Are sure you want delete this record",
      text: "After delete you cannot undo this operatoin",
      showConfirmButton: true,
      confirmButtonText: "Delete",
      showCancelButton: true,
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const result = await axios.delete(
        `${apiUrl}/api/customers/deleteCustomer/${index}`,
        { withCredentials: true }
      );

      if (result.status === 200 || result.status === 201) {
        swal.fire({
          title: "Success!",
          text: "Customer deleted successfully",
          icon: "success",
          confirmButtonText: "OK",
        });

        // Refresh the customer list
        await refresh();
      }
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      if (error.response?.status === 401) {
        Swal.fire({
          title: "Unauthorized",
          text: "You don't have permission to perform this action",
          icon: "error",
        }).then(() => navigate("/"));
      }
      setServerMessage({
        status: "error",
        message:
          error.response?.data?.message ||
          "An error occurred. Please try again.",
      });
    }
  };

  // Handle form cancellation
  const handleCancel = () => {
    formik.resetForm({
      values: {
        customerType: "",
        customerName: "",
        userId: user?.userId || null,
      },
    });
    setIsAddFormOpen(false);
    setIsEditMode(false);
    setCurrentCustomerId(null);
    setServerMessage(null);
  };

  // Function to handle opening the add form
  const handleOpenAddForm = () => {
    formik.resetForm({
      values: {
        customerType: "",
        customerName: "",
        userId: user?.userId || "",
      },
    });
    setIsAddFormOpen(true);
    setIsEditMode(false);
    setCurrentCustomerId(null);
    setServerMessage(null);
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4 md:p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        {/* Search Bar */}
        <motion.div
          className="relative w-full md:w-64"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <input
            type="text"
            placeholder="Search customers..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            onChange={handleSearch}
          />
          <IoSearchSharp className="absolute left-3 top-3 text-gray-400" />
        </motion.div>

        {/* Add Customer Button */}
        {userRole === "Admin" ? (
          <motion.button
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 w-full md:w-auto shadow-md"
            onClick={isAddFormOpen ? handleCancel : handleOpenAddForm}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <IoMdAdd className="text-xl" />
            {isAddFormOpen ? "Close Form" : "Add Customer"}
          </motion.button>
        ) : (
          ""
        )}
      </div>

      {/* Form Section */}
      <AnimatePresence>
        {isAddFormOpen && (
          <motion.div
            className="overflow-hidden"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className="bg-white rounded-xl shadow-lg p-6 mb-8 max-w-2xl border border-gray-200"
              variants={formVariants}
            >
              <motion.h2
                className="text-xl font-semibold text-gray-800 mb-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {isEditMode ? "Edit Customer" : "Add New Customer"}
              </motion.h2>

              <form className="space-y-6" onSubmit={formik.handleSubmit}>
                <div className="grid grid-cols-1 gap-6">
                  {/* Customer Type Field */}
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label
                      htmlFor="customerType"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Customer Type
                    </label>
                    <select
                      id="customerType"
                      name="customerType"
                      value={formik.values.customerType}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select customer type</option>
                      {Array.isArray(customerTypes) &&
                        customerTypes.map((type) => (
                          <option
                            key={type.customer_type_id}
                            value={type.customer_type_id}
                          >
                            {type.customer_type}
                          </option>
                        ))}
                    </select>
                    {formik.touched.customerType &&
                      formik.errors.customerType && (
                        <p className="text-red-600 text-sm mt-1">
                          {formik.errors.customerType}
                        </p>
                      )}
                  </motion.div>

                  {/* Customer Name Field */}
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label
                      htmlFor="customerName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Customer Name
                    </label>
                    <input
                      type="text"
                      id="customerName"
                      name="customerName"
                      value={formik.values.customerName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter customer name"
                    />
                    {formik.touched.customerName &&
                      formik.errors.customerName && (
                        <p className="text-red-600 text-sm mt-1">
                          {formik.errors.customerName}
                        </p>
                      )}
                  </motion.div>
                </div>

                {/* Server Message */}
                {serverMessage && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`rounded-md p-3 ${
                      serverMessage.status === "success"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {serverMessage.message}
                  </motion.div>
                )}

                {/* Form Buttons */}
                <motion.div
                  className="flex justify-end space-x-4 pt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.button
                    type="button"
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm"
                    onClick={handleCancel}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    disabled={isSubmitting || !formik.isValid}
                  >
                    {isSubmitting ? "Processing..." : 
                     isEditMode ? "Update Customer" : "Save Customer"}
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customers Table */}
      <motion.div
        className="bg-white rounded-xl shadow-md max-h-80 overflow-y-auto w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading customers...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            Error loading customers.{" "}
            <button onClick={refresh} className="text-blue-500 hover:underline">
              Try again
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-500 sticky top-0">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Customer Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Customer Name
                </th>
                {userRole === "Admin" ? (
                  <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Actions
                  </th>
                ) : (
                  ""
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(filteredCustomers) &&
              filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer, index) => (
                  <motion.tr
                    key={customer.customer_id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.type?.customer_type || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {customer.customer_name}
                      </div>
                    </td>
                    {userRole === "Admin" ? (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-4">
                          <motion.button
                            className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <MdModeEditOutline className="text-2xl" />
                          </motion.button>
                          <motion.button
                            className="text-red-600 hover:text-red-800 transition-colors duration-200"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) =>
                              handleDelete(e, customer.customer_id)
                            }
                          >
                            <MdDeleteForever className="text-2xl" />
                          </motion.button>
                        </div>
                      </td>
                    ) : (
                      ""
                    )}
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="p-8 text-center text-gray-500">
                    {searchTerm
                      ? "No matching customers found"
                      : "No customers available"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
};

export default AddCustomer;