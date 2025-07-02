import React, { useState } from "react";
import { IoSearchSharp } from "react-icons/io5";
import { IoMdAdd } from "react-icons/io";
import { MdModeEditOutline, MdDeleteForever } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { FaEdit, FaPlusCircle } from "react-icons/fa";
import { useFormik } from "formik";
import * as yup from "yup";

const AddSeason = () => {
  const [isAddFactory, setIsAddFactory] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto" },
    exit: { opacity: 0, height: 0 }
  };

  const formVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 }
  };

  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.98 }
  };

  // Validation schema
  const validationSchema = yup.object({
    customer: yup.string().required("Customer is required"),
    seasons: yup.array()
      .of(yup.object({
        name: yup.string().required("Season name is required")
      }))
      .min(1, "At least one season is required")
  });

  // Formik setup
  const formik = useFormik({
    initialValues: {
      customer: "",
      seasons: [],
      currentSeason: ""
    },
    validationSchema,
    onSubmit: values => {
      console.log("Submitted values:", values);
      // Here you would typically call your API
      setIsAddFactory(false);
      formik.resetForm();
    }
  });

  // Add or update season
  const handleAddSeason = () => {
    if (!formik.values.currentSeason.trim()) return;

    if (editingIndex !== null) {
      // Update existing season
      const updatedSeasons = [...formik.values.seasons];
      updatedSeasons[editingIndex] = { name: formik.values.currentSeason };
      formik.setFieldValue("seasons", updatedSeasons);
      setEditingIndex(null);
    } else {
      // Add new season
      formik.setFieldValue("seasons", [
        ...formik.values.seasons,
        { name: formik.values.currentSeason }
      ]);
    }
    formik.setFieldValue("currentSeason", "");
  };

  // Edit season
  const handleEditSeason = (index) => {
    formik.setFieldValue("currentSeason", formik.values.seasons[index].name);
    setEditingIndex(index);
  };

  // Delete season
  const handleDeleteSeason = (index) => {
    const updatedSeasons = formik.values.seasons.filter((_, i) => i !== index);
    formik.setFieldValue("seasons", updatedSeasons);
    if (editingIndex === index) {
      setEditingIndex(null);
      formik.setFieldValue("currentSeason", "");
    }
  };

  // Reset form
  const handleCancel = () => {
    setIsAddFactory(false);
    formik.resetForm();
    setEditingIndex(null);
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
            placeholder="Search customer name..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          <IoSearchSharp className="absolute left-3 top-3 text-gray-400" />
        </motion.div>

        {/* Add Season Button */}
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
          {isAddFactory ? "Close Form" : "Add Season"}
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
            transition={{ duration: 0.3 }}
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
                Add Season
              </motion.h2>

              <form onSubmit={formik.handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Customer Select */}
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
                      Customer
                    </label>
                    <select
                      id="customer"
                      name="customer"
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        formik.touched.customer && formik.errors.customer
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      } focus:border-transparent transition-all duration-200`}
                      value={formik.values.customer}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    >
                      <option value="">Select a customer</option>
                      <option value="Blacklader">Blacklader</option>
                      <option value="Blacklader1">Blacklader1</option>
                    </select>
                    {formik.touched.customer && formik.errors.customer && (
                      <div className="text-red-500 text-sm mt-1">
                        {formik.errors.customer}
                      </div>
                    )}
                  </motion.div>

                  {/* Season Input */}
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label htmlFor="currentSeason" className="block text-sm font-medium text-gray-700">
                      Season
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        id="currentSeason"
                        name="currentSeason"
                        type="text"
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          formik.touched.currentSeason && formik.errors.currentSeason
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        } focus:border-transparent transition-all duration-200`}
                        placeholder="Enter season name"
                        value={formik.values.currentSeason}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      />
                      <button
                        type="button"
                        onClick={handleAddSeason}
                        className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                      >
                        <FaPlusCircle className="text-3xl hover:scale-110 duration-150" />
                      </button>
                    </div>
                  </motion.div>

                  {/* Seasons Table */}
                  <motion.div
                    className="mt-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <table className="rounded-lg shadow-md w-full overflow-hidden">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 bg-blue-500 text-white border">
                            Season List
                          </th>
                          <th className="px-4 py-2 bg-blue-500 text-white border">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {formik.values.seasons.length === 0 ? (
                          <tr>
                            <td colSpan="2" className="text-center py-4 text-gray-500">
                              No seasons added yet
                            </td>
                          </tr>
                        ) : (
                          formik.values.seasons.map((season, index) => (
                            <tr
                              key={index}
                              className={`${index % 2 === 0 ? "bg-blue-300" : "bg-blue-200"}`}
                            >
                              <td className="text-center border py-1 px-4">
                                {season.name}
                              </td>
                              <td className="text-center border py-1 px-4">
                                <div className="flex justify-center gap-4">
                                  <button
                                    type="button"
                                    onClick={() => handleEditSeason(index)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <FaEdit className="text-xl" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSeason(index)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <MdDeleteForever className="text-xl" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    {formik.touched.seasons && formik.errors.seasons && (
                      <div className="text-red-500 text-sm mt-2">
                        {formik.errors.seasons}
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Form Actions */}
                <motion.div
                  className="flex justify-end space-x-4 pt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
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
                  >
                    Save Customer
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seasons Table */}
      <motion.div
        className="bg-white rounded-xl shadow-md overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-blue-600 to-blue-500">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                Season
              </th>
              <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[
              { season: "January", name: "Blacklader" },
              { season: "February", name: "Blacklader" },
              { season: "March", name: "Blacklader1" },
              { season: "April", name: "Blacklader1" },
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
                  <div className="text-sm text-gray-700">{customer.season}</div>
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

export default AddSeason;