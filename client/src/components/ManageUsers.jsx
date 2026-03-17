import React, { useState, useEffect } from "react";
import { FaUsersCog, FaUserCircle, FaUsersSlash } from "react-icons/fa";
import { MdOutlineLockReset, MdDeleteForever } from "react-icons/md";
import { ImBlocked } from "react-icons/im";
import { AiOutlineUserSwitch } from "react-icons/ai";
import { IoSearch, IoChevronBack, IoChevronForward } from "react-icons/io5";
import useUsers from "../hooks/useUsers";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const ManageUsers = ({ userRole }) => {
  const { usersList, usersLoading, userError, refreshUsers } = useUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const apiUrl = import.meta.env.VITE_API_URL;

  // Modal states
  const [selectedUser, setSelectedUser] = useState({});
  const [showResetPW, setShowResetPW] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [message, setMessage] = useState({ status: null, message: null });
  const navigate = useNavigate();
  // Fetch available roles
  // console.log("user role: ", userRole);
  const checkUser = async () => {
    if (userRole && !userRole.toLowerCase().includes("admin")) {
      await Swal.fire({
        title: "You don't have permission to access this page",
        icon: "warning",
      });
      navigate(-1);
    }
  };
  useEffect(() => {
    checkUser();
    const fetchRoles = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/user/categories`, {
          withCredentials: true,
        });
        if (response.data.data) {
          setAvailableRoles(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch roles:", error);
        // If API endpoint doesn't exist, create default roles
        setAvailableRoles([
          { category_id: 1, category_name: "SuperAdmin" },
          { category_id: 2, category_name: "Admin" },
          { category_id: 3, category_name: "User" },
        ]);
      }
    };
    fetchRoles();
  }, [apiUrl]);

  // Add this after your state declarations, before the totalPages calculation
  const filteredUsers =
    usersList?.filter((user) => {
      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      return (
        user.user_name?.toLowerCase().includes(term) ||
        user.user_email?.toLowerCase().includes(term) ||
        user.department?.department_name?.toLowerCase().includes(term) ||
        user.factory?.factory_code?.toLowerCase().includes(term) ||
        user.category?.category_name?.toLowerCase().includes(term)
      );
    }) || [];

  // Filter users based on search term

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Handle block/unblock user
  const handleUserStatus = async (user) => {
    setSelectedUser(user);
    setShowBlockModal(true);
  };

  const confirmBlockUser = async () => {
    try {
      const response = await axios.put(
        `${apiUrl}/api/user/blockUser/${selectedUser.user_id}`,
        {},
        { withCredentials: true }
      );

      if (response.status === 200) {
        setMessage({ status: "Ok", message: response.data.message });
        setTimeout(() => {
          setShowBlockModal(false);
          setMessage({ status: null, message: null });
          refreshUsers();
        }, 1500);
      }
    } catch (error) {
      setMessage({
        status: "Error",
        message:
          error?.response?.data?.message || "Failed to update user status",
      });
      console.error(error);
    }
  };

  // Handle change role
  const handleChangeRole = async (user) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const confirmChangeRole = async (roleId) => {
    try {
      const response = await axios.put(
        `${apiUrl}/api/user/changeRole/${selectedUser.user_id}`,
        { roleId },
        { withCredentials: true }
      );

      if (response.status === 200) {
        setMessage({ status: "Ok", message: response.data.message });
        setTimeout(() => {
          setShowRoleModal(false);
          setMessage({ status: null, message: null });
          refreshUsers();
        }, 1500);
      }
    } catch (error) {
      setMessage({
        status: "Error",
        message: error?.response?.data?.message || "Failed to change user role",
      });
      console.error(error);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    try {
      const response = await axios.delete(
        `${apiUrl}/api/user/deleteUser/${selectedUser.user_id}`,
        { withCredentials: true }
      );

      if (response.status === 200) {
        setMessage({ status: "Ok", message: response.data.message });
        setTimeout(() => {
          setShowDeleteModal(false);
          setMessage({ status: null, message: null });
          refreshUsers();
        }, 1500);
      }
    } catch (error) {
      setMessage({
        status: "Error",
        message: error?.response?.data?.message || "Failed to delete user",
      });
      console.error(error);
    }
  };

  // Handle reset password
  const handleResetPassword = (user) => {
    setShowResetPW(true);
    setSelectedUser(user);
  };

  const handleRPWOnClose = () => {
    setShowResetPW(false);
    setMessage({ status: null, message: null });
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === "active") {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      );
    }
    if (statusLower === "blocked") {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Blocked
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {status || "N/A"}
      </span>
    );
  };

  // Role badge styling
  const getRoleBadge = (role) => {
    const roleLower = role?.toLowerCase();
    if (roleLower === "admin") {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 text-center">
          Admin
        </span>
      );
    }
    if (roleLower === "superadmin") {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 text-center">
          Super Admin
        </span>
      );
    }
    if (roleLower === "user") {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 text-center">
          User
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 text-center">
        {role || "N/A"}
      </span>
    );
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Reset Password Modal Component
  const ResetPassword = ({ handleRPWOnClose }) => {
    const [password, setPassword] = useState("");
    const [localMessage, setLocalMessage] = useState({
      status: null,
      message: null,
    });

    const handlePasswordChange = (e) => {
      setPassword(e.target.value);
    };

    const handleSubmit = async () => {
      // validate input
      if (!password || password.length < 5) {
        setLocalMessage({
          status: "Error",
          message: "Password must be at least 5 characters long",
        });
        return;
      }

      try {
        const response = await axios.put(
          `${apiUrl}/api/user/resetPassword/${selectedUser.user_id}`,
          { password: password },
          { withCredentials: true }
        );
        if (response.status === 200) {
          setLocalMessage({ status: "Ok", message: response.data.message });
          setTimeout(() => {
            handleRPWOnClose();
            refreshUsers();
          }, 1500);
        }
      } catch (error) {
        setLocalMessage({
          status: "Error",
          message: error?.response?.data?.message || "Unknown Error",
        });
        console.error(error);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-lg shadow-lg w-[90%] max-w-md p-6">
          <h2 className="text-lg font-semibold mb-4">Reset Password</h2>

          <p className="text-sm text-gray-600 mb-6">
            Enter new password for{" "}
            <span className="font-semibold">{selectedUser.user_name}</span>
          </p>
          <div className="mb-4">
            <input
              type="password"
              placeholder="Enter new password (min. 5 characters)"
              value={password}
              onChange={handlePasswordChange}
              className="px-3 py-2 w-full border rounded-md outline-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {localMessage.message && (
            <div
              className={`p-3 rounded-md mb-4 ${
                localMessage.status === "Error" ? "bg-red-100" : "bg-green-100"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  localMessage.status === "Error"
                    ? "text-red-700"
                    : "text-green-700"
                }`}
              >
                {localMessage.message}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setPassword("");
                setLocalMessage({ status: null, message: null });
                handleRPWOnClose();
              }}
              className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Reset Password
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Block Modal Component
  const BlockModal = ({ onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-[90%] max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">
          {selectedUser?.status === "Active" ? "Block User" : "Unblock User"}
        </h2>

        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to{" "}
          {selectedUser?.status === "Active" ? "block" : "unblock"}{" "}
          <span className="font-semibold">{selectedUser.user_name}</span>?
          {selectedUser?.status === "Active" &&
            " This will prevent them from logging in."}
        </p>

        {message.message && (
          <div
            className={`p-3 rounded-md mb-4 ${
              message.status === "Error" ? "bg-red-100" : "bg-green-100"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                message.status === "Error" ? "text-red-700" : "text-green-700"
              }`}
            >
              {message.message}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmBlockUser}
            className={`px-4 py-2 rounded text-white transition-colors ${
              selectedUser?.status === "Active"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {selectedUser?.status === "Active" ? "Block User" : "Unblock User"}
          </button>
        </div>
      </div>
    </div>
  );

  // Role Modal Component
  const RoleModal = ({ onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-[90%] max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Change User Role</h2>

        <p className="text-sm text-gray-600 mb-4">
          Select new role for{" "}
          <span className="font-semibold">{selectedUser.user_name}</span>
        </p>

        <div className="space-y-3 mb-6">
          {availableRoles.map((role) => (
            <button
              key={role.category_id}
              onClick={() => confirmChangeRole(role.category_id)}
              disabled={selectedUser.user_category === role.category_id}
              className={`w-full p-4 rounded-lg border text-left transition-all ${
                selectedUser.user_category === role.category_id
                  ? "border-blue-500 bg-blue-50 cursor-not-allowed"
                  : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              <div className="font-medium flex items-center justify-between">
                <span className="text-base">{role.category_name}</span>
                {selectedUser.user_category === role.category_id && (
                  <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    Current Role
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {message.message && (
          <div
            className={`p-3 rounded-md mb-4 ${
              message.status === "Error" ? "bg-red-100" : "bg-green-100"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                message.status === "Error" ? "text-red-700" : "text-green-700"
              }`}
            >
              {message.message}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // Delete Modal Component
  const DeleteModal = ({ onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-[90%] max-w-md p-6">
        <div className="text-red-600 mb-4 flex justify-center">
          <MdDeleteForever className="text-5xl" />
        </div>

        <h2 className="text-lg font-semibold mb-2 text-center">Delete User</h2>

        <p className="text-sm text-gray-600 mb-6 text-center">
          Are you sure you want to permanently delete{" "}
          <span className="font-semibold">{selectedUser.user_name}</span>?
          <br />
          <span className="text-red-500 font-medium mt-2 inline-block">
            This action cannot be undone.
          </span>
        </p>

        {message.message && (
          <div
            className={`p-3 rounded-md mb-4 ${
              message.status === "Error" ? "bg-red-100" : "bg-green-100"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                message.status === "Error" ? "text-red-700" : "text-green-700"
              }`}
            >
              {message.message}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmDeleteUser}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Delete User
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full p-4 md:p-6 relative">
      {/* Modals */}
      {showResetPW && <ResetPassword handleRPWOnClose={handleRPWOnClose} />}
      {showBlockModal && (
        <BlockModal
          onClose={() => {
            setShowBlockModal(false);
            setMessage({ status: null, message: null });
          }}
        />
      )}
      {showRoleModal && (
        <RoleModal
          onClose={() => {
            setShowRoleModal(false);
            setMessage({ status: null, message: null });
          }}
        />
      )}
      {showDeleteModal && (
        <DeleteModal
          onClose={() => {
            setShowDeleteModal(false);
            setMessage({ status: null, message: null });
          }}
        />
      )}

      {/* Header with stats and search */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <FaUsersCog className="text-3xl text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Manage Users</h1>
              <p className="text-gray-600 text-sm">
                Total Users:{" "}
                <span className="font-semibold">{usersList?.length || 0}</span>
                {searchTerm && (
                  <span className="ml-2">
                    | Filtered:{" "}
                    <span className="font-semibold">
                      {filteredUsers.length}
                    </span>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IoSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users by name, email, department..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-80"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-4 bg-transparent rounded-lg">
          <button
            onClick={refreshUsers}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Refresh Users
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {usersLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 border-4 border-blue-500 border-l-transparent rounded-full animate-spin"></div>
                      <p className="mt-4 text-lg font-medium text-gray-700">
                        Loading users...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : currentUsers.length > 0 ? (
                currentUsers.map((user) => (
                  <tr
                    key={user.user_id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FaUserCircle className="h-10 w-10 text-gray-400 flex-shrink-0" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.user_name || "N/A"}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {user.user_email || "N/A"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        {getRoleBadge(user?.category?.category_name)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {user?.department?.department_name || "N/A"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Factory: {user?.factory?.factory_code || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(user?.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Reset Password"
                          onClick={() => handleResetPassword(user)}
                        >
                          <MdOutlineLockReset size={30} />
                        </button>
                        <button
                          className={`p-2 rounded-lg transition-colors ${
                            user?.status === "Active"
                              ? "text-red-600 hover:text-red-800 hover:bg-red-50"
                              : "text-green-600 hover:text-green-800 hover:bg-green-50"
                          }`}
                          title={
                            user?.status === "Active"
                              ? "Block User"
                              : "Unblock User"
                          }
                          onClick={() => handleUserStatus(user)}
                        >
                          <ImBlocked size={25} />
                        </button>
                        <button
                          className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Change Role"
                          onClick={() => handleChangeRole(user)}
                        >
                          <AiOutlineUserSwitch size={25} />
                        </button>
                        <button
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete User"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <MdDeleteForever size={25} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <FaUsersSlash className="h-12 w-12 mb-4" />
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm mt-1">
                        {searchTerm
                          ? "Try a different search term"
                          : "There are no users registered yet"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(endIndex, filteredUsers.length)}
                </span>{" "}
                of <span className="font-medium">{filteredUsers.length}</span>{" "}
                results
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 text-sm font-medium ${
                    currentPage === 1
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <IoChevronBack />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded-md text-sm font-medium ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-1">...</span>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className={`w-8 h-8 rounded-md text-sm font-medium ${
                          currentPage === totalPages
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 text-sm font-medium ${
                    currentPage === totalPages
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Next
                  <IoChevronForward />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageUsers;
