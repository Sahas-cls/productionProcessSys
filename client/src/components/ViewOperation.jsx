import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import AddOperationOB from "./AddOperationOB";
import AddSubOperationOB from "./AddSubOperationOB";
import { IoCloseOutline } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";

const ViewStyleDetails = () => {
  const navigate = useNavigate();
  const { style_id } = useParams();
  const apiUrl = import.meta.env.VITE_API_URL;
  const location = useLocation();
  // alert(location.state);
  const [style, setStyle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedOperations, setExpandedOperations] = useState({});
  const [isAddingSubOP, setIsAddingSubOP] = useState(false);
  const [isAddingMO, setIsAddingMO] = useState(false);
  const [mainOperationId, setMainOperationId] = useState(""); //this will send to the add sub opeartion child as a prop
  const { user, loading: userLoading, error } = useAuth();

  const fetchStyleData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${apiUrl}/api/operationBulleting/getOB/${location.state}`
      );
      console.log("fetched data: ", response);
      if (response.data && response.data.data) {
        console.log("Fetched style data:", response.data.data);
        setStyle(response.data.data);

        // Initialize expanded state for all main operations
        const initialExpanded = {};
        response.data.data.operations?.forEach((op) => {
          initialExpanded[op.operation_id] = false;
        });
        setExpandedOperations(initialExpanded);
      }
    } catch (error) {
      console.error("Error fetching style data:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load style data",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const isAddingSubRef = useRef(null);

  // useEffect(() => {
  //   function handleOutsideClick(e) {
  //     if (
  //       isAddingSubRef.current &&
  //       !isAddingSubRef.current.contains(e.target)
  //     ) {
  //       setIsAddingSubOP(true);
  //     }
  //   }

  //   document.addEventListener("mousedown", handleOutsideClick);
  //   return () => {
  //     document.removeEventListener("mousedown", handleOutsideClick);
  //   };
  // }, []);

  useEffect(() => {
    fetchStyleData();
  }, [style_id]);

  const handleBack = () => navigate(-1);

  const handleDeleteOperation = async (operationId) => {
    const choice = await Swal.fire({
      icon: "warning",
      title: "Delete Operation?",
      text: "This will also delete all sub-operations",
      showCancelButton: true,
    });

    if (!choice.isConfirmed) return;

    try {
      setIsDeleting(true);
      const response = await axios.delete(
        `${apiUrl}/api/operationBulleting/deleteBO/${operationId}`
      );

      if (response.status === 200) {
        await Swal.fire({
          title: "Deleted!",
          text: "Operation was deleted successfully",
          icon: "success",
        });
        fetchStyleData();
      }
    } catch (error) {
      console.error("Error deleting operation:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to delete operation",
        icon: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSubOperation = async (subOperationId, operationId) => {
    const confirmation = await Swal.fire({
      title: "Delete Sub-Operation?",
      text: "This will also delete related machine settings",
      showCancelButton: true,
      confirmButtonColor: "red",
    });

    if (!confirmation.isConfirmed) return;

    try {
      const response = await axios.delete(
        `${apiUrl}/api/operationBulleting/delete-sub-operation/${subOperationId}`,
        { withCredentials: true }
      );

      if (response.status === 200) {
        await Swal.fire({
          title: "Deleted!",
          text: "Sub-operation was deleted",
          icon: "success",
        });
        fetchStyleData();
      }
    } catch (error) {
      console.error("Error deleting sub-operation:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to delete sub-operation",
        icon: "error",
      });
    }
  };

  const toggleOperationExpand = (operationId) => {
    setExpandedOperations((prev) => ({
      ...prev,
      [operationId]: !prev[operationId],
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!style) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">No style data available</p>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to List
        </button>
      </div>
    );
  }
  const userRole = user?.userRole || null;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <AnimatePresence>
        {isAddingMO && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: "90deg", width: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: 0, width: "100%" }}
              exit={{ scale: 0, opacity: 0, rotate: "90deg", width: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-lg p-6 max-w-2xl w-full min-h-[40vh] overflow-y-auto"
            >
              <div className="text-right"></div>
              <AddOperationOB
                setIsAddingMO={setIsAddingMO}
                fetchStyleData={fetchStyleData}
                state={location.state}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingSubOP && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: "90deg", width: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: 0, width: "100%" }}
              exit={{ scale: 0, opacity: 0, rotate: "90deg", width: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4"
            >
              {/* Header */}
              <div
                ref={isAddingSubRef}
                className="flex justify-end p-3 border-b border-gray-200"
              >
                <button
                  className="p-1 hover:bg-red-500 hover:text-white transition-colors"
                  onClick={() => setIsAddingSubOP(false)}
                >
                  <IoCloseOutline className="text-2xl" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 min-h-[40vh] overflow-y-auto">
                <AddSubOperationOB
                  mainOp={mainOperationId}
                  setIsAddingSubOP={setIsAddingSubOP}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="mb-8">
        <button
          onClick={handleBack}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <svg className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back to Styles
        </button>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {style.style_no || "Unnamed Style"}
          </h1>
          <div className="flex justify-center gap-4">
            <span className="text-xl text-teal-600 font-semibold">
              PO: {style.po_number}
            </span>
            {/* <span className="text-xl text-gray-600">
              Style ID: {style.style_id}
            </span> */}
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <section className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Style Details
          </h2>
          <div className="flex justify-between">
            <div>
              <p className="text-gray-600">
                <span className="font-medium">Name:</span> {style.style_name}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Customer ID:</span>{" "}
                {style.customer_id}
              </p>
            </div>
            {/* <div>
              <p className="text-gray-600">
                <span className="font-medium">Factory ID:</span>{" "}
                {style.factory_id}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Season ID:</span>{" "}
                {style.season_id}
              </p>
            </div> */}
            <div>
              <p className="text-gray-600">
                <span className="font-medium">Created:</span>{" "}
                {formatDate(style.createdAt)}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Updated:</span>{" "}
                {formatDate(style.updatedAt)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-gray-600">
            <span className="font-medium">Description:</span>{" "}
            {style.style_description || "No description"}
          </p>
        </section>

        <section className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Operations ({style.operations?.length || 0})
            </h2>
            {userRole === "Admin" ? (
              <button
                onClick={() => setIsAddingMO(true)}
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                Add Operation
              </button>
            ) : (
              ""
            )}
          </div>

          {style.operations?.length > 0 ? (
            <div className="space-y-4">
              {style.operations.map((operation) => (
                <div
                  key={operation.operation_id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div
                    className="bg-gray-100 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-200"
                    onClick={() =>
                      toggleOperationExpand(operation.operation_id)
                    }
                  >
                    <div>
                      <h3 className="font-medium text-lg text-gray-800">
                        {operation.operation_name}
                      </h3>
                      <div className="flex gap-4 mt-1">
                        <span className="text-sm text-gray-600">
                          ID: {operation.operation_id}
                        </span>
                        <span className="text-sm text-gray-600">
                          Type:{" "}
                          {operation.operation_type_id === 1
                            ? "Main"
                            : "Helper"}
                        </span>
                        <span className="text-sm text-gray-600">
                          Created: {formatDate(operation.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {operation.subOperations?.length || 0} Sub-Op
                      </span>
                      <svg
                        className={`h-5 w-5 text-gray-500 transform transition-transform ${
                          expandedOperations[operation.operation_id]
                            ? "rotate-180"
                            : ""
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>

                  {expandedOperations[operation.operation_id] && (
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-700">
                          Sub-Operations ({operation.subOperations?.length || 0}
                          )
                        </h4>
                        {userRole === "Admin" ? (
                          <button
                            onClick={() => {
                              setMainOperationId(operation);
                              setIsAddingSubOP(true);
                              // alert(mainOperationId);
                            }}
                            className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs"
                          >
                            Add Sub-Operation
                          </button>
                        ) : (
                          ""
                        )}
                      </div>

                      {operation.subOperations?.length > 0 ? (
                        <div className="space-y-3">
                          {operation.subOperations.map((subOp) => (
                            <div
                              key={subOp.sub_operation_id}
                              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-medium text-gray-800">
                                    {subOp.sub_operation_name} (
                                    {subOp.sub_operation_number})
                                  </h5>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-1 text-sm">
                                    <p>
                                      <span className="font-medium">ID:</span>{" "}
                                      {subOp.sub_operation_id}
                                    </p>
                                    <p>
                                      <span className="font-medium">SMV:</span>{" "}
                                      {subOp.smv || "N/A"}
                                    </p>
                                    <p>
                                      <span className="font-medium">
                                        Created:
                                      </span>{" "}
                                      {formatDate(subOp.createdAt)}
                                    </p>
                                    <p>
                                      <span className="font-medium">
                                        Machines:
                                      </span>{" "}
                                      {subOp.machines?.length || 0}
                                    </p>
                                  </div>
                                </div>
                                {userRole === "Admin" ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `/operations/edit-sub-operation`,
                                          {
                                            state: {
                                              subOperation: subOp,
                                              operationId:
                                                operation.operation_id,
                                            },
                                          }
                                        )
                                      }
                                      className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteSubOperation(
                                          subOp.sub_operation_id,
                                          operation.operation_id
                                        )
                                      }
                                      className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ) : (
                                  ""
                                )}
                              </div>

                              {/* Machines and their configurations */}
                              {subOp.machines?.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <h6 className="font-medium text-gray-700 mb-2">
                                    Machine Configurations
                                  </h6>
                                  <div className="space-y-3">
                                    {subOp.machines.map((machine) => (
                                      <div
                                        key={machine.machine_id}
                                        className="pl-4 border-l-2 border-gray-200"
                                      >
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                          <p>
                                            <span className="font-medium">
                                              No:
                                            </span>{" "}
                                            {machine.machine_no}
                                          </p>
                                          <p>
                                            <span className="font-medium">
                                              Name:
                                            </span>{" "}
                                            {machine.machine_name}
                                          </p>
                                          <p>
                                            <span className="font-medium">
                                              Type:
                                            </span>{" "}
                                            {machine.machine_type}
                                          </p>
                                          <p>
                                            <span className="font-medium">
                                              Brand:
                                            </span>{" "}
                                            {machine.machine_brand}
                                          </p>
                                          <p>
                                            <span className="font-medium">
                                              Location:
                                            </span>{" "}
                                            {machine.machine_location}
                                          </p>
                                          <p>
                                            <span className="font-medium">
                                              Needles:
                                            </span>{" "}
                                            {machine.needle_count}
                                          </p>
                                        </div>

                                        {/* Needle Types */}
                                        {subOp.needle_types?.filter(
                                          (nt) =>
                                            nt.machine_id === machine.machine_id
                                        ).length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-sm font-medium">
                                              Needle Types:
                                            </p>
                                            <ul className="list-disc list-inside pl-4 text-sm">
                                              {subOp.needle_types
                                                .filter(
                                                  (nt) =>
                                                    nt.machine_id ===
                                                    machine.machine_id
                                                )
                                                .map((nt, idx) => (
                                                  <li key={idx}>{nt.type}</li>
                                                ))}
                                            </ul>
                                          </div>
                                        )}

                                        {/* Needle Treads */}
                                        {subOp.needle_treads?.filter(
                                          (nt) =>
                                            nt.machine_id === machine.machine_id
                                        ).length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-sm font-medium">
                                              Needle Treads:
                                            </p>
                                            <ul className="list-disc list-inside pl-4 text-sm">
                                              {subOp.needle_treads
                                                .filter(
                                                  (nt) =>
                                                    nt.machine_id ===
                                                    machine.machine_id
                                                )
                                                .map((nt, idx) => (
                                                  <li key={idx}>{nt.tread}</li>
                                                ))}
                                            </ul>
                                          </div>
                                        )}

                                        {/* Needle Loopers */}
                                        {subOp.needle_loopers?.filter(
                                          (nl) =>
                                            nl.machine_id === machine.machine_id
                                        ).length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-sm font-medium">
                                              Loopers:
                                            </p>
                                            <ul className="list-disc list-inside pl-4 text-sm">
                                              {subOp.needle_loopers
                                                .filter(
                                                  (nl) =>
                                                    nl.machine_id ===
                                                    machine.machine_id
                                                )
                                                .map((nl, idx) => (
                                                  <li key={idx}>
                                                    {nl.looper_type}
                                                  </li>
                                                ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Remarks */}
                              {subOp.remark && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <p className="text-sm font-medium">
                                    Remarks:
                                  </p>
                                  <p className="text-gray-600 text-sm">
                                    {subOp.remark}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No sub-operations found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              No operations found for this style
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ViewStyleDetails;
