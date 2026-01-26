import React, { useMemo, useState, useEffect, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { GoArrowLeft } from "react-icons/go";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import useThreads from "../../hooks/useTreads";
import useNeedles from "../../hooks/useNeedles";
import useMachineTypes from "../../hooks/useMachineTypes";
// import SubOperation from "../../../../server/models/SubOperation";

const EditSubOperationPage = () => {
  const location = useLocation();
  const subOperation = location.state?.subOperation;
  const operationId = location.state?.operationId;
  const subOperationId = subOperation?.sub_operation_id;
  const navigate = useNavigate();

  console.log("sub operation data body: ", subOperation);
  console.log("needles array: ", subOperation?.needles);

  // Refs for suggestion dropdowns
  const machineTypeRef = useRef(null);
  const needleTypeRef = useRef(null);
  const needle1Ref = useRef(null);
  const needle2Ref = useRef(null);
  const bottom1Ref = useRef(null);
  const looperRef = useRef(null);

  // Hooks
  const { machineTList, machineTLoading, machineTRefresh } = useMachineTypes();
  const { threadList, refreshThreads } = useThreads();
  const { needleList, refreshNeedle } = useNeedles();

  // State for dropdown visibility
  const [showMachineTypeSuggestions, setShowMachineTypeSuggestions] =
    useState(false);
  const [showNeedleTypeSuggestions, setShowNeedleTypeSuggestions] =
    useState(false);
  const [showNeedle1Suggestions, setShowNeedle1Suggestions] = useState(false);
  const [showNeedle2Suggestions, setShowNeedle2Suggestions] = useState(false);
  const [showBottom1Suggestions, setShowBottom1Suggestions] = useState(false);
  const [showLooperSuggestions, setShowLooperSuggestions] = useState(false);

  // Search states
  const [machineTypeSearch, setMachineTypeSearch] = useState("");
  const [needleTypeSearch, setNeedleTypeSearch] = useState(
    subOperation?.needles[0]?.needle_type?.needle_type || "",
  );
  const [needle1Search, setNeedle1Search] = useState("");
  const [needle2Search, setNeedle2Search] = useState("");
  const [bottom1Search, setBottom1Search] = useState(
    subOperation?.needles[0]?.looper?.thread_category || "",
  );
  const [looperSearch, setLooperSearch] = useState("");

  // Selected values
  const [selectedNeedleType, setSelectedNeedleType] = useState(null);
  const [selectedNeedle1, setSelectedNeedle1] = useState(null);
  const [selectedNeedle2, setSelectedNeedle2] = useState(null);
  const [selectedBottom1, setSelectedBottom1] = useState(null);
  const [selectedLooper, setSelectedLooper] = useState(null);

  const mainOperation = subOperation.main_operation_id || null;

  const handleGoBack = () => {
    navigate(-1);
  };

  const apiUrl = import.meta.env.VITE_API_URL;

  // Initialize selected values from subOperation data - FIXED
  useEffect(() => {
    if (subOperation) {
      // Set machine type search
      if (subOperation.machine_type) {
        setMachineTypeSearch(subOperation.machine_type);
      }

      // Set needle type from main needle_type (machine details)
      if (subOperation.needle_type) {
        setSelectedNeedleType(subOperation.needle_type);
        setNeedleTypeSearch(subOperation.needle_type.needle_type || "");
      }

      // Find needle 1 and needle 2 from needles array
      const needles = subOperation.needles || [];
      console.log("Needles found:", needles);

      // Needle 1: Should have bottom_id
      const needle1 = needles.find(
        (n) => n.description === "Needle 1" || n.bottom_id !== null,
      );
      if (needle1 && needle1.needle_type) {
        setSelectedNeedle1(needle1.needle_type);
        setNeedle1Search(needle1.needle_type.needle_type || "");
      } else if (subOperation.needle_type) {
        // Fallback to main needle type
        setSelectedNeedle1(subOperation.needle_type);
        setNeedle1Search(subOperation.needle_type.needle_type || "");
      }

      // Needle 2: Should have looper_id
      const needle2 = needles.find(
        (n) => n.description === "Needle 2" || n.looper_id !== null,
      );
      if (needle2 && needle2.needle_type) {
        setSelectedNeedle2(needle2.needle_type);
        setNeedle2Search(needle2.needle_type.needle_type || "");
      } else if (subOperation.needle_type) {
        // Fallback to main needle type
        setSelectedNeedle2(subOperation.needle_type);
        setNeedle2Search(subOperation.needle_type.needle_type || "");
      }

      // Set bottom thread for needle 1
      const bottomNeedle = needles.find((n) => n.bottom_id !== null);
      if (bottomNeedle && bottomNeedle.bottom) {
        setSelectedBottom1(bottomNeedle.bottom);
        setBottom1Search(bottomNeedle.bottom.thread_category || "");
      }

      // Set looper thread for needle 2
      const looperNeedle = needles.find((n) => n.looper_id !== null);
      if (looperNeedle && looperNeedle.looper) {
        setSelectedLooper(looperNeedle.looper);
        setLooperSearch(looperNeedle.looper.thread_category || "");
      }
    }
  }, [subOperation]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        machineTypeRef.current &&
        !machineTypeRef.current.contains(event.target)
      ) {
        setShowMachineTypeSuggestions(false);
      }
      if (
        needleTypeRef.current &&
        !needleTypeRef.current.contains(event.target)
      ) {
        setShowNeedleTypeSuggestions(false);
      }
      if (needle1Ref.current && !needle1Ref.current.contains(event.target)) {
        setShowNeedle1Suggestions(false);
      }
      if (needle2Ref.current && !needle2Ref.current.contains(event.target)) {
        setShowNeedle2Suggestions(false);
      }
      if (bottom1Ref.current && !bottom1Ref.current.contains(event.target)) {
        setShowBottom1Suggestions(false);
      }
      if (looperRef.current && !looperRef.current.contains(event.target)) {
        setShowLooperSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get initial values for Formik - FIXED
  const getInitialValues = () => {
    const needles = subOperation?.needles || [];
    const needleType = subOperation?.needle_type || {};

    // Find needle 1 (has bottom)
    const needle1 = needles.find(
      (n) => n.description === "Needle 1" || n.bottom_id !== null,
    );
    // Find needle 2 (has looper)
    const needle2 = needles.find(
      (n) => n.description === "Needle 2" || n.looper_id !== null,
    );

    return {
      // Basic sub-operation data
      sub_operation_name: subOperation?.sub_operation_name || "",
      smv: subOperation?.smv || "",
      remark: subOperation?.remark || "-",
      sub_operation_number: subOperation?.sub_operation_number || "",
      needle_count: subOperation?.needle_count || "",
      spi: subOperation?.spi || "",
      machine_type: subOperation?.machine_type || "",

      // Needle type (from machine details section)
      needle_type_id: needleType.needle_type_id?.toString() || "",

      // Needle 1 data
      needle_type_id1:
        needle1?.needle_type?.needle_type_id?.toString() ||
        needleType.needle_type_id?.toString() ||
        "",
      thread_id1: needle1?.bottom_id?.toString() || "",

      // Needle 2 data (optional)
      needle_type_id2:
        needle2?.needle_type?.needle_type_id?.toString() ||
        needleType.needle_type_id?.toString() ||
        "",
      thread_id2: needle2?.looper_id?.toString() || "",
    };
  };

  // Filter machine types
  const filteredMachineTypes = useMemo(() => {
    if (!machineTypeSearch || !machineTList || !Array.isArray(machineTList)) {
      return machineTList || [];
    }
    return machineTList.filter((type) =>
      type.toLowerCase().includes(machineTypeSearch.toLowerCase()),
    );
  }, [machineTList, machineTypeSearch]);

  // Filter needles
  const filteredNeedleTypes = useMemo(() => {
    if (!needleTypeSearch || !Array.isArray(needleList)) {
      return needleList || [];
    }
    return needleList.filter(
      (needle) =>
        needle.needle_type
          ?.toLowerCase()
          .includes(needleTypeSearch.toLowerCase()) ||
        needle.needle_category
          ?.toLowerCase()
          .includes(needleTypeSearch.toLowerCase()),
    );
  }, [needleList, needleTypeSearch]);

  const filteredNeedles1 = useMemo(() => {
    if (!needle1Search || !Array.isArray(needleList)) {
      return needleList || [];
    }
    return needleList.filter(
      (needle) =>
        needle.needle_type
          ?.toLowerCase()
          .includes(needle1Search.toLowerCase()) ||
        needle.needle_category
          ?.toLowerCase()
          .includes(needle1Search.toLowerCase()),
    );
  }, [needleList, needle1Search]);

  const filteredNeedles2 = useMemo(() => {
    if (!needle2Search || !Array.isArray(needleList)) {
      return needleList || [];
    }
    return needleList.filter(
      (needle) =>
        needle.needle_type
          ?.toLowerCase()
          .includes(needle2Search.toLowerCase()) ||
        needle.needle_category
          ?.toLowerCase()
          .includes(needle2Search.toLowerCase()),
    );
  }, [needleList, needle2Search]);

  // Filter threads
  const filteredBottom1 = useMemo(() => {
    if (!bottom1Search || !Array.isArray(threadList)) {
      return threadList || [];
    }
    return threadList.filter(
      (thread) =>
        thread.thread_category
          ?.toLowerCase()
          .includes(bottom1Search.toLowerCase()) ||
        thread.description?.toLowerCase().includes(bottom1Search.toLowerCase()),
    );
  }, [threadList, bottom1Search]);

  // Filter looper threads
  const filteredLoopers = useMemo(() => {
    if (!looperSearch || !Array.isArray(threadList)) {
      return threadList || [];
    }
    return threadList.filter(
      (thread) =>
        thread.thread_category
          ?.toLowerCase()
          .includes(looperSearch.toLowerCase()) ||
        thread.description?.toLowerCase().includes(looperSearch.toLowerCase()),
    );
  }, [threadList, looperSearch]);

  // Format data for API submission
  const formatSubmitData = (values) => {
    return {
      sub_operation_name: values.sub_operation_name,
      main_operation_id: mainOperation,
      smv: parseFloat(values.smv) || 0,
      remark: values.remark,
      sub_operation_number: values.sub_operation_number,
      needle_count: parseFloat(values.needle_count) || 0,
      spi: parseFloat(values.spi) || 0,
      machine_type: values.machine_type,

      // Needle type from machine details section
      needle_type_id: values.needle_type_id
        ? parseInt(values.needle_type_id)
        : null,

      // Needle 1 and its bottom thread
      needle_type_id1: values.needle_type_id1
        ? parseInt(values.needle_type_id1)
        : null,
      thread_id1: values.thread_id1 ? parseInt(values.thread_id1) : null,

      // Needle 2 and its looper thread (optional)
      needle_type_id2: values.needle_type_id2
        ? parseInt(values.needle_type_id2)
        : null,
      thread_id2: values.thread_id2 ? parseInt(values.thread_id2) : null,
    };
  };

  // Handle needle type selection (from machine details)
  const handleNeedleTypeSelect = (needle, setFieldValue) => {
    setSelectedNeedleType(needle);
    setFieldValue("needle_type_id", needle.needle_type_id.toString());
    setNeedleTypeSearch(needle.needle_type);
    setShowNeedleTypeSuggestions(false);

    // Auto-populate needle1 and needle2 with the same type
    setSelectedNeedle1(needle);
    setFieldValue("needle_type_id1", needle.needle_type_id.toString());
    setNeedle1Search(needle.needle_type);

    setSelectedNeedle2(needle);
    setFieldValue("needle_type_id2", needle.needle_type_id.toString());
    setNeedle2Search(needle.needle_type);
  };

  // Handle needle1 selection
  const handleNeedle1Select = (needle, setFieldValue) => {
    setSelectedNeedle1(needle);
    setFieldValue("needle_type_id1", needle.needle_type_id.toString());
    setNeedle1Search(needle.needle_type);
    setShowNeedle1Suggestions(false);
  };

  // Handle needle2 selection
  const handleNeedle2Select = (needle, setFieldValue) => {
    setSelectedNeedle2(needle);
    setFieldValue("needle_type_id2", needle.needle_type_id.toString());
    setNeedle2Search(needle.needle_type);
    setShowNeedle2Suggestions(false);
  };

  // Handle bottom thread selection for needle1
  const handleBottom1Select = (thread, setFieldValue) => {
    setSelectedBottom1(thread);
    setFieldValue("thread_id1", thread.thread_id.toString());
    setBottom1Search(thread.thread_category);
    setShowBottom1Suggestions(false);
  };

  // Handle looper thread selection for needle2
  const handleLooperSelect = (thread, setFieldValue) => {
    setSelectedLooper(thread);
    setFieldValue("thread_id2", thread.thread_id.toString());
    setLooperSearch(thread.thread_category);
    setShowLooperSuggestions(false);
  };

  return (
    <div className="bg-gray-50 min-h-screen md:py-8 md:px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="md:mb-8 absolute md:relative">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 group"
          >
            <GoArrowLeft className="mr-2 text-xl group-hover:-translate-x-1 transition-transform duration-200" />
            <p className="text-sm">Back to Operation</p>
          </button>
        </div>

        <div className="flex items-center justify-center">
          <Formik
            initialValues={getInitialValues()}
            enableReinitialize={true}
            onSubmit={async (values, { setSubmitting }) => {
              try {
                console.log("Form submitted", values);
                const formattedData = formatSubmitData(values);
                console.log("Formatted data for API:", formattedData);

                const response = await axios.put(
                  `${apiUrl}/api/operationBulleting/edit-sub-operation/${subOperationId}`,
                  formattedData,
                  {
                    withCredentials: true,
                  },
                );

                console.log("Response:", response);
                if (response.status === 200) {
                  navigate(-1);
                }
              } catch (error) {
                console.error("Error updating sub-operation:", error);
                if (error.response) {
                  console.error("Response error:", error.response.data);
                }
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ resetForm, values, isSubmitting, setFieldValue }) => (
              <Form className="bg-white md:border border-gray-200 mt-2 md:mt-0 md:p-6 sm:p-8 lg:p-12 rounded-2xl shadow-lg w-full max-w-6xl hover:shadow-xl transition-shadow duration-300">
                {/* Form Header */}
                <div className="text-center mb-8 sm:mb-12 mt-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                    Edit Sub-Operation
                  </h1>
                  <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 px-2 md:shadow-md md:p-8">
                  {/* Basic Information */}
                  <div className="lg:col-span-3 bg-gray-50 p-6 rounded-xl border border-gray-200 mb-4">
                    <h4 className="font-bold text-gray-800 text-lg mb-4 flex items-center">
                      <span className="w-3 h-3 bg-blue-600 rounded-full mr-3"></span>
                      Basic Information
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Sub Operation Name */}
                      <div className="flex flex-col lg:col-span-2">
                        <label className="font-semibold text-gray-700 mb-2 text-sm">
                          Sub Operation Name
                        </label>
                        <Field
                          name="sub_operation_name"
                          className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          placeholder="Enter sub operation name"
                        />
                        <ErrorMessage
                          name="sub_operation_name"
                          component="div"
                          className="text-red-500 text-sm mt-2"
                        />
                      </div>

                      {/* Sub Operation Number */}
                      <div className="flex flex-col">
                        <label className="font-semibold text-gray-700 mb-2 text-sm">
                          Sub Operation Number
                        </label>
                        <Field
                          name="sub_operation_number"
                          className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          placeholder="e.g., Sub OP"
                        />
                      </div>

                      {/* SMV */}
                      <div className="flex flex-col">
                        <label className="font-semibold text-gray-700 mb-2 text-sm">
                          SMV
                        </label>
                        <Field
                          name="smv"
                          className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                        />
                        <ErrorMessage
                          name="smv"
                          component="div"
                          className="text-red-500 text-sm mt-2"
                        />
                      </div>

                      {/* SPI */}
                      <div className="flex flex-col">
                        <label className="font-semibold text-gray-700 mb-2 text-sm">
                          SPI
                        </label>
                        <Field
                          name="spi"
                          className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          type="number"
                          step="0.1"
                          placeholder="0"
                        />
                      </div>

                      {/* Needle Count */}
                      <div className="flex flex-col">
                        <label className="font-semibold text-gray-700 mb-2 text-sm">
                          Needle Size
                        </label>
                        <Field
                          name="needle_count"
                          className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                        />
                      </div>

                      {/* Remark */}
                      <div className="flex flex-col lg:col-span-3">
                        <label className="font-semibold text-gray-700 mb-2 text-sm">
                          Remark
                        </label>
                        <Field
                          name="remark"
                          className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                          as="textarea"
                          rows={3}
                          placeholder="Add any remarks..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* MACHINE DETAILS SECTION */}
                  <div className="lg:col-span-3">
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h4 className="font-bold text-gray-800 text-lg mb-4 flex items-center">
                        <span className="w-3 h-3 bg-green-600 rounded-full mr-3"></span>
                        Machine Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Machine Type */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Machine Type
                          </label>
                          <div className="relative" ref={machineTypeRef}>
                            <input
                              type="text"
                              value={machineTypeSearch}
                              onChange={(e) => {
                                const value = e.target.value;
                                setMachineTypeSearch(value);
                                setFieldValue("machine_type", value);
                                setShowMachineTypeSuggestions(true);
                              }}
                              onFocus={() =>
                                setShowMachineTypeSuggestions(true)
                              }
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="e.g., Single Needle Machine"
                            />

                            {showMachineTypeSuggestions &&
                              filteredMachineTypes.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredMachineTypes.map((type, index) => (
                                    <button
                                      key={index}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setFieldValue("machine_type", type);
                                        setMachineTypeSearch(type);
                                        setShowMachineTypeSuggestions(false);
                                      }}
                                    >
                                      {type}
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Needle Type */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Needle Type
                          </label>
                          <div className="relative" ref={needleTypeRef}>
                            <input
                              type="text"
                              value={needleTypeSearch}
                              onChange={(e) => {
                                const value = e.target.value;
                                setNeedleTypeSearch(value);
                                setShowNeedleTypeSuggestions(true);
                                if (value && selectedNeedleType) {
                                  setSelectedNeedleType(null);
                                  setFieldValue("needle_type_id", "");
                                }
                              }}
                              onFocus={() => setShowNeedleTypeSuggestions(true)}
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="Select needle type"
                            />

                            {selectedNeedleType && !needleTypeSearch && (
                              <div className="absolute inset-0 px-4 py-3 text-gray-700 pointer-events-none">
                                {selectedNeedleType.needle_type} (
                                {selectedNeedleType.needle_category})
                              </div>
                            )}

                            {showNeedleTypeSuggestions &&
                              filteredNeedleTypes.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredNeedleTypes.map((needle) => (
                                    <button
                                      key={needle.needle_type_id}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleNeedleTypeSelect(
                                          needle,
                                          setFieldValue,
                                        );
                                      }}
                                    >
                                      <div className="font-medium">
                                        {needle.needle_type}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {needle.needle_category}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                          <input
                            type="hidden"
                            name="needle_type_id"
                            value={values.needle_type_id || ""}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NEEDLE & THREAD SECTION */}
                  <div className="lg:col-span-3 mt-4">
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h4 className="font-bold text-gray-800 text-lg mb-4 flex items-center">
                        <span className="w-3 h-3 bg-purple-600 rounded-full mr-3"></span>
                        Needle & Thread Details
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                        {/* Needle 1 */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Needle 1
                          </label>
                          <div className="relative" ref={needle1Ref}>
                            <input
                              type="text"
                              value={needle1Search}
                              disabled={true}
                              onChange={(e) => {
                                const value = e.target.value;
                                setNeedle1Search(value);
                                setShowNeedle1Suggestions(true);
                                if (value && selectedNeedle1) {
                                  setSelectedNeedle1(null);
                                  setFieldValue("needle_type_id1", "");
                                }
                              }}
                              onFocus={() => setShowNeedle1Suggestions(true)}
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="Needle type for needle 1"
                            />

                            {selectedNeedle1 && !needle1Search && (
                              <div className="absolute inset-0 px-4 py-3 text-gray-700 pointer-events-none">
                                {selectedNeedle1.needle_type} (
                                {selectedNeedle1.needle_category})
                              </div>
                            )}

                            {showNeedle1Suggestions &&
                              filteredNeedles1.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredNeedles1.map((needle) => (
                                    <button
                                      key={needle.needle_type_id}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleNeedle1Select(
                                          needle,
                                          setFieldValue,
                                        );
                                      }}
                                    >
                                      <div className="font-medium">
                                        {needle.needle_type}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {needle.needle_category}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                          <input
                            type="hidden"
                            name="needle_type_id1"
                            value={values.needle_type_id1 || ""}
                          />
                        </div>

                        {/* Bottom for Needle 1 */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Bottom for Needle 1
                          </label>
                          <div className="relative" ref={bottom1Ref}>
                            <input
                              type="text"
                              value={bottom1Search}
                              onChange={(e) => {
                                const value = e.target.value;
                                setBottom1Search(value);
                                setShowBottom1Suggestions(true);
                                if (value && selectedBottom1) {
                                  setSelectedBottom1(null);
                                  setFieldValue("thread_id1", "");
                                }
                              }}
                              onFocus={() => setShowBottom1Suggestions(true)}
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="Select thread for needle 1"
                            />

                            {selectedBottom1 && !bottom1Search && (
                              <div className="absolute inset-0 px-4 py-3 text-gray-700 pointer-events-none">
                                {selectedBottom1.thread_category}
                              </div>
                            )}

                            {showBottom1Suggestions &&
                              filteredBottom1.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredBottom1.map((thread) => (
                                    <button
                                      key={thread.thread_id}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleBottom1Select(
                                          thread,
                                          setFieldValue,
                                        );
                                      }}
                                    >
                                      <div className="font-medium">
                                        {thread.thread_category}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {thread.description}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                          <input
                            type="hidden"
                            name="thread_id1"
                            value={values.thread_id1 || ""}
                          />
                        </div>

                        {/* Needle 2 (Optional) */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Needle 2 (Optional)
                          </label>
                          <div className="relative" ref={needle2Ref}>
                            <input
                              type="text"
                              disabled={true}
                              value={needle2Search}
                              onChange={(e) => {
                                const value = e.target.value;
                                setNeedle2Search(value);
                                setShowNeedle2Suggestions(true);
                                if (value && selectedNeedle2) {
                                  setSelectedNeedle2(null);
                                  setFieldValue("needle_type_id2", "");
                                }
                              }}
                              onFocus={() => setShowNeedle2Suggestions(true)}
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="Needle type for needle 2 (optional)"
                            />

                            {selectedNeedle2 && !needle2Search && (
                              <div className="absolute inset-0 px-4 py-3 text-gray-700 pointer-events-none">
                                {selectedNeedle2.needle_type} (
                                {selectedNeedle2.needle_category})
                              </div>
                            )}

                            {showNeedle2Suggestions &&
                              filteredNeedles2.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredNeedles2.map((needle) => (
                                    <button
                                      key={needle.needle_type_id}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleNeedle2Select(
                                          needle,
                                          setFieldValue,
                                        );
                                      }}
                                    >
                                      <div className="font-medium">
                                        {needle.needle_type}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {needle.needle_category}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                          <input
                            type="hidden"
                            name="needle_type_id2"
                            value={values.needle_type_id2 || ""}
                          />
                        </div>

                        {/* Looper for Needle 2 */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Looper for Needle 2
                          </label>
                          <div className="relative" ref={looperRef}>
                            <input
                              type="text"
                              value={looperSearch}
                              onChange={(e) => {
                                const value = e.target.value;
                                setLooperSearch(value);
                                setShowLooperSuggestions(true);
                                if (value && selectedLooper) {
                                  setSelectedLooper(null);
                                  setFieldValue("thread_id2", "");
                                }
                              }}
                              onFocus={() => setShowLooperSuggestions(true)}
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="Select looper thread for needle 2"
                            />

                            {selectedLooper && !looperSearch && (
                              <div className="absolute inset-0 px-4 py-3 text-gray-700 pointer-events-none">
                                {selectedLooper.thread_category}
                              </div>
                            )}

                            {showLooperSuggestions &&
                              filteredLoopers.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredLoopers.map((thread) => (
                                    <button
                                      key={thread.thread_id}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleLooperSelect(
                                          thread,
                                          setFieldValue,
                                        );
                                      }}
                                    >
                                      <div className="font-medium">
                                        {thread.thread_category}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {thread.description}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                          <input
                            type="hidden"
                            name="thread_id2"
                            value={values.thread_id2 || ""}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-end px-2 md:px-0">
                  <button
                    type="button"
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
                    onClick={handleGoBack}
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      // Reset search states from needles array
                      const needles = subOperation?.needles || [];
                      const needle1 = needles.find((n) => n.bottom_id !== null);
                      const needle2 = needles.find((n) => n.looper_id !== null);

                      setMachineTypeSearch(subOperation?.machine_type || "");
                      setNeedleTypeSearch(
                        subOperation?.needle_type?.needle_type || "",
                      );
                      setNeedle1Search(
                        needle1?.needle_type?.needle_type ||
                          subOperation?.needle_type?.needle_type ||
                          "",
                      );
                      setNeedle2Search(
                        needle2?.needle_type?.needle_type ||
                          subOperation?.needle_type?.needle_type ||
                          "",
                      );
                      setBottom1Search(needle1?.bottom?.thread_category || "");
                      setLooperSearch(needle2?.looper?.thread_category || "");
                      setSelectedNeedleType(subOperation?.needle_type || null);
                      setSelectedNeedle1(
                        needle1?.needle_type ||
                          subOperation?.needle_type ||
                          null,
                      );
                      setSelectedNeedle2(
                        needle2?.needle_type ||
                          subOperation?.needle_type ||
                          null,
                      );
                      setSelectedBottom1(needle1?.bottom || null);
                      setSelectedLooper(needle2?.looper || null);
                    }}
                    className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors duration-200 font-medium"
                    disabled={isSubmitting}
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      "Update Sub-Operation"
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default EditSubOperationPage;
