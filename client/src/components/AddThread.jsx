import React, { useMemo, useState } from "react";
import { Form, Formik, ErrorMessage, Field } from "formik";
import { GrAdd, GrEdit } from "react-icons/gr";
import { IoMdClose, IoMdCreate, IoMdTrash } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";
import * as Yup from "yup";
import axios from "axios";
import Swal from "sweetalert2";
import useThreads from "../hooks/useTreads";
import { MdEdit } from "react-icons/md";
import { MdDelete } from "react-icons/md";
import { FaSearch } from "react-icons/fa";

const AddThread = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [isAdding, setIsAdding] = useState(false);
  const [threats, setThreats] = useState([]);
  const { isLoading, refreshThreads, threadList, treadErrors } = useThreads();
  const [editingThread, setEditingThread] = useState(null);
  const [searchTerm, setSearchTerm] = useState(null);

  // console.log("threads: ", threadList);

  const filteredThreads = useMemo(() => {
    if (!searchTerm) {
      return threadList;
    }

    return threadList.filter((item) =>
      item.thread_category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, threadList]);

  // Yup validation schema
  const validationSchema = Yup.object({
    threadCategory: Yup.string()
      .required("Threat category is required")
      .min(2, "Threat category must be at least 2 characters")
      .max(100, "Threat category must not exceed 100 characters")
      .matches(
        /^[a-zA-Z0-9\s\-_]+$/,
        "Threat category can only contain letters, numbers, spaces, hyphens, and underscores"
      ),
    description: Yup.string()
      .max(500, "Description must not exceed 500 characters")
      .optional(),
    isActive: Yup.boolean(),
  });

  // Initial form values
  const initialValues = {
    threadCategory: editingThread?.thread_category || "",
    description: editingThread?.description || "",
    isActive: editingThread?.status || "",
  };

  // Form submission handler
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      setSubmitting(true);
      let response = "";
      // Simulate API call - replace with your actual API endpoint
      if (!editingThread) {
        response = await axios.post(
          `${apiUrl}/api/thread/createThread`,
          values,
          {
            withCredentials: true,
          }
        );
      } else {
        response = await axios.put(
          `${apiUrl}/api/thread/editThread/${editingThread.thread_id}`,
          values,
          { withCredentials: true }
        );
      }

      console.error("Thread response: ", response);

      // Add to local state
      setThreats((prev) => [...prev, { ...values, id: Date.now() }]);

      // Show success message
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Threat category added successfully",
        timer: 2000,
        showConfirmButton: false,
      });

      // Reset form and close
      resetForm();
      setEditingThread(null);
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding threat category:", error);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Failed to add threat category. Please try again.",
      });
    } finally {
      setSubmitting(false);
      refreshThreads();
    }
  };

  const handleDeleteThreat = async (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await axios.delete(
            `${apiUrl}/api/thread/deleteThread/${id}`,
            { withCredentials: true }
          );
          Swal.fire("Deleted!", "Threat category has been deleted.", "success");
        } catch (error) {
          Swal.fire(
            "Delete fail",
            `${error.response?.message} || Unexpected Error`,
            "error"
          );
        } finally {
          refreshThreads();
        }
      }
    });
  };

  const formatDate = (date) => {
    const d = new Date(date);

    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="w-full min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      {/* header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Thread Categories
          </h1>
          <p className="text-gray-600 mt-1">Manage all thread categories</p>
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition duration-150 w-full sm:w-auto justify-center"
          onClick={() => setIsAdding(true)}
        >
          <GrAdd className="text-sm" />
          <span>Add Thread Category</span>
        </button>
      </div>

      {/* form section */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="my-4 bg-white rounded-md shadow-md px-4 py-6 relative"
          >
            <div className="flex items-center justify-between">
              <h1 className="mb-2 top-1 font-bold">Add New Thread</h1>
              <button
                className="p-2 rounded-full hover:bg-red-500/20 hover:text-black"
                onClick={() => {
                  setIsAdding(false);
                  setEditingThread(null);
                }}
                type="button"
              >
                <IoMdClose />
              </button>
            </div>

            <Formik
              initialValues={initialValues}
              enableReinitialize={true}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, errors, touched }) => (
                <Form>
                  <div className="grid grid-cols-1 gap-4">
                    {/* Threat Category Field */}
                    <div className="space-y-2">
                      <label htmlFor="threadCategory" className="font-medium">
                        Thread Category *
                      </label>
                      <Field
                        name="threadCategory"
                        className={`border rounded-md py-2 px-3 w-full focus:outline-none focus:ring-2 ${
                          errors.threadCategory && touched.threadCategory
                            ? "border-red-500 focus:ring-red-200"
                            : "border-gray-300 focus:ring-blue-200"
                        }`}
                        placeholder="Ex: Gramex 160"
                      />
                      <ErrorMessage
                        name="threadCategory"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {/* Description Field */}
                    <div className="space-y-2">
                      <label htmlFor="description" className="font-medium">
                        Description
                      </label>
                      <Field
                        as="textarea"
                        name="description"
                        rows={3}
                        className={`border rounded-md py-2 px-3 w-full focus:outline-none focus:ring-2 ${
                          errors.description && touched.description
                            ? "border-red-500 focus:ring-red-200"
                            : "border-gray-300 focus:ring-blue-200"
                        }`}
                        placeholder="Enter threat description (optional)"
                      />
                      <ErrorMessage
                        name="description"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {/* Active Status Field */}
                    <div className="flex items-center space-x-2">
                      <Field
                        type="checkbox"
                        name="isActive"
                        id="isActive"
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="isActive" className="font-medium">
                        Active Thread
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end mt-6 space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setEditingThread(null);
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition duration-150"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-md transition duration-150 flex items-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          {/* <GrAdd className="text-sm" /> */}
                          {editingThread ? (
                            <GrEdit className="text-sm" />
                          ) : (
                            <GrAdd className="text-sm" />
                          )}
                          <span>
                            {editingThread ? "Edit category" : "Add Category"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing threats list */}
      {threadList.length > 0 && (
        <div className="my-6 rounded-lg overflow-hidden  p-4">
          {/* header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              {/* <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 truncate">
                Existing Thread Categories
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage and search through all thread categories
              </p> */}
            </div>

            <div className="w-full sm:w-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                   transition-all duration-200 outline-none
                   placeholder:text-gray-400 text-gray-700
                   hover:border-gray-400"
                  placeholder="Search by thread type..."
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search thread categories"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 rounded-md overflow-auto h-[600px] border shadow-md">
            <table className="w-full bg-white">
              <thead className="text-center bg-gradient-to-r from-blue-600 to-blue-500 text-white sticky top-0">
                <tr>
                  <th className="border-r py-2">Thread Type</th>
                  <th className="border-r py-2">Description</th>
                  <th className="border-r py-2">Status</th>
                  <th className="border-r py-2">CreatedAt</th>
                  <th className="border-r py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredThreads.map((threat) => (
                  <tr
                    key={threat.thread_id}
                    className="bg-gray-200/50 hover:bg-gray-200 border-t border-black/10"
                  >
                    <td className="py-2 px-2 border-r border-black/10">
                      {threat.thread_category}
                    </td>
                    <td className="py-2 px-2 border-r border-black/10">
                      {threat.description}
                    </td>
                    <td className="py-2 px-2 border-r border-black/10">
                      {threat.status ? "Active" : "Inactive"}
                    </td>
                    <td className="py-2 px-2 border-r border-black/10">
                      {formatDate(threat.createdAt)}
                    </td>
                    <td className="py-2 px-2 border-r border-black/10">
                      <div className="flex justify-center space-x-8">
                        <button
                          className=" rounded-full p-1 hover:bg-blue-100 duration-200"
                          onClick={() => {
                            setEditingThread(threat);
                            setIsAdding(true);
                          }}
                        >
                          <MdEdit className="text-xl text-blue-600" />
                        </button>
                        <button
                          className=" rounded-full p-1 hover:bg-red-100 duration-200"
                          onClick={() => handleDeleteThreat(threat.thread_id)}
                        >
                          <MdDelete className="text-xl text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddThread;
