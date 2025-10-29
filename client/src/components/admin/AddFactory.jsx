import React, { useEffect, useState, useMemo } from "react";
import { IoSearchSharp } from "react-icons/io5";
import { IoMdAdd } from "react-icons/io";
import { MdModeEditOutline } from "react-icons/md";
import { MdDeleteForever } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { useFormik } from "formik";
import * as yup from "yup";
import swal from "sweetalert2";
import axios from "axios";
import useFactory from "../../hooks/useFactories";
import { useUser } from "../../contexts/userContext.jsx";
import { useNavigate } from "react-router-dom";

const AddFactory = ({ userRole }) => {
  // alert("user role ", userRole);
  const [isAddFactory, setIsAddFactory] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;
  const [serverMessages, setServerMessages] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFactoryId, setCurrentFactoryId] = useState(null);
  const { user } = useUser();
  // console.log("current user: ", user);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // console.log("useEffect : ", user.userId);
      formik.setFieldValue("userId", user.userId);
    }
  }, [user]);

  // Use your custom hook with refresh capability
  const {
    factories: allFactories,
    loading,
    error,
    refresh: refreshFactories,
  } = useFactory();

  // Memoized filtered factories based on search term
  const filteredFactories = useMemo(() => {
    if (!searchTerm) return allFactories;

    return allFactories.filter(
      (factory) =>
        factory.factory_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        factory.factory_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allFactories, searchTerm]);

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

  // search function with debounce
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
      }, 300) // 300ms
    );
  };

  // Clear timeout on component unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // yup validation rules
  const validations = yup.object({
    factoryCode: yup
      .string()
      .required("Factory code required")
      .min(1, "Factory code should at least include 3 characters")
      .matches(/^[A-Za-z]+$/, "Factory code should be letters only"),
    factoryName: yup
      .string()
      .required("Factory name required")
      .min(3, "Factory name should contain at least 3 characters")
      .matches(/^[A-Za-z() /]+$/, "Factory name should contain letters only"),
  });

  // delete submit
  const handleDelete = async (index) => {
    const confirmation = await swal.fire({
      title: "Do you want delete this factory",
      text: "After delete you cannot recover this data again",
      icon: "warning",
      showConfirmButton: true,
      showCancelButton: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    if (!index) {
      swal.fire({
        title: "Factory index is empty please try again later",
        icon: "error",
        showCancelButton: false,
        confirmButtonText: "Ok",
      });
      return;
    }
    try {
      const response = await axios.delete(
        `${apiUrl}/api/factories/deleteFactory/${index}`,
        { withCredentials: true }
      );
      if (response.status === 200 || response.status === 201) {
        swal.fire({
          title: "Factory delete succss",
          icon: "success",
          showCancelButton: false,
          confirmButtonText: "ok",
        });
        refreshFactories();
      }
    } catch (error) {
      const res = error?.response;
      console.error("Factory operation error:", error);
      if (res?.status === 401) {
        await swal.fire({
          title: "Unauthorized - (401)",
          text: "You don't have a enough permission to perform this action or maybe your session is expired please login to the system again",
          icon: "error",
        });

        navigate("/");
      }
      await swal.fire({
        title: "Can't delete this factory",
        icon: "error",
        text: error.response.data.message || "Server error",
        showCancelButton: false,
      });
      console.log("error when delete: ", error.response.data.message);
    }
  };

  // handle submit function for both create and update
  const handleSubmit = async (values) => {
    // console.log(formik.values.userId);
    try {
      let result;

      if (isEditing) {
        result = await axios.put(
          `${apiUrl}/api/factories/updateFactory/${currentFactoryId}`,
          values,
          { withCredentials: true }
        );
      } else {
        result = await axios.post(
          `${apiUrl}/api/factories/createNewFactory`,
          values,
          { withCredentials: true }
        );
      }

      if (result.status === 200 || result.status === 201) {
        setServerMessages(null);
        setServerMessages({
          status: "success",
          message: isEditing
            ? "Factory updated successfully"
            : "Factory created successfully",
        });

        swal.fire({
          title: "Success!",
          text: isEditing
            ? "Factory updated successfully"
            : "Factory created successfully",
          icon: "success",
          confirmButtonText: "OK",
          showCancelButton: false,
        });

        await refreshFactories();
        formik.resetForm();
        setIsEditing(false);
        setCurrentFactoryId(null);
      }
    } catch (error) {
      const res = error?.response;
      console.error("Factory operation error:", error);

      if (res?.status === 422 && res.data?.errors) {
        const serverErrors = res.data.errors;
        const formattedErrors = {};
        serverErrors.forEach((err) => {
          formattedErrors[err.field] = err.message;
        });
        formik.setErrors(formattedErrors);
      } else if (res?.status === 409) {
        formik.setErrors({
          factoryCode: res.data?.message || "Factory code already exists",
        });
      } else if (res?.status === 401) {
        await swal.fire({
          title: "Unauthorized - (401)",
          text: "You don't have a enough permission to perform this action or maybe your session is expired please login to the system again",
          icon: "error",
        });

        navigate("/");
      } else {
        setServerMessages({
          status: "error",
          message:
            res?.data?.message ||
            `Failed to ${
              isEditing ? "update" : "create"
            } factory. Please try again.`,
        });
      }
    }
  };

  // formik config
  const formik = useFormik({
    initialValues: {
      factoryCode: "",
      factoryName: "",
      userId: "",
    },
    validationSchema: validations,
    onSubmit: handleSubmit,
    validateOnBlur: true,
    validateOnChange: true,
    validateOnSubmit: true,
  });

  // Handle edit factory
  const handleEditFactory = (factory) => {
    formik.setValues({
      factoryCode: factory.factory_code,
      factoryName: factory.factory_name,
    });
    setCurrentFactoryId(factory.factory_id);
    setIsEditing(true);
    setIsAddFactory(true);
  };

  // Handle cancel
  const handleCancel = () => {
    setServerMessages(null);
    formik.resetForm();
    setIsAddFactory(false);
    setIsEditing(false);
    setCurrentFactoryId(null);
  };

  return (
    <div className="w-full h-full p-4 md:p-8">
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
            placeholder="Search factories..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            onChange={handleSearch}
          />
          <IoSearchSharp className="absolute left-3 top-3 text-gray-400" />
        </motion.div>

        {/* Add Factory Button */}
        {userRole === "Admin" ? (
          <motion.button
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 w-full md:w-auto shadow-md"
            onClick={() => {
              if (isAddFactory) {
                handleCancel();
              } else {
                setIsAddFactory(true);
                setIsEditing(false);
                setCurrentFactoryId(null);
              }
            }}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <IoMdAdd className="text-xl" />
            {isAddFactory ? "Close Form" : "Add Factory"}
          </motion.button>
        ) : (
          <div></div>
        )}
      </div>

      {/* Form Section */}
      <AnimatePresence>
        {isAddFactory && (
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
                {isEditing ? "Edit Factory" : "Add New Factory"}
              </motion.h2>

              <form className="space-y-6" onSubmit={formik.handleSubmit}>
                <div className="grid grid-cols-1 gap-6">
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label
                      htmlFor="factoryCode"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Factory Code
                    </label>
                    <div className="">
                      <input
                        id="factoryCode"
                        name="factoryCode"
                        type="text"
                        value={formik.values.factoryCode}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter factory code"
                      />
                      <div className="">
                        {formik.touched.factoryCode &&
                          formik.errors.factoryCode && (
                            <p className="text-red-600 font-semibold md:ml-4 text-sm">
                              {formik.errors.factoryCode}
                            </p>
                          )}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label
                      htmlFor="factoryName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Factory Name
                    </label>
                    <div className="">
                      <input
                        id="factoryName"
                        type="text"
                        name="factoryName"
                        value={formik.values.factoryName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter factory name"
                      />
                      <div className="">
                        {formik.touched.factoryName &&
                          formik.errors.factoryName && (
                            <p className="text-red-600 font-semibold md:ml-4 text-sm">
                              {formik.errors.factoryName}
                            </p>
                          )}
                      </div>
                    </div>
                  </motion.div>
                </div>

                {serverMessages && serverMessages !== "" && (
                  <div className="">
                    <div
                      className={`${
                        serverMessages.status === "success"
                          ? "text-green-600 bg-green-200"
                          : "text-red-600 bg-red-200"
                      } py-2 text-center rounded-md`}
                    >
                      {serverMessages.message}
                    </div>
                  </div>
                )}

                <motion.div
                  className="flex justify-end space-x-4 pt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.button
                    type="button"
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm text-sm md:text-base"
                    onClick={handleCancel}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-sm md:text-md text-white font-medium rounded-lg transition-all duration-200 shadow-md"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    {isEditing ? "Update" : "Save"}
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Factories Table */}
      <motion.div
        className="bg-white rounded-xl shadow-md max-h-80 overflow-y-auto w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {loading ? (
          <div className="p-4 text-center">Loading factories...</div>
        ) : error ? (
          <div className="p-4 text-center text-red-600">
            Error loading factories: {error.message}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 overflow-x-auto rounded-md">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-500 sticky top-0">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Factory Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Factory Name
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
              {filteredFactories.length > 0 ? (
                filteredFactories.map((factory) => (
                  <motion.tr
                    key={factory.factory_id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {factory.factory_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {factory.factory_name}
                      </div>
                    </td>
                    {userRole === "Admin" ? (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-4">
                          <motion.button
                            className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEditFactory(factory)}
                          >
                            <MdModeEditOutline className="text-2xl" />
                          </motion.button>
                          <motion.button
                            className="text-red-600 hover:text-red-800 transition-colors duration-200"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(factory.factory_id)}
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
                  <td colSpan="3" className="px-6 py-4 text-center">
                    {searchTerm
                      ? "No matching factories found"
                      : "No factories available"}
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

export default AddFactory;
