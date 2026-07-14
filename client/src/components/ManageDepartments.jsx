import React, { useState, useEffect } from "react";
import { IoClose, IoAdd, IoTrash, IoPencil } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import swal from "sweetalert2";

const ManageDepartments = ({ isOpen, onClose, factoryId, factoryName }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editDepartmentName, setEditDepartmentName] = useState("");
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  // Fetch departments when popup opens
  useEffect(() => {
    if (isOpen && factoryId) {
      fetchDepartments();
    }
  }, [isOpen, factoryId]);

  // Fetch departments by factory ID
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `${apiUrl}/api/departments/${factoryId}`,
        { withCredentials: true },
      );

      if (response.data.status === "success") {
        setDepartments(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      setError("Failed to load departments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Create new department
  const handleCreateDepartment = async (e) => {
    e.preventDefault();

    if (!newDepartmentName.trim()) {
      swal.fire({
        title: "Error",
        text: "Please enter a department name",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${apiUrl}/api/departments`,
        {
          department_name: newDepartmentName.trim(),
          factory_id: factoryId,
        },
        { withCredentials: true },
      );

      if (response.data.status === "success") {
        swal.fire({
          title: "Success!",
          text: "Department created successfully",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });

        setNewDepartmentName("");
        await fetchDepartments();
      }
    } catch (error) {
      console.error("Error creating department:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to create department";

      swal.fire({
        title: "Error",
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update department
  const handleUpdateDepartment = async (departmentId) => {
    if (!editDepartmentName.trim()) {
      swal.fire({
        title: "Error",
        text: "Please enter a department name",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.put(
        `${apiUrl}/api/departments/${departmentId}`,
        {
          department_name: editDepartmentName.trim(),
        },
        { withCredentials: true },
      );

      if (response.data.status === "success") {
        swal.fire({
          title: "Success!",
          text: "Department updated successfully",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });

        setEditingDepartment(null);
        setEditDepartmentName("");
        await fetchDepartments();
      }
    } catch (error) {
      console.error("Error updating department:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to update department";

      swal.fire({
        title: "Error",
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete department
  const handleDeleteDepartment = async (departmentId, departmentName) => {
    const confirmation = await swal.fire({
      title: "Delete Department",
      text: `Are you sure you want to delete "${departmentName}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.delete(
        `${apiUrl}/api/departments/${departmentId}`,
        { withCredentials: true },
      );

      if (response.data.status === "success") {
        swal.fire({
          title: "Deleted!",
          text: "Department has been deleted successfully",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });

        await fetchDepartments();
      }
    } catch (error) {
      console.error("Error deleting department:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to delete department";

      swal.fire({
        title: "Error",
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  // Start editing a department
  const startEditing = (department) => {
    setEditingDepartment(department.department_id);
    setEditDepartmentName(department.department_name);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingDepartment(null);
    setEditDepartmentName("");
  };

  // Modal animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      >
        {/* Modal */}
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          variants={modalVariants}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Manage Departments
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {factoryName ? `Factory: ${factoryName}` : "Select a factory"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200 relative"
            >
              <IoClose className="text-2xl text-gray-600" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Create Department Form */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <IoAdd className="text-blue-600" />
                Create New Department
              </h3>
              <form onSubmit={handleCreateDepartment} className="flex gap-3">
                <input
                  type="text"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  placeholder="Enter department name..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !newDepartmentName.trim()}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </form>
            </div>

            {/* Departments List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Existing Departments
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({departments.length})
                </span>
              </h3>

              {loading && departments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Loading departments...
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
              ) : departments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  No departments found for this factory.
                  <br />
                  <span className="text-sm">
                    Create one using the form above.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {departments.map((department) => (
                    <motion.div
                      key={department.department_id}
                      className="bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-colors duration-200"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {editingDepartment === department.department_id ? (
                        // Edit mode
                        <div className="flex-1 flex gap-3">
                          <input
                            type="text"
                            value={editDepartmentName}
                            onChange={(e) =>
                              setEditDepartmentName(e.target.value)
                            }
                            className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            disabled={loading}
                          />
                          <button
                            onClick={() =>
                              handleUpdateDepartment(department.department_id)
                            }
                            disabled={loading || !editDepartmentName.trim()}
                            className="px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-4 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex-1">
                            <p className="text-gray-800 font-medium">
                              {department.department_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              ID: {department.department_id}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditing(department)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                              title="Edit department"
                              disabled={loading}
                            >
                              <IoPencil className="text-lg" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteDepartment(
                                  department.department_id,
                                  department.department_name,
                                )
                              }
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                              title="Delete department"
                              disabled={loading}
                            >
                              <IoTrash className="text-lg" />
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full flex text-center justify-center px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors duration-200"
            >
              Close (Esc)
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ManageDepartments;
