import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const ViewHelperOperation = ({ refreshOperations }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [operation, setOperation] = useState(location.state || null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(!location.state);

  const handleBack = () => {
    navigate(-1);
  };

  const handleDeleteOperation = async () => {
    if (
      window.confirm("Are you sure you want to delete this helper operation?")
    ) {
      setIsDeleting(true);
      try {
        // await axios.delete(`/api/helper-operations/${operation.helper_id}`);
        refreshOperations?.();
        handleBack();
      } catch (error) {
        console.error("Error deleting helper operation:", error);
        alert("Failed to delete helper operation");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
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

  if (!operation) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">No operation data available</p>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to List
        </button>
      </div>
    );
  }

  const {
    helper_id,
    operation_name,
    operation_code,
    mc_smv,
    comments,
    mc_type,
    createdAt,
    updatedAt,
    style = {},
  } = operation;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <button
            onClick={handleBack}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Operations
          </button>
        </div>

        <div className="mt-4 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {style?.style_no || "Unnamed Style"}
          </h1>
          <h2 className="text-2xl text-blue-600 font-semibold">
            {operation_name} ({operation_code})
          </h2>
          <p className="text-gray-600">Helper Operation ID: {helper_id}</p>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <section className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">
              Helper Operation Details
            </h3>
            <div className="flex space-x-2">
              {/* <button
                onClick={() =>
                  navigate(`/helper-operations/edit/${helper_id}`, {
                    state: { operation },
                  })
                }
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Edit
              </button> */}
              <button
                onClick={handleDeleteOperation}
                disabled={isDeleting}
                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm disabled:bg-red-300"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700">Basic Information</h4>
                <div className="mt-2 space-y-2">
                  <p className="text-gray-600">
                    <span className="font-medium">Operation Name:</span>{" "}
                    {operation_name}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Operation Code:</span>{" "}
                    {operation_code}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Created:</span>{" "}
                    {formatDate(createdAt)}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Last Updated:</span>{" "}
                    {formatDate(updatedAt)}
                  </p>
                </div>
              </div>

              {comments && (
                <div>
                  <h4 className="font-medium text-gray-700">Comments</h4>
                  <p className="mt-2 text-gray-600 bg-gray-50 p-3 rounded">
                    {comments}
                  </p>
                </div>
              )}
            </div>

            {/* <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700">Machine Details</h4>
                <div className="mt-2 space-y-2">
                  <p className="text-gray-600">
                    <span className="font-medium">MC SMV:</span>{" "}
                    {mc_smv || "N/A"}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">MC Type:</span>{" "}
                    {mc_type || "N/A"}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700">Style Information</h4>
                <div className="mt-2 space-y-2">
                  <p className="text-gray-600">
                    <span className="font-medium">Style No:</span>{" "}
                    {style?.style_no || "N/A"}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Customer:</span>{" "}
                    {style?.customer_name || "N/A"}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Season:</span>{" "}
                    {style?.season_name || "N/A"}
                  </p>
                </div>
              </div>
            </div> */}
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={handleBack}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back to List
        </button>
        <button
          onClick={() =>
            navigate(`/helper-operations/edit/${helper_id}`, {
              state: { operation },
            })
          }
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Edit Operation
        </button>
      </div>
    </div>
  );
};

export default ViewHelperOperation;
