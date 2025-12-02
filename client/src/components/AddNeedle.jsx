import React, { useState, useEffect, useMemo } from "react";
import { Form, Formik, ErrorMessage, Field } from "formik";
import { GrAdd } from "react-icons/gr";
import { IoMdClose, IoMdCreate, IoMdTrash } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";
import * as Yup from "yup";
import axios from "axios";
import Swal from "sweetalert2";
import { FaSearch } from "react-icons/fa";

const AddNeedle = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNeedle, setEditingNeedle] = useState(null);
  const [needles, setNeedles] = useState([]);
  const [loading, setLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;
  const [searchTerm, setSearchTerm] = useState(null);

  // Validation Schema
  const validationSchema = Yup.object({
    needleCategory: Yup.string().required("Needle category is required"),
    needleType: Yup.string().required("Needle type is required"),
  });

  // Initial values
  const initialValues = {
    needleType: "",
    needleCategory: "",
  };

  const filteredNeedles = useMemo(() => {
    if (!searchTerm) {
      return needles;
    }

    return needles.filter((item) =>
      item.needle_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [needles, searchTerm]);

  // Fetch all needle types
  const fetchNeedles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/api/needleType/getNT`, {
        withCredentials: true,
      });
      setNeedles(response.data.data || []);
    } catch (error) {
      console.error("Error fetching needles:", error);
      alert("Failed to fetch needle types");
    } finally {
      setLoading(false);
    }
  };

  // Fetch needles on component mount
  useEffect(() => {
    fetchNeedles();
  }, []);

  // Handle form submission for creating new needle
  const handleSubmit = async (
    values,
    { resetForm, setSubmitting, setFieldError }
  ) => {
    const newNeedle = {
      type: values.needleType,
      category: values.needleCategory,
    };

    try {
      const response = await axios.post(
        `${apiUrl}/api/needleType/createNT`,
        newNeedle,
        { withCredentials: true }
      );

      // Refresh the list after successful creation
      await fetchNeedles();
      resetForm();
      setIsAdding(false);
      console.log("New needle added:", newNeedle);
    } catch (error) {
      console.log("Error response:", error.response?.data);

      // Handle server validation errors
      if (error.response?.status === 400) {
        const { message, field } = error.response.data;

        // Map server field names to form field names
        const fieldMapping = {
          type: "needleType",
          category: "needleCategory",
        };

        const formField = fieldMapping[field] || field;

        if (formField) {
          setFieldError(formField, message);
        } else {
          setFieldError("general", message);
        }
      } else {
        setFieldError("general", "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit needle
  const handleEdit = (needle) => {
    setEditingNeedle(needle);
    setIsEditing(true);
  };

  // Handle update needle
  const handleUpdate = async (
    values,
    { resetForm, setSubmitting, setFieldError }
  ) => {
    const updatedNeedle = {
      needle_type_id: editingNeedle.needle_type_id,
      type: values.needleType,
      category: values.needleCategory,
    };

    try {
      const response = await axios.put(
        `${apiUrl}/api/needleType/editNT`,
        updatedNeedle,
        { withCredentials: true }
      );

      if (response.status === 200 || response.status === 201) {
        await Swal.fire({
          title: "Success",
          text: "Needle update success",
          icon: "success",
        });
      }

      // Refresh the list after successful update
      await fetchNeedles();
      resetForm();
      setIsEditing(false);
      setEditingNeedle(null);
      console.log("Needle updated:", updatedNeedle);
    } catch (error) {
      console.log("Error response:", error.response?.data);

      if (error.response?.status === 400) {
        const { message, field } = error.response.data;
        const fieldMapping = {
          type: "needleType",
          category: "needleCategory",
        };
        const formField = fieldMapping[field] || field;

        if (formField) {
          setFieldError(formField, message);
        } else {
          setFieldError("general", message);
        }
      } else {
        setFieldError("general", "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete needle
  const handleDelete = async (needleId) => {
    if (!window.confirm("Are you sure you want to delete this needle type?")) {
      return;
    }

    try {
      const response = await axios.delete(
        `${apiUrl}/api/needleType/deleteNT/${needleId}`,
        {
          data: { id: needleId },
          withCredentials: true,
        }
      );

      if (response.status === 200) {
        await Swal.fire({
          title: "Success",
          text: "Needle type deleted success",
          icon: "success",
        });
      }

      // Refresh the list after successful deletion
      await fetchNeedles();
      console.log("Needle deleted successfully");
    } catch (error) {
      console.error("Error deleting needle:", error);
      alert("Failed to delete needle type");
    }
  };

  // Form animation
  const formVariant = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 12,
        duration: 0.5,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.85,
      y: 20,
      transition: {
        duration: 0.25,
        ease: "easeInOut",
      },
    },
  };

  // Format category for display
  const formatCategory = (category) => {
    return category?.replace(/-/g, " ") || "";
  };

  return (
    <div className="w-full min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      {/* Add/Edit Form */}
      <AnimatePresence>
        {(isAdding || isEditing) && (
          <motion.div
            variants={formVariant}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white rounded-lg shadow-lg p-6 relative mb-6 border"
          >
            <button
              type="button"
              className="absolute right-4 top-4 p-2 hover:bg-red-100 rounded-full duration-150 text-gray-600"
              onClick={() => {
                setIsAdding(false);
                setIsEditing(false);
                setEditingNeedle(null);
              }}
            >
              <IoMdClose className="text-xl" />
            </button>

            <h2 className="text-xl font-semibold mb-4">
              {isEditing ? "Edit Needle Type" : "Add New Needle Type"}
            </h2>

            <Formik
              initialValues={
                isEditing
                  ? {
                      needleType: editingNeedle?.needle_type || "",
                      needleCategory: editingNeedle?.needle_category || "",
                    }
                  : initialValues
              }
              validationSchema={validationSchema}
              onSubmit={isEditing ? handleUpdate : handleSubmit}
              enableReinitialize
            >
              {({ isSubmitting, errors, touched }) => (
                <Form className="space-y-4">
                  {/* General error display */}
                  {errors.general && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                      {errors.general}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="needleCategory"
                        className="font-medium mb-1 block"
                      >
                        Needle Category *
                      </label>
                      <Field
                        as="select"
                        name="needleCategory"
                        className={`w-full border py-2 px-3 rounded-md ${
                          errors.needleCategory && touched.needleCategory
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      >
                        <option value="">Select Needle Category</option>
                        <option value="ball-point">Ball Point</option>
                        <option value="sharp-point">Sharp Point</option>
                        <option value="universal">Universal</option>
                      </Field>
                      <ErrorMessage
                        name="needleCategory"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="needleType"
                        className="font-medium mb-1 block"
                      >
                        Needle Type *
                      </label>
                      <Field
                        name="needleType"
                        className={`w-full border py-2 px-3 rounded-md ${
                          errors.needleType && touched.needleType
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="Enter needle type"
                      />
                      <ErrorMessage
                        name="needleType"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition duration-150"
                      onClick={() => {
                        setIsAdding(false);
                        setIsEditing(false);
                        setEditingNeedle(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-150 disabled:opacity-50"
                    >
                      {isSubmitting
                        ? isEditing
                          ? "Updating..."
                          : "Adding..."
                        : isEditing
                        ? "Update Needle"
                        : "Add Needle"}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      {!isAdding && !isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Needle Types</h1>
              <p className="text-gray-600 mt-1">Manage all needle types</p>
            </div>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition duration-150 w-full sm:w-auto justify-center"
              onClick={() => setIsAdding(true)}
            >
              <GrAdd className="text-sm" />
              <span>Add Needle Type</span>
            </button>
          </div>

          {/* search bar */}
          <div className="flex justify-between">
            <div className=""></div>
            <div className="bg-white flex items-center px-2 rounded-md shadow-md">
              <input
                type="text"
                className="py-2 outline-none"
                placeholder="Search by Needle Type"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className="text-xl text-black/20" />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow border">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : needles.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No needle types found. Click "Add Needle Type" to get started.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-l from-blue-600 to-blue-700">
                    <tr className="">
                      <th
                        scope="col"
                        className="px-4 border-r border-white py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
                      >
                        Needle Type
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 border-r text-left text-xs font-medium text-white uppercase tracking-wider"
                      >
                        Category
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 border-r text-left text-xs font-medium text-white uppercase tracking-wider"
                      >
                        Created Date
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredNeedles.map((needle) => (
                      <tr key={needle.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-r whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {needle.needle_type}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-r whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">
                            {formatCategory(needle.needle_category)}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-r whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {needle.createdAt
                              ? new Date(needle.createdAt).toLocaleDateString()
                              : "N/A"}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(needle)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded transition duration-150"
                              title="Edit"
                            >
                              <IoMdCreate className="text-lg" />
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(needle.needle_type_id)
                              }
                              className="text-red-600 hover:text-red-900 p-1 rounded transition duration-150"
                              title="Delete"
                            >
                              <IoMdTrash className="text-lg" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile Card View (for smaller screens) */}
          {/* <div className="lg:hidden space-y-4">
            {needles.map((needle) => (
              <div
                key={needle.id}
                className="bg-white rounded-lg shadow border p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {needle.needle_type}
                    </h3>
                    <p className="text-sm text-gray-600 capitalize mt-1">
                      {formatCategory(needle.needle_category)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Created:{" "}
                      {needle.createdAt
                        ? new Date(needle.createdAt).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(needle)}
                      className="text-blue-600 hover:text-blue-900 p-1"
                      title="Edit"
                    >
                      <IoMdCreate className="text-lg" />
                    </button>
                    <button
                      onClick={() => handleDelete(needle.id)}
                      className="text-red-600 hover:text-red-900 p-1"
                      title="Delete"
                    >
                      <IoMdTrash className="text-lg" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div> */}
        </motion.div>
      )}
    </div>
  );
};

export default AddNeedle;
