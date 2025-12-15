import React, { useState, useMemo, useEffect } from "react";
import { IoSearchSharp } from "react-icons/io5";
import { IoMdAdd } from "react-icons/io";
import { MdModeEditOutline, MdDeleteForever } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { FaEdit, FaPlusCircle } from "react-icons/fa";
import { useFormik } from "formik";
import * as yup from "yup";
import axios from "axios";
import swal from "sweetalert2";
import useCustomer from "../../hooks/useCustomer.js";
import useSeasons from "../../hooks/useSeasons.js";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const AddSeason = ({ userRole }) => {
  const [isAddFactory, setIsAddFactory] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingSeasonId, setEditingSeasonId] = useState(null);
  const [serverMessage, setServerMessage] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;
  const { customerList, refresh } = useCustomer();
  const { seasonsList, seasonRefresh } = useSeasons();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const navigate = useNavigate();

  // Memoized filtered seasons based on search term
  const filteredSeasons = useMemo(() => {
    if (!searchTerm) return seasonsList;

    return seasonsList.filter(
      (season) =>
        season.customer?.customer_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        season.season?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        season.season_id?.toString().includes(searchTerm)
    );
  }, [seasonsList, searchTerm]);

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

  // Animation variants with full transition definitions
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
    hidden: {
      y: -20,
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
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
      transition: {
        duration: 0.2,
      },
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1,
      },
    },
  };

  const tableRowVariants = {
    hidden: {
      opacity: 0,
      y: 10,
    },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
      },
    }),
  };

  // Validation schema
  const validationSchema = yup.object({
    customer: yup.string().required("Customer is required"),
    seasons: yup
      .array()
      .of(
        yup.object({
          name: yup.string().required("Season name is required"),
        })
      )
      .min(1, "At least one season is required"),
  });

  // Formik setup
  const formik = useFormik({
    initialValues: {
      customer: "",
      seasons: [],
      currentSeason: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      // console.log(values);
      // return;
      try {
        setLoading(true);

        if (editingSeasonId) {
          // Update existing season
          const response = await axios.put(
            `${apiUrl}/api/seasons/editSeason/${editingSeasonId}`,
            {
              seasonId: editingSeasonId,
              customerId: values.customer,
              season: values.seasons[0].name,
            },
            { withCredentials: true }
          );

          if (response.status === 200) {
            setServerMessage({
              status: "success",
              message: "Season updated successfully",
            });
            swal.fire({
              title: "Success!",
              text: "Season updated successfully",
              icon: "success",
              confirmButtonText: "OK",
            });
            seasonRefresh();
            handleCancel();
          }
        } else {
          // Create new seasons
          const response = await axios.post(
            `${apiUrl}/api/seasons/createSeason`,
            {
              customerId: values.customer,
              seasons: values.seasons.map((s) => s.name),
            },
            { withCredentials: true }
          );

          if (response.status === 201) {
            setServerMessage({
              status: "success",
              message: "Seasons created successfully",
            });
            swal.fire({
              title: "Success!",
              text: "Seasons created successfully",
              icon: "success",
              confirmButtonText: "OK",
            });
            seasonRefresh();
            handleCancel();
          }
        }
      } catch (error) {
        console.error("Error saving seasons:", error);
        if (error.status === 401) {
          Swal.fire({
            title: "Unauthorized",
            text: "You don't have permission to perform this action",
            icon: "error",
          }).then(() => navigate("/"));
        }
        setServerMessage({
          status: "error",
          message: error.response?.data?.message || "Failed to save seasons",
        });
      } finally {
        setLoading(false);
      }
    },
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
        { name: formik.values.currentSeason },
      ]);
    }
    formik.setFieldValue("currentSeason", "");
  };

  // Edit season from form
  const handleEditSeason = (index, season) => {
    // console.log("index", index);
    formik.setFieldValue("currentSeason", formik.values.seasons[index].name);
    setEditingIndex(index);
    // console.log("season", season);
  };

  // Delete season from form
  const handleDeleteSeason = (index) => {
    const updatedSeasons = formik.values.seasons.filter((_, i) => i !== index);
    formik.setFieldValue("seasons", updatedSeasons);
    if (editingIndex === index) {
      setEditingIndex(null);
      formik.setFieldValue("currentSeason", "");
    }
  };

  // Edit season from table
  const handleEditSeasonFromTable = (season) => {
    formik.setValues({
      seasonId: season.season_id,
      customer: season.customer_id,
      seasons: [{ name: season.season }],
      currentSeason: season.season,
    });
    setEditingIndex(0);
    setEditingSeasonId(season.season_id);
    setIsAddFactory(true);
  };

  // Handle season deletion from main table
  const handleDeleteSeasonFromTable = async (seasonId) => {
    // alert(seasonId);
    try {
      const result = await swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!",
      });

      if (result.isConfirmed) {
        await axios.delete(`${apiUrl}/api/seasons/deleteSeason/${seasonId}`, {
          withCredentials: true,
        });
        swal.fire("Deleted!", "Season has been deleted.", "success");
        seasonRefresh();
      }
    } catch (error) {
      console.error("Error deleting season:", error);
      if (error.status === 401) {
        Swal.fire({
          title: "Unauthorized",
          text: "You don't have permission to perform this action",
          icon: "error",
        }).then(() => navigate("/"));
      }
      swal.fire("Error!", "Failed to delete season.", "error");
    }
  };

  // Reset form
  const handleCancel = () => {
    setIsAddFactory(false);
    formik.resetForm();
    setEditingIndex(null);
    setEditingSeasonId(null);
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
            placeholder="Search seasons or customers..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            onChange={handleSearch}
          />
          <IoSearchSharp className="absolute left-3 top-3 text-gray-400" />
        </motion.div>

        {/* Add Season Button */}
        {userRole === "Admin" || userRole === "SuperAdmin" ? (
          <motion.button
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 w-full md:w-auto shadow-md"
            onClick={() => {
              handleCancel();
              setIsAddFactory(!isAddFactory);
            }}
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
        ) : (
          ""
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
                {editingSeasonId ? "Edit Season" : "Add Season"}
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
                    <label
                      htmlFor="customer"
                      className="block text-sm font-medium text-gray-700"
                    >
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
                      {customerList.map((customer) => (
                        <option
                          key={customer.customer_id}
                          value={customer.customer_id}
                        >
                          {customer.customer_name}
                        </option>
                      ))}
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
                    <label
                      htmlFor="currentSeason"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Season
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        id="currentSeason"
                        name="currentSeason"
                        type="text"
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          formik.touched.currentSeason &&
                          formik.errors.currentSeason
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
                      <thead className="text-sm md:text-base">
                        <tr>
                          <th className="px-4 py-2 bg-blue-500 text-white border">
                            Season List
                          </th>
                          {userRole === "Admin" || userRole === "SuperAdmin" ? (
                            <th className="px-4 py-2 bg-blue-500 text-white border">
                              Actions
                            </th>
                          ) : (
                            ""
                          )}
                        </tr>
                      </thead>
                      <tbody className="text-sm md:text-base">
                        {formik.values.seasons.length === 0 ? (
                          <tr>
                            <td
                              colSpan="2"
                              className="text-center text-sm md:text-base py-4 text-gray-500"
                            >
                              No seasons added yet
                            </td>
                          </tr>
                        ) : (
                          formik.values.seasons.map((season, index) => (
                            <tr
                              key={index}
                              className={`${
                                index % 2 === 0 ? "bg-blue-50" : "bg-blue-100"
                              }`}
                            >
                              <td className="text-center border py-2 px-4">
                                {season.name}
                              </td>
                              {userRole === "Admin" ||
                              userRole === "SuperAdmin" ? (
                                <td className="text-center border py-2 px-4">
                                  <div className="flex justify-center gap-4">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleEditSeason(index, season)
                                      }
                                      className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                                    >
                                      <FaEdit className="text-xl" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSeason(index)}
                                      className="text-red-600 hover:text-red-800 transition-colors duration-200"
                                    >
                                      <MdDeleteForever className="text-xl" />
                                    </button>
                                  </div>
                                </td>
                              ) : (
                                ""
                              )}
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

                {/* Form Actions */}
                <motion.div
                  className="flex justify-end space-x-4 pt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.button
                    type="button"
                    className="px-4 md:px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm text-sm md:text-base"
                    onClick={handleCancel}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    disabled={loading}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    className="px-4 md:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    disabled={loading}
                  >
                    {loading
                      ? "Processing..."
                      : editingSeasonId
                      ? "Update"
                      : "Save"}
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seasons Table */}
      <motion.div
        className="bg-white rounded-xl shadow-md max-h-96 overflow-y-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-blue-600 to-blue-500 sticky top-0 z-0 text-xs md:text-base">
            <tr className="">
              <th className="px-6 py-4 text-left font-medium text-white uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-4 text-left font-medium text-white uppercase tracking-wider">
                Season
              </th>
              {userRole === "Admin" || userRole === "SuperAdmin" ? (
                <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              ) : (
                ""
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-xs md:text-base">
            {Array.isArray(filteredSeasons) && filteredSeasons.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                  {searchTerm
                    ? "No matching seasons found"
                    : "No seasons available"}
                </td>
              </tr>
            ) : (
              Array.isArray(filteredSeasons) &&
              filteredSeasons.map((season, index) => (
                <motion.tr
                  key={season.season_id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                  variants={tableRowVariants}
                  initial="hidden"
                  animate="visible"
                  custom={index}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs md:text-sm font-medium text-gray-900">
                      {season.customer?.customer_name || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{season.season}</div>
                  </td>
                  {userRole === "Admin" || userRole === "SuperAdmin" ? (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-4">
                        <motion.button
                          className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleEditSeasonFromTable(season)}
                        >
                          <MdModeEditOutline className="text-2xl" />
                        </motion.button>
                        <motion.button
                          className="text-red-600 hover:text-red-800 transition-colors duration-200"
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() =>
                            handleDeleteSeasonFromTable(season.season_id)
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
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

export default AddSeason;
