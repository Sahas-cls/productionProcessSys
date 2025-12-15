import React, { useState, useMemo, useEffect, useRef } from "react";
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
  const [activeTab, setActiveTab] = useState("layout");
  const [opTerm, setOpTerm] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4;

  // State for operation search
  const [operationSearchTerms, setOperationSearchTerms] = useState({});
  const [showSuggestions, setShowSuggestions] = useState({});

  const filteredSubOp = useMemo(() => {
    if (!opTerm) return subOperations;
    return subOperations.filter((op) =>
      op.sub_operation_name.toLowerCase().includes(opTerm.toLowerCase())
    );
  }, [opTerm, subOperations]);

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
            sub_operation_id: yup.string().required("Sub Operation ID required"),
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
      formHelpers.setFieldValue("styleDescription", selectedStyle.style_description || "");
      formHelpers.setFieldValue("style", selectedStyle.style_name || "");
      formHelpers.setFieldValue("season", selectedStyle.season?.season_id?.toString() || "");
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
      setActiveTab("operations");
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
          title: "Success!",
          text: "Workstation updated successfully",
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
          background: "#f0f9ff",
          timerProgressBar: true,
        });
        setIsEditing(false);
        setEditingWorkstation(null);
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Update Failed",
        text: error.response?.data?.message || error.message,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handleDeleteWorkstation = async (workstationId) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        const response = await axios.delete(
          `${apiUrl}/api/workstations/deleteWS/${workstationId}`,
          { withCredentials: true }
        );
        if (response.status === 200) {
          Swal.fire({
            title: "Deleted!",
            text: "Workstation deleted successfully",
            icon: "success",
            timer: 3000,
            showConfirmButton: false,
            background: "#f0f9ff",
          });

          setWorkstations(workstations.filter((ws) => ws.workstation_id !== workstationId));
          setWorkstationData(workstationData.filter((ws) => ws.workstation_id !== workstationId));
        }
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Delete Failed",
          text: error.response?.data?.message || error.message,
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    }
  };

  // Handle operation search input change
  const handleOperationSearchChange = (wsIndex, opIndex, value) => {
    setOperationSearchTerms(prev => ({
      ...prev,
      [`${wsIndex}-${opIndex}`]: value
    }));
  };

  // Handle input focus - show suggestions
  const handleInputFocus = (wsIndex, opIndex) => {
    if (editingWorkstation === currentWorkstations[wsIndex]?.workstation_id) {
      setShowSuggestions(prev => ({
        ...prev,
        [`${wsIndex}-${opIndex}`]: true
      }));
    }
  };

  // Handle input blur - hide suggestions after a delay
  const handleInputBlur = (wsIndex, opIndex) => {
    setTimeout(() => {
      setShowSuggestions(prev => ({
        ...prev,
        [`${wsIndex}-${opIndex}`]: false
      }));
    }, 200);
  };

  // Get filtered operations for specific input
  const getFilteredOperations = (wsIndex, opIndex) => {
    const searchTerm = operationSearchTerms[`${wsIndex}-${opIndex}`] || '';
    
    if (!searchTerm) {
      return subOperations; // Show all when no search term
    }

    return subOperations.filter(op =>
      op.sub_operation_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Handle operation selection
  const handleOperationSelect = (setFieldValue, wsIndex, opIndex, subOp) => {
    if (!subOp) return;

    // Set the search term to show the selected operation name
    setOperationSearchTerms(prev => ({
      ...prev,
      [`${wsIndex}-${opIndex}`]: subOp.sub_operation_name
    }));

    // Hide suggestions
    setShowSuggestions(prev => ({
      ...prev,
      [`${wsIndex}-${opIndex}`]: false
    }));

    // Set all form values
    setFieldValue(
      `workstations.${wsIndex}.operations.${opIndex}.sub_operation_id`,
      subOp.sub_operation_id.toString()
    );
    setFieldValue(
      `workstations.${wsIndex}.operations.${opIndex}.operation_no`,
      subOp.sub_operation_number
    );
    setFieldValue(
      `workstations.${wsIndex}.operations.${opIndex}.operation_name`,
      subOp.sub_operation_name
    );
    setFieldValue(
      `workstations.${wsIndex}.operations.${opIndex}.machine_type`,
      subOp.machine_type
    );
    setFieldValue(
      `workstations.${wsIndex}.operations.${opIndex}.smv`,
      subOp.smv
    );
  };

  // Handle save all operations
  const handleSaveAllOperations = async (values, setSubmitting) => {
    try {
      const response = await axios.post(
        `${apiUrl}/api/layout/save-operations`,
        values,
        { withCredentials: true }
      );
      if (response.status === 200) {
        Swal.fire({
          title: "Success!",
          text: "All operations saved successfully",
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
          background: "#f0f9ff",
          timerProgressBar: true,
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Save Failed",
        text: error.response?.data?.message || error.message,
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-3xl font-bold text-gray-800">
          Line Layout Management
        </h1>
        <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
          Create and manage production line layouts
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 md:space-x-8">
            <button
              onClick={() => setActiveTab("layout")}
              className={`py-2 px-1 md:px-4 border-b-2 font-medium text-sm md:text-base ${
                activeTab === "layout"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Create Layout
            </button>
            {workstations.length > 0 && (
              <button
                onClick={() => setActiveTab("operations")}
                className={`py-2 px-1 md:px-4 border-b-2 font-medium text-sm md:text-base ${
                  activeTab === "operations"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Operations
                <span className="ml-2 bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {workstations.length}
                </span>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Layout Creation Form */}
      {activeTab === "layout" && (
        <div className="bg-white rounded-xl md:rounded-2xl shadow-lg md:shadow-xl p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex items-center mb-4 md:mb-6">
            <div className="w-2 h-6 md:h-8 bg-blue-500 rounded-full mr-2 md:mr-3"></div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">
              Create New Layout
            </h2>
          </div>

          <Formik
            initialValues={{
              styleNo: "",
              styleDescription: "",
              style: "",
              season: "",
              workstationCount: "",
            }}
            validationSchema={validationSchema}
            onSubmit={async (values, { setSubmitting }) => {
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
                    title: "Success!",
                    text: "Layout created successfully",
                    icon: "success",
                    timer: 3000,
                    showConfirmButton: false,
                    background: "#f0f9ff",
                    timerProgressBar: true,
                  });
                  setWorkstations(response.data.data.workStations);
                  setSubOperations(response.data.data.subOperations);
                  setCurrentPage(0);
                  setActiveTab("operations");
                }
              } catch (error) {
                console.error(error);
                Swal.fire({
                  title: "Creation Failed",
                  text: error.response?.data?.message || error.message,
                  icon: "error",
                  confirmButtonText: "OK",
                });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ values, resetForm, setFieldValue, isSubmitting }) => {
              useEffect(() => {
                setFormHelpers({ setFieldValue });
              }, [setFieldValue]);

              return (
                <Form>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Style Selection */}
                    <div className="space-y-1 md:space-y-2">
                      <label htmlFor="styleNo" className="block text-sm font-medium text-gray-700">
                        Style Number *
                      </label>
                      <Field
                        as="select"
                        name="styleNo"
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedSty(val);
                          setFieldValue("styleNo", val);
                        }}
                        className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      >
                        <option value="">Select a Style</option>
                        {Array.isArray(stylesList) &&
                          stylesList.map((style) => (
                            <option key={style.style_id} value={style.style_id}>
                              {style.style_no} - {style.style_name}
                            </option>
                          ))}
                      </Field>
                      <ErrorMessage name="styleNo" component="div" className="text-red-500 text-xs md:text-sm mt-1" />
                    </div>

                    {/* Style Description */}
                    <div className="space-y-1 md:space-y-2">
                      <label htmlFor="styleDescription" className="block text-sm font-medium text-gray-700">
                        Style Description *
                      </label>
                      <Field
                        name="styleDescription"
                        className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50"
                        readOnly
                      />
                      <ErrorMessage name="styleDescription" component="div" className="text-red-500 text-xs md:text-sm mt-1" />
                    </div>

                    {/* Style Name */}
                    <div className="space-y-1 md:space-y-2">
                      <label htmlFor="style" className="block text-sm font-medium text-gray-700">
                        Style Name *
                      </label>
                      <Field
                        name="style"
                        className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50"
                        readOnly
                      />
                      <ErrorMessage name="style" component="div" className="text-red-500 text-xs md:text-sm mt-1" />
                    </div>

                    {/* Season */}
                    <div className="space-y-1 md:space-y-2">
                      <label htmlFor="season" className="block text-sm font-medium text-gray-700">
                        Season *
                      </label>
                      <Field
                        as="select"
                        name="season"
                        className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50"
                        readOnly
                      >
                        <option value="">Select a Season</option>
                        {Array.isArray(stylesList) &&
                          stylesList
                            .reduce((seasons, style) => {
                              if (style.season && !seasons.some((s) => s.season_id === style.season.season_id)) {
                                seasons.push(style.season);
                              }
                              return seasons;
                            }, [])
                            .map((season) => (
                              <option key={season.season_id} value={season.season_id}>
                                {season.season}
                              </option>
                            ))}
                      </Field>
                      <ErrorMessage name="season" component="div" className="text-red-500 text-xs md:text-sm mt-1" />
                    </div>

                    {/* Workstation Count */}
                    <div className="md:col-span-2 space-y-1 md:space-y-2">
                      <label htmlFor="workstationCount" className="block text-sm font-medium text-gray-700">
                        Workstation Count *
                      </label>
                      <Field
                        name="workstationCount"
                        type="number"
                        min="1"
                        className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="Enter number of workstations"
                      />
                      <ErrorMessage name="workstationCount" component="div" className="text-red-500 text-xs md:text-sm mt-1" />
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 md:space-x-4 mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => resetForm()}
                      className="px-4 md:px-8 py-2 md:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium text-sm md:text-base"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 md:px-8 py-2 md:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm md:text-base"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        "Create Layout"
                      )}
                    </button>
                  </div>
                </Form>
              );
            }}
          </Formik>
        </div>
      )}

      {/* Operations Management */}
      {activeTab === "operations" && workstations.length > 0 && (
        <div className="bg-white rounded-xl md:rounded-2xl shadow-lg md:shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-white">Operations Management</h2>
                <p className="text-blue-100 mt-1 text-sm md:text-base">
                  {workstations.length} workstation{workstations.length !== 1 ? "s" : ""} • {currentWorkstations.length} showing
                </p>
              </div>
              <div className="mt-3 md:mt-0 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("layout")}
                  className="px-3 md:px-4 py-1.5 md:py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors duration-200 font-medium text-sm"
                >
                  Back to Layout
                </button>
              </div>
            </div>
          </div>

          {/* Pagination Controls - Top */}
          {workstations.length > itemsPerPage && (
            <div className="bg-gray-50 px-4 md:px-6 py-3 border-b">
              <ReactPaginate
                previousLabel={"←"}
                nextLabel={"→"}
                pageCount={pageCount}
                onPageChange={handlePageClick}
                forcePage={currentPage}
                containerClassName={"flex items-center justify-center space-x-1 md:space-x-2"}
                pageClassName={""}
                pageLinkClassName={"px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition-colors duration-200 min-w-[32px] md:min-w-[40px] text-center text-sm"}
                previousClassName={""}
                previousLinkClassName={"px-2 md:px-4 py-1.5 md:py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition-colors duration-200 text-sm"}
                nextClassName={""}
                nextLinkClassName={"px-2 md:px-4 py-1.5 md:py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition-colors duration-200 text-sm"}
                activeClassName={"active"}
                activeLinkClassName={"bg-blue-500 text-white border-blue-500 hover:bg-blue-600"}
                disabledClassName={"opacity-50 cursor-not-allowed"}
                disabledLinkClassName={"hover:bg-transparent"}
                breakLabel={"..."}
                breakClassName={"px-2"}
                marginPagesDisplayed={1}
                pageRangeDisplayed={2}
              />
            </div>
          )}

          <div className="p-4 md:p-6">
            <Formik
              initialValues={{
                workstations: workstationData.map((ws) => ({
                  ...ws,
                  operations: ws.operations.map((op) => ({ ...op })),
                })),
              }}
              validationSchema={operationSchema}
              onSubmit={handleSaveAllOperations}
              enableReinitialize
            >
              {({ values, isSubmitting, setFieldValue, handleSubmit }) => (
                <Form>
                  <div className="space-y-4 md:space-y-6">
                    {currentWorkstations.map((workstation, wsIndex) => {
                      const globalWsIndex = workstations.findIndex(
                        (ws) => ws.workstation_id === workstation.workstation_id
                      );

                      return (
                        <div key={workstation.workstation_id} className="border border-gray-200 rounded-lg md:rounded-xl p-3 md:p-4 lg:p-6 hover:border-blue-300 transition-colors duration-200">
                          {/* Workstation Header */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 p-3 md:p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-start md:items-center space-x-3 md:space-x-4 mb-3 md:mb-0">
                              <div className="bg-blue-100 p-2 md:p-3 rounded-lg">
                                <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-base md:text-lg text-gray-800">
                                  WS {workstation.workstation_no || workstation.workstation_id}
                                </h3>
                                <p className="text-gray-600 text-xs md:text-sm">ID: {workstation.workstation_id}</p>
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                              <div className="flex items-center">
                                <label className="text-xs md:text-sm font-medium text-gray-700 mr-2 whitespace-nowrap">WS No:</label>
                                <Field
                                  name={`workstations.${globalWsIndex}.workstation_no`}
                                  className={`px-2 md:px-3 py-1.5 md:py-2 border rounded-lg w-16 md:w-20 text-sm transition-colors duration-200 ${
                                    editingWorkstation === workstation.workstation_id
                                      ? "border-blue-500 bg-white"
                                      : "border-gray-300 bg-gray-100"
                                  }`}
                                  disabled={editingWorkstation !== workstation.workstation_id}
                                />
                              </div>
                              <div className="flex space-x-2">
                                {isEditing && editingWorkstation === workstation.workstation_id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateWorkstation(workstation.workstation_id, values.workstations[globalWsIndex])}
                                      className="px-2 md:px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 font-medium flex items-center text-xs md:text-sm"
                                    >
                                      <svg className="w-3 h-3 md:w-4 md:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Update
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEdit}
                                      className="px-2 md:px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium text-xs md:text-sm"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEditWorkstation(workstation.workstation_id)}
                                      className="px-2 md:px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center text-xs md:text-sm"
                                    >
                                      <svg className="w-3 h-3 md:w-4 md:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteWorkstation(workstation.workstation_id)}
                                      className="px-2 md:px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium flex items-center text-xs md:text-sm"
                                    >
                                      <svg className="w-3 h-3 md:w-4 md:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Operations */}
                          <FieldArray name={`workstations.${globalWsIndex}.operations`}>
                            {({ push: pushOp, remove: removeOp }) => (
                              <div>
                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Op No</th>
                                        <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</th>
                                        <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">M/C Type</th>
                                        <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SMV</th>
                                        <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {values.workstations[globalWsIndex]?.operations?.length === 0 ? (
                                        <tr>
                                          <td colSpan={5} className="px-4 md:px-6 py-4 md:py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                              <svg className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                              </svg>
                                              <p className="text-sm">No operations added yet</p>
                                              <p className="text-xs text-gray-400">Add your first operation to get started</p>
                                            </div>
                                          </td>
                                        </tr>
                                      ) : (
                                        values.workstations[globalWsIndex]?.operations?.map((operation, opIndex) => {
                                          const filteredOps = getFilteredOperations(globalWsIndex, opIndex);
                                          const searchTerm = operationSearchTerms[`${globalWsIndex}-${opIndex}`] || '';
                                          const shouldShow = showSuggestions[`${globalWsIndex}-${opIndex}`] && editingWorkstation === workstation.workstation_id;

                                          return (
                                            <tr key={opIndex} className="hover:bg-gray-50 transition-colors duration-150 relative">
                                              <td className="px-3 md:px-4 py-2 md:py-3 whitespace-nowrap">
                                                <Field
                                                  name={`workstations.${globalWsIndex}.operations.${opIndex}.operation_no`}
                                                  className={`w-full px-2 md:px-3 py-1.5 md:py-2 text-sm border rounded-lg transition-colors duration-200 ${
                                                    editingWorkstation === workstation.workstation_id
                                                      ? "border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                      : "border-gray-300 bg-gray-100"
                                                  }`}
                                                  disabled={editingWorkstation !== workstation.workstation_id}
                                                />
                                                <ErrorMessage
                                                  name={`workstations.${globalWsIndex}.operations.${opIndex}.operation_no`}
                                                  component="div"
                                                  className="text-red-500 text-xs md:text-sm mt-1"
                                                />
                                              </td>
                                              <td className="px-3 md:px-4 py-2 md:py-3">
                                                <div className="relative">
                                                  <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => handleOperationSearchChange(globalWsIndex, opIndex, e.target.value)}
                                                    onFocus={() => handleInputFocus(globalWsIndex, opIndex)}
                                                    onBlur={() => handleInputBlur(globalWsIndex, opIndex)}
                                                    placeholder="Search operations..."
                                                    className={`w-full px-2 md:px-3 py-1.5 md:py-2 text-sm border rounded-lg transition-colors duration-200 ${
                                                      editingWorkstation === workstation.workstation_id
                                                        ? "border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                        : "border-gray-300 bg-gray-100"
                                                    }`}
                                                    disabled={editingWorkstation !== workstation.workstation_id}
                                                  />
                                                  
                                                  {/* Hidden fields for formik */}
                                                  <Field
                                                    name={`workstations.${globalWsIndex}.operations.${opIndex}.sub_operation_id`}
                                                    type="hidden"
                                                  />
                                                  <Field
                                                    name={`workstations.${globalWsIndex}.operations.${opIndex}.operation_name`}
                                                    type="hidden"
                                                  />

                                                  {/* Suggestions Dropdown */}
                                                  {shouldShow && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                                      {filteredOps.length === 0 ? (
                                                        <div className="px-3 py-2 text-gray-500 text-sm">No operations found</div>
                                                      ) : (
                                                        filteredOps.map((subOp) => (
                                                          <div
                                                            key={subOp.sub_operation_id}
                                                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                                                            onClick={() => handleOperationSelect(setFieldValue, globalWsIndex, opIndex, subOp)}
                                                          >
                                                            <div className="font-medium text-gray-800 text-sm">{subOp.sub_operation_name}</div>
                                                            <div className="text-xs text-gray-500">
                                                              SMV: {subOp.smv} | M/C: {subOp.machine_type}
                                                            </div>
                                                          </div>
                                                        ))
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                                <ErrorMessage
                                                  name={`workstations.${globalWsIndex}.operations.${opIndex}.sub_operation_id`}
                                                  component="div"
                                                  className="text-red-500 text-xs md:text-sm mt-1"
                                                />
                                              </td>
                                              <td className="px-3 md:px-4 py-2 md:py-3">
                                                <Field
                                                  name={`workstations.${globalWsIndex}.operations.${opIndex}.machine_type`}
                                                  className={`w-full px-2 md:px-3 py-1.5 md:py-2 text-sm border rounded-lg transition-colors duration-200 ${
                                                    editingWorkstation === workstation.workstation_id
                                                      ? "border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                      : "border-gray-300 bg-gray-100"
                                                  }`}
                                                  disabled={editingWorkstation !== workstation.workstation_id}
                                                />
                                                <ErrorMessage
                                                  name={`workstations.${globalWsIndex}.operations.${opIndex}.machine_type`}
                                                  component="div"
                                                  className="text-red-500 text-xs md:text-sm mt-1"
                                                />
                                              </td>
                                              <td className="px-3 md:px-4 py-2 md:py-3">
                                                <Field
                                                  name={`workstations.${globalWsIndex}.operations.${opIndex}.smv`}
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  className={`w-full px-2 md:px-3 py-1.5 md:py-2 text-sm border rounded-lg transition-colors duration-200 ${
                                                    editingWorkstation === workstation.workstation_id
                                                      ? "border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                      : "border-gray-300 bg-gray-100"
                                                  }`}
                                                  disabled={editingWorkstation !== workstation.workstation_id}
                                                />
                                                <ErrorMessage
                                                  name={`workstations.${globalWsIndex}.operations.${opIndex}.smv`}
                                                  component="div"
                                                  className="text-red-500 text-xs md:text-sm mt-1"
                                                />
                                              </td>
                                              <td className="px-3 md:px-4 py-2 md:py-3 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() => removeOp(opIndex)}
                                                  className="text-red-500 hover:text-red-700 transition-colors duration-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                  disabled={editingWorkstation !== workstation.workstation_id}
                                                  title="Remove operation"
                                                >
                                                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                  </svg>
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-3">
                                  {values.workstations[globalWsIndex]?.operations?.length === 0 ? (
                                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                                      <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <p className="text-sm text-gray-500">No operations added yet</p>
                                      <p className="text-xs text-gray-400 mt-1">Add your first operation to get started</p>
                                    </div>
                                  ) : (
                                    values.workstations[globalWsIndex]?.operations?.map((operation, opIndex) => {
                                      const filteredOps = getFilteredOperations(globalWsIndex, opIndex);
                                      const searchTerm = operationSearchTerms[`${globalWsIndex}-${opIndex}`] || '';
                                      const shouldShow = showSuggestions[`${globalWsIndex}-${opIndex}`] && editingWorkstation === workstation.workstation_id;

                                      return (
                                        <div key={opIndex} className="border border-gray-200 rounded-lg p-4 bg-white">
                                          <div className="flex justify-between items-start mb-3">
                                            <div>
                                              <div className="flex items-center space-x-2 mb-2">
                                                <span className="text-xs font-medium text-gray-500">Op No:</span>
                                                <Field
                                                  name={`workstations.${globalWsIndex}.operations.${opIndex}.operation_no`}
                                                  className={`px-2 py-1.5 text-sm border rounded w-20 transition-colors duration-200 ${
                                                    editingWorkstation === workstation.workstation_id
                                                      ? "border-blue-300 focus:border-blue-500"
                                                      : "border-gray-300 bg-gray-100"
                                                  }`}
                                                  disabled={editingWorkstation !== workstation.workstation_id}
                                                />
                                              </div>
                                              <ErrorMessage
                                                name={`workstations.${globalWsIndex}.operations.${opIndex}.operation_no`}
                                                component="div"
                                                className="text-red-500 text-xs mt-1"
                                              />
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => removeOp(opIndex)}
                                              className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                              disabled={editingWorkstation !== workstation.workstation_id}
                                              title="Remove operation"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                            </button>
                                          </div>

                                          {/* Operation Search */}
                                          <div className="mb-3">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Operation</label>
                                            <div className="relative">
                                              <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => handleOperationSearchChange(globalWsIndex, opIndex, e.target.value)}
                                                onFocus={() => handleInputFocus(globalWsIndex, opIndex)}
                                                onBlur={() => handleInputBlur(globalWsIndex, opIndex)}
                                                placeholder="Search operations..."
                                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-colors duration-200 ${
                                                  editingWorkstation === workstation.workstation_id
                                                    ? "border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    : "border-gray-300 bg-gray-100"
                                                }`}
                                                disabled={editingWorkstation !== workstation.workstation_id}
                                              />
                                              
                                              <Field
                                                name={`workstations.${globalWsIndex}.operations.${opIndex}.sub_operation_id`}
                                                type="hidden"
                                              />
                                              <Field
                                                name={`workstations.${globalWsIndex}.operations.${opIndex}.operation_name`}
                                                type="hidden"
                                              />

                                              {/* Suggestions Dropdown */}
                                              {shouldShow && (
                                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                                  {filteredOps.length === 0 ? (
                                                    <div className="px-3 py-2 text-gray-500 text-sm">No operations found</div>
                                                  ) : (
                                                    filteredOps.map((subOp) => (
                                                      <div
                                                        key={subOp.sub_operation_id}
                                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                                                        onClick={() => handleOperationSelect(setFieldValue, globalWsIndex, opIndex, subOp)}
                                                      >
                                                        <div className="font-medium text-gray-800 text-sm">{subOp.sub_operation_name}</div>
                                                        <div className="text-xs text-gray-500">
                                                          SMV: {subOp.smv} | M/C: {subOp.machine_type}
                                                        </div>
                                                      </div>
                                                    ))
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            <ErrorMessage
                                              name={`workstations.${globalWsIndex}.operations.${opIndex}.sub_operation_id`}
                                              component="div"
                                              className="text-red-500 text-xs mt-1"
                                            />
                                          </div>

                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <label className="block text-xs font-medium text-gray-500 mb-1">M/C Type</label>
                                              <Field
                                                name={`workstations.${globalWsIndex}.operations.${opIndex}.machine_type`}
                                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-colors duration-200 ${
                                                  editingWorkstation === workstation.workstation_id
                                                    ? "border-blue-300 focus:border-blue-500"
                                                    : "border-gray-300 bg-gray-100"
                                                }`}
                                                disabled={editingWorkstation !== workstation.workstation_id}
                                              />
                                              <ErrorMessage
                                                name={`workstations.${globalWsIndex}.operations.${opIndex}.machine_type`}
                                                component="div"
                                                className="text-red-500 text-xs mt-1"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-500 mb-1">SMV</label>
                                              <Field
                                                name={`workstations.${globalWsIndex}.operations.${opIndex}.smv`}
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className={`w-full px-3 py-2 text-sm border rounded-lg transition-colors duration-200 ${
                                                  editingWorkstation === workstation.workstation_id
                                                    ? "border-blue-300 focus:border-blue-500"
                                                    : "border-gray-300 bg-gray-100"
                                                }`}
                                                disabled={editingWorkstation !== workstation.workstation_id}
                                              />
                                              <ErrorMessage
                                                name={`workstations.${globalWsIndex}.operations.${opIndex}.smv`}
                                                component="div"
                                                className="text-red-500 text-xs mt-1"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>

                                {/* Add Operation Button */}
                                <div className="mt-4">
                                  <button
                                    type="button"
                                    onClick={() => pushOp({
                                      sub_operation_id: "",
                                      operation_no: "",
                                      operation_name: "",
                                      machine_type: "",
                                      smv: 0,
                                    })}
                                    className="w-full md:w-auto px-3 md:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    disabled={editingWorkstation !== workstation.workstation_id}
                                  >
                                    <svg className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Operation
                                  </button>
                                </div>
                              </div>
                            )}
                          </FieldArray>
                        </div>
                      );
                    })}
                  </div>

                  {/* Save All Button */}
                  <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full md:w-auto px-6 md:px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm md:text-base"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Saving All Operations...
                        </>
                      ) : (
                        "Save All Operations"
                      )}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>

          {/* Pagination Controls - Bottom */}
          {workstations.length > itemsPerPage && (
            <div className="bg-gray-50 px-4 md:px-6 py-3 border-t">
              <ReactPaginate
                previousLabel={"←"}
                nextLabel={"→"}
                pageCount={pageCount}
                onPageChange={handlePageClick}
                forcePage={currentPage}
                containerClassName={"flex items-center justify-center space-x-1 md:space-x-2"}
                pageClassName={""}
                pageLinkClassName={"px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition-colors duration-200 min-w-[32px] md:min-w-[40px] text-center text-sm"}
                previousClassName={""}
                previousLinkClassName={"px-2 md:px-4 py-1.5 md:py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition-colors duration-200 text-sm"}
                nextClassName={""}
                nextLinkClassName={"px-2 md:px-4 py-1.5 md:py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition-colors duration-200 text-sm"}
                activeClassName={"active"}
                activeLinkClassName={"bg-blue-500 text-white border-blue-500 hover:bg-blue-600"}
                disabledClassName={"opacity-50 cursor-not-allowed"}
                disabledLinkClassName={"hover:bg-transparent"}
                breakLabel={"..."}
                breakClassName={"px-2"}
                marginPagesDisplayed={1}
                pageRangeDisplayed={2}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddLineLayout;