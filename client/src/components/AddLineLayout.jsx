import React, { useState, useMemo, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as yup from "yup";
import useStyles from "./../hooks/useStyles.js";
import axios from "axios";
import Swal from "sweetalert2";
import ReactPaginate from "react-paginate";

const AddLineLayout = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const { stylesList, isLoading, refresh } = useStyles();
  const [workstations, setWorkstations] = useState([]);
  const [subOperations, setSubOperations] = useState([]);
  const [workstationData, setWorkstationData] = useState([]);
  const [editingWorkstation, setEditingWorkstation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4;

  const validationSchema = yup.object({
    styleNo: yup.string().required("Style number required"),
    styleDescription: yup.string().required("Description Required"),
    style: yup.string().required("Style Required"),
    season: yup.string().required("Season Required"),
    workstationCount: yup.string().required("Workstation Count Required"),
  });

  const operationSchema = yup.object().shape({
    workstations: yup.array().of(
      yup.object().shape({
        workstation_id: yup.string().required("Workstation ID required"),
        workstation_no: yup.string().required("Workstation Number required"),
        operations: yup.array().of(
          yup.object().shape({
            sub_operation_id: yup
              .string()
              .required("Sub Operation ID required"),
            operation_no: yup.string().required("Operation No required"),
            operation_name: yup.string().required("Operation required"),
            machine_type: yup.string().required("Machine Type required"),
            smv: yup.number().required("SMV required"),
          })
        ),
      })
    ),
  });

  const [selectedSty, setSelectedSty] = useState(null);
  const [formHelpers, setFormHelpers] = useState(null);

  const selectedStyle = useMemo(() => {
    if (!selectedSty || !Array.isArray(stylesList)) return null;
    return stylesList.find((style) => style.style_id === parseInt(selectedSty));
  }, [stylesList, selectedSty]);

  useEffect(() => {
    if (selectedStyle && formHelpers) {
      formHelpers.setFieldValue("styleNo", selectedStyle.style_id || "");
      formHelpers.setFieldValue(
        "styleDescription",
        selectedStyle.style_description || ""
      );
      formHelpers.setFieldValue("style", selectedStyle.style_name || "");
      formHelpers.setFieldValue(
        "season",
        selectedStyle.season?.season_id?.toString() || ""
      );
    }
  }, [selectedStyle, formHelpers]);

  useEffect(() => {
    if (Array.isArray(workstations) && workstations.length > 0) {
      const initialData = workstations.map((ws) => ({
        workstation_id: ws.workstation_id,
        workstation_no: ws.workstation_no || "",
        operations: [],
      }));
      setWorkstationData(initialData);
    }
  }, [workstations]);

  // Pagination calculations
  const pageCount = Math.ceil(workstations.length / itemsPerPage);
  const offset = currentPage * itemsPerPage;
  const currentWorkstations = workstations.slice(offset, offset + itemsPerPage);

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  const handleEditWorkstation = (workstationId) => {
    setEditingWorkstation(workstationId);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditingWorkstation(null);
    setIsEditing(false);
  };

  const handleUpdateWorkstation = async (workstationId, values) => {
    try {
      const response = await axios.put(
        `${apiUrl}/api/workstations/createWorkstation/${workstationId}`,
        values,
        { withCredentials: true }
      );
      if (response.status === 200) {
        Swal.fire({
          title: "Operation Success",
          text: "New operation was added to your workstation successfully",
          icon: "success",
          timer: 3000,
          showConfirmButton: true,
          background: "#fff",
          timerProgressBar: true,
          didOpen: (toast) => {
            toast.classList.add("swal2-show");
            toast.addEventListener("mouseenter", Swal.stopTimer);
            toast.addEventListener("mouseleave", Swal.resumeTimer);
          },
        });
        setIsEditing(false);
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Operation failed",
        text: `${error}`,
        showConfirmButton: true,
        icon: "error",
      });
    }
  };

  const handleDeleteWorkstation = async (workstationId) => {
    if (window.confirm("Are you sure you want to delete this workstation?")) {
      try {
        const response = await axios.delete(
          `${apiUrl}/api/workstations/deleteWS/${workstationId}`,
          { withCredentials: true }
        );
        if (response.status === 200) {
          Swal.fire({
            title: "Operation Success",
            text: "Workstation deleted successfully",
            icon: "success",
            timer: 3000,
            background: "#fff",
            showConfirmButton: true,
            timerProgressBar: true,
            didOpen: (toast) => {
              toast.classList.add("swal2-show");
              toast.addEventListener("mouseenter", Swal.stopTimer);
              toast.addEventListener("mouseleave", Swal.resumeTimer);
            },
          });

          setWorkstations(
            workstations.filter((ws) => ws.workstation_id !== workstationId)
          );
          setWorkstationData(
            workstationData.filter((ws) => ws.workstation_id !== workstationId)
          );
        }
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Operation failed",
          text: `${error}`,
          showConfirmButton: true,
          icon: "error",
        });
      }
    }
  };

  // Helper function to get machine type from sub operation
  const getMachineTypeFromSubOperation = (subOperationId) => {
    const subOp = subOperations.find(
      (op) => op.sub_operation_id.toString() === subOperationId.toString()
    );

    if (subOp && subOp.machines && subOp.machines.length > 0) {
      return subOp.machines[0].machine_type || "";
    }
    return "";
  };

  return (
    <div className="p-4 md:p-8 grid gap-y-10">
      <div className="p-4 md:p-8 md:w-9/12 bg-white rounded-xl shadow-xl">
        <Formik
          initialValues={{
            styleNo: "",
            styleDescription: "",
            style: "",
            season: "",
            workstationCount: "",
          }}
          validationSchema={validationSchema}
          onSubmit={async (values) => {
            try {
              const response = await axios.post(
                `${apiUrl}/api/layout/create-layout`,
                {
                  styleNo: values.styleNo,
                  season: values.season,
                  workstationCount: values.workstationCount,
                },
                { withCredentials: true }
              );
              if (response.status === 200 || response.status === 201) {
                Swal.fire({
                  title: "Operation Successful!",
                  text: "Your layout is created successfully",
                  icon: "success",
                  confirmButtonText: "OK",
                  timer: 3000,
                  timerProgressBar: true,
                });
                setWorkstations(response.data.data.workStations);
                setSubOperations(response.data.data.subOperations);
                setCurrentPage(0); // Reset to first page when new data is loaded
              }
            } catch (error) {
              console.error(error);
              Swal.fire({
                title: "Operation failed",
                text: `${error}`,
                showConfirmButton: true,
                icon: "error",
              });
            }
          }}
        >
          {({ values, resetForm, setFieldValue }) => {
            useEffect(() => {
              setFormHelpers({ setFieldValue });
            }, [setFieldValue]);

            return (
              <Form>
                <h1 className="text-center md:text-start font-semibold uppercase text-lg md:mb-8">
                  Add New Layout
                </h1>
                <div className="md:grid md:grid-cols-2 md:gap-x-24">
                  <div className="mt-4">
                    <label htmlFor="styleNo">Style No:</label>
                    <Field
                      as="select"
                      className="form-input"
                      name="styleNo"
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedSty(val);
                        setFieldValue("styleNo", val);
                      }}
                    >
                      <option value="">Select a Style</option>
                      {Array.isArray(stylesList) &&
                        stylesList.map((style) => (
                          <option key={style.style_id} value={style.style_id}>
                            {style.style_no}
                          </option>
                        ))}
                    </Field>
                    <ErrorMessage
                      name="styleNo"
                      component="div"
                      className="text-red-600 text-sm ml-4"
                    />
                  </div>

                  <div className="mt-4">
                    <label htmlFor="styleDescription">Style Description:</label>
                    <Field className="form-input" name="styleDescription" />
                    <ErrorMessage
                      name="styleDescription"
                      component="div"
                      className="text-red-600 text-sm ml-4"
                    />
                  </div>

                  <div className="mt-4">
                    <label htmlFor="style">Style:</label>
                    <Field className="form-input" name="style" />
                    <ErrorMessage
                      name="style"
                      component="div"
                      className="text-red-600 text-sm ml-4"
                    />
                  </div>

                  <div className="mt-4">
                    <label htmlFor="season">Season:</label>
                    <Field className="form-input" name="season" as="select">
                      <option value="">Select a Season</option>
                      {Array.isArray(stylesList) &&
                        stylesList
                          .reduce((seasons, style) => {
                            if (
                              style.season &&
                              !seasons.some(
                                (s) => s.season_id === style.season.season_id
                              )
                            ) {
                              seasons.push(style.season);
                            }
                            return seasons;
                          }, [])
                          .map((season) => (
                            <option
                              key={season.season_id}
                              value={season.season_id}
                            >
                              {season.season}
                            </option>
                          ))}
                    </Field>
                    <ErrorMessage
                      name="season"
                      component="div"
                      className="text-red-600 text-sm ml-4"
                    />
                  </div>

                  <div className="mt-4">
                    <label htmlFor="workstationCount">Workstation Count:</label>
                    <Field
                      className="form-input"
                      name="workstationCount"
                      type="number"
                      min="1"
                    />
                    <ErrorMessage
                      name="workstationCount"
                      component="div"
                      className="text-red-600 text-sm ml-4"
                    />
                  </div>

                  <div className="mt-8 col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white ml-2 duration-150"
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      className="px-6 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white ml-2 duration-150"
                      onClick={() => resetForm()}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </Form>
            );
          }}
        </Formik>
      </div>

      {Array.isArray(workstations) && workstations.length > 0 && (
        <div className="bg-white rounded-lg overflow-hidden shadow-xl">
          <h1 className="text-center font-semibold text-2xl p-4">
            Your Layout
          </h1>

          {/* Pagination Controls */}
          {workstations.length > itemsPerPage && (
            <div className="flex justify-center mb-4">
              <ReactPaginate
                previousLabel={"← Previous"}
                nextLabel={"Next →"}
                pageCount={pageCount}
                onPageChange={handlePageClick}
                containerClassName={"pagination flex space-x-2"}
                pageClassName={"page-item"}
                pageLinkClassName={
                  "px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                }
                previousClassName={"page-item"}
                previousLinkClassName={
                  "px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                }
                nextClassName={"page-item"}
                nextLinkClassName={
                  "px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                }
                activeClassName={"active"}
                activeLinkClassName={"bg-blue-500 text-white border-blue-500"}
                disabledClassName={"disabled"}
                disabledLinkClassName={
                  "opacity-50 cursor-not-allowed hover:bg-transparent"
                }
              />
            </div>
          )}

          <div className="p-4">
            <Formik
              initialValues={{
                workstations: workstationData.map((ws) => ({
                  ...ws,
                  operations: ws.operations.map((op) => ({
                    ...op,
                  })),
                })),
              }}
              validationSchema={operationSchema}
              onSubmit={async (values) => {
                try {
                  const response = await axios.post(
                    `${apiUrl}/api/layout/save-operations`,
                    values,
                    { withCredentials: true }
                  );
                  if (response.status === 200) {
                    Swal.fire({
                      title: "Operation Success",
                      text: "New operation was added to your workstation successfully",
                      icon: "success",
                      timer: 5000,
                      background: "#fff",
                      showConfirmButton: true,
                      timerProgressBar: true,
                      showCloseButton: false,
                      didOpen: (toast) => {
                        toast.classList.add("swal2-show");
                        toast.addEventListener("mouseenter", Swal.stopTimer);
                        toast.addEventListener("mouseleave", Swal.resumeTimer);
                      },
                    });
                  }
                } catch (error) {
                  console.error(error);
                  Swal.fire({
                    title: "Operation failed",
                    text: `${error}`,
                    showConfirmButton: true,
                    icon: "error",
                  });
                }
              }}
              enableReinitialize
            >
              {({ values, isSubmitting, setFieldValue }) => (
                <Form>
                  <FieldArray name="workstations">
                    {() => (
                      <div className="space-y-8">
                        {currentWorkstations.map((workstation, wsIndex) => {
                          const globalWsIndex = workstations.findIndex(
                            (ws) =>
                              ws.workstation_id === workstation.workstation_id
                          );

                          return (
                            <div
                              key={wsIndex}
                              className="border rounded-lg p-4"
                            >
                              <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center space-x-4">
                                  <h2 className="font-semibold text-lg">
                                    Workstation ID: {workstation.workstation_id}
                                  </h2>
                                  <div className="flex items-center">
                                    <label className="mr-2">
                                      Workstation No:
                                    </label>
                                    <Field
                                      name={`workstations.${globalWsIndex}.workstation_no`}
                                      className={`border px-2 py-1 w-20 ${
                                        editingWorkstation ===
                                        workstation.workstation_id
                                          ? ""
                                          : "bg-gray-100"
                                      }`}
                                      disabled={
                                        editingWorkstation !==
                                        workstation.workstation_id
                                      }
                                    />
                                    <ErrorMessage
                                      name={`workstations.${globalWsIndex}.workstation_no`}
                                      component="div"
                                      className="text-red-600 text-sm ml-2"
                                    />
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  {isEditing &&
                                  editingWorkstation ===
                                    workstation.workstation_id ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdateWorkstation(
                                            workstation.workstation_id,
                                            values.workstations[globalWsIndex]
                                          )
                                        }
                                        className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                      >
                                        Update
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="px-4 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleEditWorkstation(
                                            workstation.workstation_id
                                          )
                                        }
                                        className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteWorkstation(
                                            workstation.workstation_id
                                          )
                                        }
                                        className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <table className="table-auto border-collapse border border-gray-300 w-full">
                                <thead className="bg-gradient-to-r from-blue-600 to-blue-400">
                                  <tr>
                                    <th className="py-2 border border-white">
                                      Operation No
                                    </th>
                                    <th className="py-2 border border-white">
                                      Operation
                                    </th>
                                    <th className="py-2 border border-white">
                                      M/C Type
                                    </th>
                                    <th className="py-2 border border-white">
                                      SMV
                                    </th>
                                    <th className="py-2 border border-white">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <FieldArray
                                    name={`workstations.${globalWsIndex}.operations`}
                                  >
                                    {({ push: pushOp, remove: removeOp }) => (
                                      <>
                                        {values.workstations[globalWsIndex]
                                          ?.operations?.length === 0 ? (
                                          <tr>
                                            <td
                                              colSpan={5}
                                              className="text-center py-4"
                                            >
                                              No operations added yet
                                            </td>
                                          </tr>
                                        ) : (
                                          values.workstations[
                                            globalWsIndex
                                          ]?.operations?.map(
                                            (operation, opIndex) => (
                                              <tr key={opIndex}>
                                                <td className="border px-2 py-1">
                                                  <Field
                                                    name={`workstations.${globalWsIndex}.operations.${opIndex}.operation_no`}
                                                    className={`border px-2 py-1 w-full ${
                                                      editingWorkstation ===
                                                      workstation.workstation_id
                                                        ? ""
                                                        : "bg-gray-100"
                                                    }`}
                                                    disabled={
                                                      editingWorkstation !==
                                                      workstation.workstation_id
                                                    }
                                                  />
                                                  <ErrorMessage
                                                    name={`workstations.${globalWsIndex}.operations.${opIndex}.operation_no`}
                                                    component="div"
                                                    className="text-red-600 text-sm"
                                                  />
                                                </td>
                                                <td className="border px-2 py-1">
                                                  <Field
                                                    as="select"
                                                    name={`workstations.${globalWsIndex}.operations.${opIndex}.sub_operation_id`}
                                                    className={`border px-2 py-1 w-full ${
                                                      editingWorkstation ===
                                                      workstation.workstation_id
                                                        ? ""
                                                        : "bg-gray-100"
                                                    }`}
                                                    disabled={
                                                      editingWorkstation !==
                                                      workstation.workstation_id
                                                    }
                                                    onChange={(e) => {
                                                      const selectedSubOpId =
                                                        e.target.value;
                                                      const selectedSubOp =
                                                        subOperations.find(
                                                          (subOp) =>
                                                            subOp.sub_operation_id.toString() ===
                                                            selectedSubOpId
                                                        );
                                                      if (selectedSubOp) {
                                                        setFieldValue(
                                                          `workstations.${globalWsIndex}.operations.${opIndex}.sub_operation_id`,
                                                          selectedSubOpId
                                                        );
                                                        setFieldValue(
                                                          `workstations.${globalWsIndex}.operations.${opIndex}.operation_no`,
                                                          selectedSubOp.sub_operation_number
                                                        );
                                                        setFieldValue(
                                                          `workstations.${globalWsIndex}.operations.${opIndex}.operation_name`,
                                                          selectedSubOp.sub_operation_name
                                                        );
                                                        setFieldValue(
                                                          `workstations.${globalWsIndex}.operations.${opIndex}.machine_type`,
                                                          getMachineTypeFromSubOperation(
                                                            selectedSubOpId
                                                          )
                                                        );
                                                        setFieldValue(
                                                          `workstations.${globalWsIndex}.operations.${opIndex}.smv`,
                                                          selectedSubOp.smv
                                                        );
                                                      }
                                                    }}
                                                  >
                                                    <option value="">
                                                      Select Operation
                                                    </option>
                                                    {subOperations.map(
                                                      (subOp) => (
                                                        <option
                                                          key={
                                                            subOp.sub_operation_id
                                                          }
                                                          value={subOp.sub_operation_id.toString()}
                                                        >
                                                          {
                                                            subOp.sub_operation_name
                                                          }
                                                        </option>
                                                      )
                                                    )}
                                                  </Field>
                                                  <ErrorMessage
                                                    name={`workstations.${globalWsIndex}.operations.${opIndex}.sub_operation_id`}
                                                    component="div"
                                                    className="text-red-600 text-sm"
                                                  />
                                                </td>
                                                <td className="border px-2 py-1">
                                                  <Field
                                                    name={`workstations.${globalWsIndex}.operations.${opIndex}.machine_type`}
                                                    className={`border px-2 py-1 w-full ${
                                                      editingWorkstation ===
                                                      workstation.workstation_id
                                                        ? ""
                                                        : "bg-gray-100"
                                                    }`}
                                                    disabled={
                                                      editingWorkstation !==
                                                      workstation.workstation_id
                                                    }
                                                  />
                                                  <ErrorMessage
                                                    name={`workstations.${globalWsIndex}.operations.${opIndex}.machine_type`}
                                                    component="div"
                                                    className="text-red-600 text-sm"
                                                  />
                                                </td>
                                                <td className="border px-2 py-1">
                                                  <Field
                                                    name={`workstations.${globalWsIndex}.operations.${opIndex}.smv`}
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className={`border px-2 py-1 w-full ${
                                                      editingWorkstation ===
                                                      workstation.workstation_id
                                                        ? ""
                                                        : "bg-gray-100"
                                                    }`}
                                                    disabled={
                                                      editingWorkstation !==
                                                      workstation.workstation_id
                                                    }
                                                  />
                                                  <ErrorMessage
                                                    name={`workstations.${globalWsIndex}.operations.${opIndex}.smv`}
                                                    component="div"
                                                    className="text-red-600 text-sm"
                                                  />
                                                </td>
                                                <td className="border px-2 py-1 text-center">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      removeOp(opIndex)
                                                    }
                                                    className="text-red-500 hover:text-red-700"
                                                    disabled={
                                                      editingWorkstation !==
                                                      workstation.workstation_id
                                                    }
                                                  >
                                                    Remove
                                                  </button>
                                                </td>
                                              </tr>
                                            )
                                          )
                                        )}
                                        <tr>
                                          <td
                                            colSpan={5}
                                            className="text-center py-2"
                                          >
                                            <button
                                              type="button"
                                              onClick={() =>
                                                pushOp({
                                                  sub_operation_id: "",
                                                  operation_no: "",
                                                  operation_name: "",
                                                  machine_type: "",
                                                  smv: 0,
                                                })
                                              }
                                              className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                              disabled={
                                                editingWorkstation !==
                                                workstation.workstation_id
                                              }
                                            >
                                              + Add Operation
                                            </button>
                                          </td>
                                        </tr>
                                      </>
                                    )}
                                  </FieldArray>
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </FieldArray>

                  <div className="mt-8 flex justify-center">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white ml-2 duration-150 disabled:bg-blue-300"
                    >
                      {isSubmitting ? "Saving..." : "Save All Operations"}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>

          {/* Pagination Controls at bottom */}
          {workstations.length > itemsPerPage && (
            <div className="flex justify-center mt-4 pb-4">
              <ReactPaginate
                previousLabel={"← Previous"}
                nextLabel={"Next →"}
                pageCount={pageCount}
                onPageChange={handlePageClick}
                containerClassName={"pagination flex space-x-2"}
                pageClassName={"page-item"}
                pageLinkClassName={
                  "px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                }
                previousClassName={"page-item"}
                previousLinkClassName={
                  "px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                }
                nextClassName={"page-item"}
                nextLinkClassName={
                  "px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                }
                activeClassName={"active"}
                activeLinkClassName={"bg-blue-500 text-white border-blue-500"}
                disabledClassName={"disabled"}
                disabledLinkClassName={
                  "opacity-50 cursor-not-allowed hover:bg-transparent"
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddLineLayout;
