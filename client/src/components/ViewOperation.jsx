import React from "react";
import { useNavigate } from "react-router-dom";
import { IoSearchSharp } from "react-icons/io5";
import { motion } from "framer-motion";

const ViewOperation = ({ operation, onBack }) => {
  const navigate = useNavigate();
  console.log("Operation - ", operation.operation);
  if (!operation) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">No operation data available</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to List
        </button>
      </div>
    );
  }

  const {
    operation_id,
    operation_name,
    createdAt,
    updatedAt,
    style,
    subOperations = [],
  } = operation.operation;

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      {/* Header Section */}
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <button
            onClick={onBack}
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
          <h2 className="text-2xl text-teal-600 font-semibold">
            {operation_name}
            <br />
            (ID: {operation_id})
          </h2>
        </div>
      </header>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Operation Details Section */}
        <section className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">
            Operation Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">
                <span className="font-medium">Created:</span>{" "}
                {formatDate(createdAt)}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Last Updated:</span>{" "}
                {formatDate(updatedAt)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">
                <span className="font-medium">Style Description:</span>{" "}
                {style?.style_description || "No description available"}
              </p>
            </div>
          </div>
        </section>

        {/* Sub-Operations Section */}
        <section className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-700">
              Sub-Operations ({subOperations.length})
            </h3>
          </div>

          {subOperations.length > 0 ? (
            <div className="space-y-4">
              {subOperations.map((subOp) => (
                <div
                  key={subOp.sub_operation_id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-lg text-gray-800">
                        {subOp.sub_operation_name}
                      </h4>
                      <p className="text-gray-600 text-sm">
                        ID: {subOp.sub_operation_id}
                      </p>
                    </div>
                    {subOp.smv && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm font-medium">
                        SMV: {subOp.smv}
                      </span>
                    )}
                  </div>

                  {subOp.machine && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <h5 className="font-medium text-gray-700 mb-1">
                        Machine Details
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        <p>
                          <span className="font-medium">Name:</span>{" "}
                          {subOp.machine.machine_name}
                        </p>
                        <p>
                          <span className="font-medium">Number:</span>{" "}
                          {subOp.machine.machine_no}
                        </p>
                        <p>
                          <span className="font-medium">Type:</span>{" "}
                          {subOp.machine.machine_type}
                        </p>
                      </div>
                    </div>
                  )}

                  {subOp.remark && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <h5 className="font-medium text-gray-700 mb-1">
                        Remarks
                      </h5>
                      <p className="text-gray-600">{subOp.remark}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              No sub-operations found for this operation
            </div>
          )}
        </section>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back to List
        </button>
        {/* <button
          onClick={() => {
            // Add edit functionality here
            navigate(`/operations/edit/${operation_id}`);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Edit Operation
        </button> */}
      </div>
    </div>
  );
};

export default ViewOperation;
