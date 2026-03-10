import React, { useMemo, useState, useEffect, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { GoArrowLeft } from "react-icons/go";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import useThreads from "../../hooks/useTreads";
import useNeedles from "../../hooks/useNeedles";
import useMachineTypes from "../../hooks/useMachineTypes";
import Swal from "sweetalert2";

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
  const needle1ThreadRef = useRef(null);
  const needle2ThreadRef = useRef(null);
  const bobbinRef = useRef(null);
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
  const [showNeedle1ThreadSuggestions, setShowNeedle1ThreadSuggestions] =
    useState(false);
  const [showNeedle2ThreadSuggestions, setShowNeedle2ThreadSuggestions] =
    useState(false);
  const [showBobbinSuggestions, setShowBobbinSuggestions] = useState(false);
  const [showLooperSuggestions, setShowLooperSuggestions] = useState(false);

  // Search states
  const [machineTypeSearch, setMachineTypeSearch] = useState("");
  const [needleTypeSearch, setNeedleTypeSearch] = useState("");
  const [needle1ThreadSearch, setNeedle1ThreadSearch] = useState("");
  const [needle2ThreadSearch, setNeedle2ThreadSearch] = useState("");
  const [bobbinSearch, setBobbinSearch] = useState("");
  const [looperSearch, setLooperSearch] = useState("");

  // Selected values
  const [selectedNeedleType, setSelectedNeedleType] = useState(null);
  const [selectedNeedle1Thread, setSelectedNeedle1Thread] = useState(null);
  const [selectedNeedle2Thread, setSelectedNeedle2Thread] = useState(null);
  const [selectedBobbin, setSelectedBobbin] = useState(null);
  const [selectedLooper, setSelectedLooper] = useState(null);

  const mainOperation = subOperation.main_operation_id || null;

  const handleGoBack = () => {
    navigate(-1);
  };

  const apiUrl = import.meta.env.VITE_API_URL;

  // Initialize selected values from subOperation data
  useEffect(() => {
    if (subOperation) {
      console.log("Initializing from subOperation:", subOperation);

      // Set machine type search
      if (subOperation.machine_type) {
        setMachineTypeSearch(subOperation.machine_type);
      }

      // Set needle type from needle_type object
      if (subOperation.needle_type) {
        setSelectedNeedleType(subOperation.needle_type);
        setNeedleTypeSearch(subOperation.needle_type.needle_type || "");
      }

      // Find threads from needles array
      const needles = subOperation.needles || [];
      console.log("Needles found for initialization:", needles);

      // Find Needle 1 thread
      const needle1Needle = needles.find((n) => n.description === "Needle 1");
      if (needle1Needle && needle1Needle.thread) {
        console.log("Found Needle 1 thread:", needle1Needle.thread);
        setSelectedNeedle1Thread(needle1Needle.thread);
        setNeedle1ThreadSearch(needle1Needle.thread.thread_category || "");
      }

      // Find Needle 2 thread
      const needle2Needle = needles.find((n) => n.description === "Needle 2");
      if (needle2Needle && needle2Needle.thread) {
        console.log("Found Needle 2 thread:", needle2Needle.thread);
        setSelectedNeedle2Thread(needle2Needle.thread);
        setNeedle2ThreadSearch(needle2Needle.thread.thread_category || "");
      }

      // Find bobbin from the subOperation directly (bobbin_id field)
      if (subOperation.bobbin) {
        console.log("Found bobbin thread:", subOperation.bobbin);
        setSelectedBobbin(subOperation.bobbin);
        setBobbinSearch(subOperation.bobbin.thread_category || "");
      }

      // Find looper from the subOperation directly (looper_id field)
      if (subOperation.looper) {
        console.log("Found looper thread:", subOperation.looper);
        setSelectedLooper(subOperation.looper);
        setLooperSearch(subOperation.looper.thread_category || "");
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
      if (
        needle1ThreadRef.current &&
        !needle1ThreadRef.current.contains(event.target)
      ) {
        setShowNeedle1ThreadSuggestions(false);
      }
      if (
        needle2ThreadRef.current &&
        !needle2ThreadRef.current.contains(event.target)
      ) {
        setShowNeedle2ThreadSuggestions(false);
      }
      if (bobbinRef.current && !bobbinRef.current.contains(event.target)) {
        setShowBobbinSuggestions(false);
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

  // Get initial values for Formik
  const getInitialValues = () => {
    const needles = subOperation?.needles || [];
    const needleType = subOperation?.needle_type || {};

    // Find Needle 1 thread
    const needle1Needle = needles.find((n) => n.description === "Needle 1");
    // Find Needle 2 thread
    const needle2Needle = needles.find((n) => n.description === "Needle 2");

    return {
      // Basic sub-operation data
      sub_operation_name: subOperation?.sub_operation_name || "",
      smv: subOperation?.smv || "",
      remark: subOperation?.remark || "-",
      sub_operation_number: subOperation?.sub_operation_number || "",
      needle_count: subOperation?.needle_count || 0,
      spi: subOperation?.spi || "",
      machine_type: subOperation?.machine_type || "",

      // Needle type (from machine details section)
      needle_type_id: needleType.needle_type_id?.toString() || "",

      // Thread for Needle 1
      needle1_thread_id: needle1Needle?.thread_id?.toString() || "",

      // Bobbin thread (from subOperation directly)
      bobbin_thread_id: subOperation?.bobbin_id?.toString() || "",

      // Thread for Needle 2
      needle2_thread_id: needle2Needle?.thread_id?.toString() || "",

      // Looper thread (from subOperation directly)
      looper_thread_id: subOperation?.looper_id?.toString() || "",
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

  // Filter needles for machine details
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

  // Filter threads for needle 1 thread
  const filteredNeedle1Threads = useMemo(() => {
    if (!needle1ThreadSearch || !Array.isArray(threadList)) {
      return threadList || [];
    }
    return threadList.filter(
      (thread) =>
        thread.thread_category
          ?.toLowerCase()
          .includes(needle1ThreadSearch.toLowerCase()) ||
        thread.description
          ?.toLowerCase()
          .includes(needle1ThreadSearch.toLowerCase()),
    );
  }, [threadList, needle1ThreadSearch]);

  // Filter threads for needle 2 thread
  const filteredNeedle2Threads = useMemo(() => {
    if (!needle2ThreadSearch || !Array.isArray(threadList)) {
      return threadList || [];
    }
    return threadList.filter(
      (thread) =>
        thread.thread_category
          ?.toLowerCase()
          .includes(needle2ThreadSearch.toLowerCase()) ||
        thread.description
          ?.toLowerCase()
          .includes(needle2ThreadSearch.toLowerCase()),
    );
  }, [threadList, needle2ThreadSearch]);

  // Filter bobbin threads
  const filteredBobbinThreads = useMemo(() => {
    if (!bobbinSearch || !Array.isArray(threadList)) {
      return threadList || [];
    }
    return threadList.filter(
      (thread) =>
        thread.thread_category
          ?.toLowerCase()
          .includes(bobbinSearch.toLowerCase()) ||
        thread.description?.toLowerCase().includes(bobbinSearch.toLowerCase()),
    );
  }, [threadList, bobbinSearch]);

  // Filter looper threads
  const filteredLooperThreads = useMemo(() => {
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

  // Format data for API submission - MATCHING BACKEND EXPECTATIONS
  const formatSubmitData = (values) => {
    return {
      sub_operation_name: values.sub_operation_name,
      main_operation_id: mainOperation,
      smv: parseFloat(values.smv) || 0,
      remark: values.remark,
      sub_operation_number: values.sub_operation_number,
      needle_count: parseInt(values.needle_count) || 0,
      spi: parseFloat(values.spi) || 0,
      machine_type: values.machine_type,

      // Needle type
      needle_type_id: values.needle_type_id
        ? parseInt(values.needle_type_id)
        : null,

      // Individual thread IDs as expected by backend
      needle1_thread_id: values.needle1_thread_id
        ? parseInt(values.needle1_thread_id)
        : null,
      needle2_thread_id: values.needle2_thread_id
        ? parseInt(values.needle2_thread_id)
        : null,
      bobbin_thread_id: values.bobbin_thread_id
        ? parseInt(values.bobbin_thread_id)
        : null,
      looper_thread_id: values.looper_thread_id
        ? parseInt(values.looper_thread_id)
        : null,

      // Note: NOT sending needles array as backend doesn't expect it
    };
  };

  // Handle needle type selection (from machine details)
  const handleNeedleTypeSelect = (needle, setFieldValue) => {
    setSelectedNeedleType(needle);
    setFieldValue("needle_type_id", needle.needle_type_id.toString());
    setNeedleTypeSearch(needle.needle_type);
    setShowNeedleTypeSuggestions(false);
  };

  // Handle needle 1 thread selection
  const handleNeedle1ThreadSelect = (thread, setFieldValue) => {
    setSelectedNeedle1Thread(thread);
    setFieldValue("needle1_thread_id", thread.thread_id.toString());
    setNeedle1ThreadSearch(thread.thread_category);
    setShowNeedle1ThreadSuggestions(false);
  };

  // Handle needle 2 thread selection
  const handleNeedle2ThreadSelect = (thread, setFieldValue) => {
    setSelectedNeedle2Thread(thread);
    setFieldValue("needle2_thread_id", thread.thread_id.toString());
    setNeedle2ThreadSearch(thread.thread_category);
    setShowNeedle2ThreadSuggestions(false);
  };

  // Handle bobbin thread selection
  const handleBobbinSelect = (thread, setFieldValue) => {
    setSelectedBobbin(thread);
    setFieldValue("bobbin_thread_id", thread.thread_id.toString());
    setBobbinSearch(thread.thread_category);
    setShowBobbinSuggestions(false);
  };

  // Handle looper thread selection
  const handleLooperSelect = (thread, setFieldValue) => {
    setSelectedLooper(thread);
    setFieldValue("looper_thread_id", thread.thread_id.toString());
    setLooperSearch(thread.thread_category);
    setShowLooperSuggestions(false);
  };

  useEffect(() => {
    document.getElementById("title").scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen md:py-8 md:px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="md:mb-8 absolute md:relative p-4 md:p-0">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 group"
          >
            <GoArrowLeft className="mr-2 text-xl group-hover:-translate-x-1 transition-transform duration-200" />
            <p className="text-sm flex">
              Back <span className="hidden md:block">to Operation</span>
            </p>
          </button>
        </div>

        <div className="flex items-center justify-center">
          <Formik
            initialValues={getInitialValues()}
            enableReinitialize={true}
            onSubmit={async (values, { setSubmitting }) => {
              try {
                console.log("Form submitted values:", values);
                const formattedData = formatSubmitData(values);
                console.log("Formatted data for API:", formattedData);

                const response = await axios.put(
                  `${apiUrl}/api/operationBulleting/edit-sub-operation/${subOperationId}`,
                  formattedData,
                  {
                    withCredentials: true,
                  },
                );

                if (response.status === 200) {
                  await Swal.fire({
                    title: "Sub-Operation updated successfully",
                    icon: "success",
                  });
                  navigate(-1);
                }

                console.log("Response:", response);
              } catch (error) {
                console.error("Error updating sub-operation:", error);
                if (error.response) {
                  console.error("Response error:", error.response.data);
                  await Swal.fire({
                    title: "Error",
                    text:
                      error.response.data.message ||
                      "Failed to update sub-operation",
                    icon: "error",
                  });
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
                  <h1
                    id="title"
                    className="text-2xl pt-4 sm:text-3xl font-bold text-gray-800 mb-2"
                  >
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
                          disabled={true}
                          name="sub_operation_number"
                          className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-not-allowed"
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

                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Needle Count
                          </label>
                          <Field
                            type="number"
                            name="needle_count"
                            className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            placeholder="e.g., Sub OP"
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
                        {/* Thread for Needle 1 */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Thread for Needle 1
                          </label>
                          <div className="relative" ref={needle1ThreadRef}>
                            <input
                              type="text"
                              value={needle1ThreadSearch}
                              onChange={(e) => {
                                const value = e.target.value;
                                setNeedle1ThreadSearch(value);
                                setShowNeedle1ThreadSuggestions(true);
                                if (value && selectedNeedle1Thread) {
                                  setSelectedNeedle1Thread(null);
                                  setFieldValue("needle1_thread_id", "");
                                }
                              }}
                              onFocus={() =>
                                setShowNeedle1ThreadSuggestions(true)
                              }
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="Select thread for needle 1"
                            />

                            {selectedNeedle1Thread && !needle1ThreadSearch && (
                              <div className="absolute inset-0 px-4 py-3 text-gray-700 pointer-events-none">
                                {selectedNeedle1Thread.thread_category}
                              </div>
                            )}

                            {showNeedle1ThreadSuggestions &&
                              filteredNeedle1Threads.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredNeedle1Threads.map((thread) => (
                                    <button
                                      key={thread.thread_id}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleNeedle1ThreadSelect(
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
                            name="needle1_thread_id"
                            value={values.needle1_thread_id || ""}
                          />
                        </div>

                        {/* Bobbin for Needle 1 */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Thread for Bobbin
                          </label>
                          <div className="relative" ref={bobbinRef}>
                            <input
                              type="text"
                              value={bobbinSearch}
                              onChange={(e) => {
                                const value = e.target.value;
                                setBobbinSearch(value);
                                setShowBobbinSuggestions(true);
                                if (value && selectedBobbin) {
                                  setSelectedBobbin(null);
                                  setFieldValue("bobbin_thread_id", "");
                                }
                              }}
                              onFocus={() => setShowBobbinSuggestions(true)}
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="Select bobbin thread"
                            />

                            {selectedBobbin && !bobbinSearch && (
                              <div className="absolute inset-0 px-4 py-3 text-gray-700 pointer-events-none">
                                {selectedBobbin.thread_category}
                              </div>
                            )}

                            {showBobbinSuggestions &&
                              filteredBobbinThreads.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredBobbinThreads.map((thread) => (
                                    <button
                                      key={thread.thread_id}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleBobbinSelect(
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
                            name="bobbin_thread_id"
                            value={values.bobbin_thread_id || ""}
                          />
                        </div>

                        {/* Thread for Needle 2 */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Thread for Needle 2
                          </label>
                          <div className="relative" ref={needle2ThreadRef}>
                            <input
                              type="text"
                              value={needle2ThreadSearch}
                              onChange={(e) => {
                                const value = e.target.value;
                                setNeedle2ThreadSearch(value);
                                setShowNeedle2ThreadSuggestions(true);
                                if (value && selectedNeedle2Thread) {
                                  setSelectedNeedle2Thread(null);
                                  setFieldValue("needle2_thread_id", "");
                                }
                              }}
                              onFocus={() =>
                                setShowNeedle2ThreadSuggestions(true)
                              }
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="Select thread for needle 2"
                            />

                            {selectedNeedle2Thread && !needle2ThreadSearch && (
                              <div className="absolute inset-0 px-4 py-3 text-gray-700 pointer-events-none">
                                {selectedNeedle2Thread.thread_category}
                              </div>
                            )}

                            {showNeedle2ThreadSuggestions &&
                              filteredNeedle2Threads.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredNeedle2Threads.map((thread) => (
                                    <button
                                      key={thread.thread_id}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleNeedle2ThreadSelect(
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
                            name="needle2_thread_id"
                            value={values.needle2_thread_id || ""}
                          />
                        </div>

                        {/* Looper for Needle 2 */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Thread for Looper
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
                                  setFieldValue("looper_thread_id", "");
                                }
                              }}
                              onFocus={() => setShowLooperSuggestions(true)}
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="Select looper thread"
                            />

                            {selectedLooper && !looperSearch && (
                              <div className="absolute inset-0 px-4 py-3 text-gray-700 pointer-events-none">
                                {selectedLooper.thread_category}
                              </div>
                            )}

                            {showLooperSuggestions &&
                              filteredLooperThreads.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredLooperThreads.map((thread) => (
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
                            name="looper_thread_id"
                            value={values.looper_thread_id || ""}
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
                      // Reset search states to original values
                      const needles = subOperation?.needles || [];
                      const needle1Needle = needles.find(
                        (n) => n.description === "Needle 1",
                      );
                      const needle2Needle = needles.find(
                        (n) => n.description === "Needle 2",
                      );

                      setMachineTypeSearch(subOperation?.machine_type || "");
                      setNeedleTypeSearch(
                        subOperation?.needle_type?.needle_type || "",
                      );
                      setNeedle1ThreadSearch(
                        needle1Needle?.thread?.thread_category || "",
                      );
                      setNeedle2ThreadSearch(
                        needle2Needle?.thread?.thread_category || "",
                      );
                      setBobbinSearch(
                        subOperation?.bobbin?.thread_category || "",
                      );
                      setLooperSearch(
                        subOperation?.looper?.thread_category || "",
                      );

                      setSelectedNeedleType(subOperation?.needle_type || null);
                      setSelectedNeedle1Thread(needle1Needle?.thread || null);
                      setSelectedNeedle2Thread(needle2Needle?.thread || null);
                      setSelectedBobbin(subOperation?.bobbin || null);
                      setSelectedLooper(subOperation?.looper || null);
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
