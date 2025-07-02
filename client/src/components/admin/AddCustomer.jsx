import React, { useState } from "react";
import { IoSearchSharp } from "react-icons/io5";
import { IoMdAdd } from "react-icons/io";
import { MdModeEditOutline } from "react-icons/md";
import { MdDeleteForever } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { useFormik } from "formik";
import * as yup from "yup";

const AddCustomer = () => {
  const [isAddFactory, setIsAddFactory] = useState(false);

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

  // yup validations rules
  const validations = yup.object({
    customerType: yup.string().required("Customer type required"),
    customerName: yup
      .string()
      .required("Customer name required")
      .min(3, "Customer name should at least contain 3 characters"),
  });

  // submit function
  const handleSubmit = (values) => {
    console.log(values);
  };

  // formik config
  const formik = useFormik({
    initialValues: {
      customerType: "",
      customerName: "",
    },
    validationSchema: validations,
    onSubmit: handleSubmit,
    validateOnBlur: true,
    validateOnChange: true,
    validateOnSubmit: true,
  });

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
          />
          <IoSearchSharp className="absolute left-3 top-3 text-gray-400" />
        </motion.div>

        {/* Add Factory Button */}
        <motion.button
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 w-full md:w-auto shadow-md"
          onClick={() => setIsAddFactory(!isAddFactory)}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <IoMdAdd className="text-xl" />
          {isAddFactory ? "Close Form" : "Add Customer"}
        </motion.button>
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
                Add New Customer
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
                      Customer Type
                    </label>
                    <div className="">
                      <select
                        id="factoryCode"
                        type="text"
                        name="customerType"
                        value={formik.values.customerType}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter factory code"
                      >
                        <option value="">Select type</option>
                        <option value="internalCustomer">
                          Internal customer
                        </option>
                        <option value="externalCustomer">
                          External customer
                        </option>
                      </select>

                      <div className="">
                        {formik.touched.customerType &&
                          formik.errors.customerType && (
                            <p className="text-red-600">
                              {formik.errors.customerType}
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
                      htmlFor="customerName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Customer Name
                    </label>
                    <div className="">
                      <input
                        type="text"
                        id="customerName"
                        name="customerName"
                        value={formik.values.customeryName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter customer name"
                      />

                      <div className="">
                        {formik.touched.customerName &&
                          formik.errors.customerName && (
                            <p className="text-red-600">
                              {formik.errors.customerName}
                            </p>
                          )}
                      </div>
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  className="flex justify-end space-x-4 pt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.button
                    type="button"
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm"
                    onClick={() => setIsAddFactory(false)}
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
                  >
                    Save Customer
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
        <table className="min-w-full divide-y divide-gray-200 overflow-x-auto">
          <thead className="bg-gradient-to-r from-blue-600 to-blue-500 sticky top-0">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                Customer Type
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                Customer Name
              </th>
              <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[
              { type: "External", name: "Blacklader" },
              { type: "Internal", name: "Blacklader" },
              { type: "Internal", name: "Blacklader" },
              { type: "Internal", name: "Blacklader" },
              { type: "Internal", name: "Blacklader" },
              { type: "Internal", name: "Blacklader" },
              { type: "Internal", name: "Blacklader" },
              { type: "Internal", name: "Blacklader" },
            ].map((customer, index) => (
              <motion.tr
                key={index}
                className="hover:bg-gray-50 transition-colors duration-150"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {customer.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-700">{customer.type}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex justify-center space-x-4">
                    <motion.button
                      className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <MdModeEditOutline className="text-2xl" />
                    </motion.button>
                    <motion.button
                      className="text-red-600 hover:text-red-800 transition-colors duration-200"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <MdDeleteForever className="text-2xl" />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

export default AddCustomer;
