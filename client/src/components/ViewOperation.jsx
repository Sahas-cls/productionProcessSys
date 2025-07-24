import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoSearchSharp } from "react-icons/io5";
import { motion } from "framer-motion";
import axios from "axios";
import { Formik, Form, Field, FieldArray } from "formik";
import Swal from "sweetalert2";

const EditMOForm = ({ setIsEditingMo, operation }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  return (
    <Formik
      initialValues={{
        style_no: operation?.style?.style_no || "",
        operation_name: operation?.operation_name || "",
      }}
      onSubmit={async (values, actions) => {
        alert("submitting");
        const formData = { ...values, operationId: operation.operation_id };
        console.log(formData);
        actions.setSubmitting(false);
        const response = await axios.put(
          `${apiUrl}/api/operationBulleting/edit-main-operation/${operation.operation_id}`,
          formData,
          { withCredentials: true }
        );
        if (response.status === 200) {
          await Swal.fire({
            title: "The main operation update success",
            icon: "success",
          });
        }
      }}
    >
      {({ isSubmitting, values }) => (
        <Form className="border rounded-md p-4">
          <h1 className="text-center text-2xl font-semibold tracking-wider mb-4 uppercase">
            Edit Main Operation
          </h1>
          <div className="">
            <div className="">
              <label htmlFor="style_no">Style Number</label>
              <Field
                name="style_no"
                className="form-input"
                placeholder="Style number"
              />
            </div>
            <div className="mt-4">
              <label htmlFor="operation_name">Operation Name</label>
              <Field
                name="operation_name"
                className="form-input"
                placeholder="Operation name"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-x-2">
            <button
              type="button"
              className="bg-white-500 text-black hover:bg-gray-300 border-gray-400/60 border px-2 py-1 rounded-md"
              onClick={() => setIsEditingMo(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-500 text-white px-2 py-1 rounded-md shadow-lg hover:bg-blue-600"
            >
              Update
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

const ViewOperation = ({ refreshOperations }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [operation, setOperation] = useState(null);
  const [editingSubOperation, setEditingSubOperation] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditingMo, setIsEditingMo] = useState(false);

  useEffect(() => {
    if (location.state) {
      setOperation(location.state);
      setLoading(false);
    } else {
      const operationId = location.pathname.split("/").pop();
      fetchOperation(operationId);
    }
  }, [location]);

  const fetchOperation = async (operationId) => {
    try {
      // Replace with your actual API endpoint
      // const response = await axios.get(`/api/operations/${operationId}`);
      // setOperation(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching operation:", error);
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleDeleteOperation = async () => {
    const choice = await Swal.fire({
      icon: "warning",
      title: "Are you sure you want to delete this operation?",
      text: "The corresponding suboperations will also be deleted with this operation",
      showCancelButton: true,
    });

    if (!choice.isConfirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/operationBulleting/deleteBO/${
          operation.operation_id
        }`
      );
      if (response.status === 200) {
        alert("Operation delete success");
      }
      refreshOperations?.();
      handleBack();
    } catch (error) {
      console.error("Error deleting operation:", error);
      alert("Failed to delete operation");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSubOperation = async (subOperationId) => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const confermation = await Swal.fire({
      title: "Are you sure want to delete this sub operation?",
      text: "When deleting this operation corresponding needle types, treads and loopers will also be deleted. and cannot be restore again",
      showConfirmButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "red",
      showCancelButton: true,
      icon: "warning",
    });

    if (!confermation.isConfirmed) {
      return;
    }

    try {
      const response = await axios.delete(
        `${apiUrl}/api/operationBulleting/delete-sub-operation/${subOperationId}`
      );
      refreshOperations?.();
      if (response.status === 200) {
        await Swal.fire({
          title: "Sub operation delete success",
          icon: "success",
        });

        setOperation((prevOperation) => ({
          ...prevOperation,
          subOperations: prevOperation.subOperations.filter(
            (subOp) => subOp.sub_operation_id !== subOperationId
          ),
        }));
      }
    } catch (error) {
      console.error("Error deleting sub-operation:", error);
      alert("Failed to delete sub-operation");
    }
  };

  const handleEditSubOperation = (subOperation) => {
    navigate(`/operations/edit-sub-operation`, {
      state: { subOperation, operationId: operation.operation_id },
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
    operation_id,
    operation_name,
    createdAt,
    updatedAt,
    style = {},
    subOperations = [],
  } = operation;

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
          <h2 className="text-2xl text-teal-600 font-semibold">
            {operation_name}
            <br />
            (ID: {operation_id})
          </h2>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <section className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">
              Operation Details
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditingMo(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteOperation}
                disabled={isDeleting}
                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm disabled:bg-red-300"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
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

        <section className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-700">
              Sub-Operations ({subOperations.length})
            </h3>
            <button
              onClick={() =>
                navigate(`/operations/${operation_id}/sub-operations/new`, {
                  state: { operationId: operation_id },
                })
              }
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              Add Sub-Operation
            </button>
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
                        MO ID: {subOp.main_operation_id}
                      </p>
                      <p className="text-gray-600 text-sm">
                        Operation Number: {subOp.sub_operation_id}
                      </p>
                      {subOp.smv && (
                        <p className="text-gray-600 text-sm">
                          SMV: {subOp.smv}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditSubOperation(subOp)}
                        className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteSubOperation(subOp.sub_operation_id)
                        }
                        className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Machines Section */}
                  {subOp.machines?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <h5 className="font-medium text-gray-700 mb-2">
                        Machines
                      </h5>
                      {subOp.machines.map((machine) => (
                        <div
                          key={machine.machine_id}
                          className="mb-4 pl-4 border-l-2 border-gray-200"
                        >
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <p>
                              <span className="font-medium">No:</span>{" "}
                              {machine.machine_no}
                            </p>
                            <p>
                              <span className="font-medium">Name:</span>{" "}
                              {machine.machine_name}
                            </p>
                            <p>
                              <span className="font-medium">Type:</span>{" "}
                              {machine.machine_type}
                            </p>
                            <p>
                              <span className="font-medium">Brand:</span>{" "}
                              {machine.machine_brand}
                            </p>
                            <p>
                              <span className="font-medium">Location:</span>{" "}
                              {machine.machine_location}
                            </p>
                            <p>
                              <span className="font-medium">Needle Count:</span>{" "}
                              {machine.needle_count}
                            </p>
                          </div>

                          {/* Needle Types */}
                          {machine.needleTypes?.length > 0 && (
                            <div className="mt-2">
                              <h6 className="text-sm font-medium">
                                Needle Types:
                              </h6>
                              <ul className="list-disc list-inside">
                                {machine.needleTypes.map((needle, idx) => (
                                  <li key={idx} className="text-sm">
                                    {needle.type}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Needle Treads */}
                          {machine.needleTreads?.length > 0 && (
                            <div className="mt-2">
                              <h6 className="text-sm font-medium">
                                Needle Treads:
                              </h6>
                              <ul className="list-disc list-inside">
                                {machine.needleTreads.map((tread, idx) => (
                                  <li key={idx} className="text-sm">
                                    {tread.tread}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Needle Loopers */}
                          {machine.needleLoopers?.length > 0 && (
                            <div className="mt-2">
                              <h6 className="text-sm font-medium">
                                Bobbin Tread/Loopers:
                              </h6>
                              <ul className="list-disc list-inside">
                                {machine.needleLoopers.map((looper, idx) => (
                                  <li key={idx} className="text-sm">
                                    {looper.looper_type}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Remarks */}
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

      {isEditingMo && (
        <div className="mt-8 shadow-lg p-4 pb-8 rounded-xl">
          <EditMOForm setIsEditingMo={setIsEditingMo} operation={operation} />
        </div>
      )}

      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={handleBack}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back to List
        </button>
        <button
          onClick={() => setIsEditingMo(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Edit Operation
        </button>
      </div>
    </div>
  );
};

export default ViewOperation;
