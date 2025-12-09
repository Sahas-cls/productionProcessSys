import React, { useMemo, useState, useEffect, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { GoArrowLeft } from "react-icons/go";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import useThreads from "../../hooks/useTreads";
import useNeedles from "../../hooks/useNeedles";
import useMachineTypes from "../../hooks/useMachineTypes";
import useMachine from "../../hooks/useMachine";

const EditSubOperationPage = () => {
  const location = useLocation();
  const subOperation = location.state?.subOperation;
  const operationId = location.state?.operationId;
  const subOperationId = subOperation?.sub_operation_id;
  const navigate = useNavigate();

  // Refs for suggestion dropdowns to handle click outside
  const machineTypeRef = useRef(null);
  const machineRef = useRef(null);
  const needleRef = useRef(null);
  const threadRef = useRef(null);
  const looperRef = useRef(null);

  // Hooks
  const { machineTList, machineTLoading, machineTRefresh } = useMachineTypes();
  const {
    isLoading: machineLoading,
    machineList,
    refresh: machineRefresh,
  } = useMachine();
  const { isLoading: threadLoading, threadList, refreshThreads } = useThreads();
  const { isLoading: needlesLoading, needleList, refreshNeedle } = useNeedles();

  // State for dropdown visibility
  const [showMachineTypeSuggestions, setShowMachineTypeSuggestions] =
    useState(false);
  const [showMachineSuggestions, setShowMachineSuggestions] = useState(false);
  console.log("machine suggestion show?: ", showMachineSuggestions);
  const [showNeedleSuggestions, setShowNeedleSuggestions] = useState(false);
  const [showThreadSuggestions, setShowThreadSuggestions] = useState(false);
  const [showLooperSuggestions, setShowLooperSuggestions] = useState(false);

  // Search states - initialize with actual values from subOperation
  const [machineTypeSearch, setMachineTypeSearch] = useState("");
  const [machineSearch, setMachineSearch] = useState("");
  const [needleSearch, setNeedleSearch] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [looperSearch, setLooperSearch] = useState("");

  // Current selected values for display
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedNeedle, setSelectedNeedle] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [selectedLooper, setSelectedLooper] = useState(null);

  console.log("SubOperation Data:", subOperation);

  const handleGoBack = () => {
    navigate(-1);
  };

  const apiUrl = import.meta.env.VITE_API_URL;

  // Initialize selected values from subOperation data
  useEffect(() => {
    if (subOperation) {
      // Set selected machine
      const machine = subOperation.machines?.[0];
      if (machine) {
        setSelectedMachine(machine);
        setMachineSearch(machine.machine_no || "");
      }

      // Set selected needle
      if (subOperation.needle_type) {
        setSelectedNeedle(subOperation.needle_type);
        setNeedleSearch(subOperation.needle_type.needle_type || "");
      }

      // Set selected thread
      if (subOperation.thread) {
        setSelectedThread(subOperation.thread);
        setThreadSearch(subOperation.thread.thread_category || "");
      }

      // Set selected looper
      if (subOperation.looper) {
        setSelectedLooper(subOperation.looper);
        setLooperSearch(subOperation.looper.thread_category || "");
      }

      // Set machine type search
      if (subOperation.machine_type) {
        setMachineTypeSearch(subOperation.machine_type);
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
      if (machineRef.current && !machineRef.current.contains(event.target)) {
        setShowMachineSuggestions(false);
      }
      if (needleRef.current && !needleRef.current.contains(event.target)) {
        setShowNeedleSuggestions(false);
      }
      if (threadRef.current && !threadRef.current.contains(event.target)) {
        setShowThreadSuggestions(false);
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
    const machines = subOperation?.machines || [];
    const firstMachine = machines[0] || {};
    const needleType = subOperation?.needle_type || {};
    const thread = subOperation?.thread || {};
    const looper = subOperation?.looper || {};

    return {
      // Basic sub-operation data
      sub_operation_name: subOperation?.sub_operation_name || "",
      smv: subOperation?.smv || "",
      remark: subOperation?.remark || "-",
      sub_operation_number: subOperation?.sub_operation_number || "",
      needle_count: subOperation?.needle_count || "",
      spi: subOperation?.spi || "",
      machine_type: subOperation?.machine_type || "",

      // Machine data - send IDs only
      machine_id: firstMachine.machine_id?.toString() || "",

      // Needle, Thread, Looper - send IDs only
      needle_type_id: needleType.needle_type_id?.toString() || "",
      thread_id: thread.thread_id?.toString() || "",
      looper_id: looper.looper_id?.toString() || "",
    };
  };

  // Filter machine types
  const filteredMachineTypes = useMemo(() => {
    if (!machineTypeSearch || !machineTList || !Array.isArray(machineTList)) {
      return machineTList || [];
    }
    return machineTList.filter((type) =>
      type.toLowerCase().includes(machineTypeSearch.toLowerCase())
    );
  }, [machineTList, machineTypeSearch]);

  // Filter machines based on search - always show if there's a search
  const filteredMachines = useMemo(() => {
    if (!machineSearch || !Array.isArray(machineList)) {
      return [];
    }
    return machineList.filter(
      (machine) =>
        machine.machine_no
          ?.toLowerCase()
          .includes(machineSearch.toLowerCase()) ||
        machine.machine_name
          ?.toLowerCase()
          .includes(machineSearch.toLowerCase())
    );
  }, [machineList, machineSearch]);

  // Filter needles
  const filteredNeedles = useMemo(() => {
    if (!needleSearch || !Array.isArray(needleList)) {
      return needleList || [];
    }
    return needleList.filter(
      (needle) =>
        needle.needle_type
          ?.toLowerCase()
          .includes(needleSearch.toLowerCase()) ||
        needle.needle_category
          ?.toLowerCase()
          .includes(needleSearch.toLowerCase())
    );
  }, [needleList, needleSearch]);

  // Filter threads
  const filteredThreads = useMemo(() => {
    if (!threadSearch || !Array.isArray(threadList)) {
      return threadList || [];
    }
    return threadList.filter(
      (thread) =>
        thread.thread_category
          ?.toLowerCase()
          .includes(threadSearch.toLowerCase()) ||
        thread.description?.toLowerCase().includes(threadSearch.toLowerCase())
    );
  }, [threadList, threadSearch]);

  // Filter loopers (using same thread list but filtered differently)
  const filteredLoopers = useMemo(() => {
    if (!looperSearch || !Array.isArray(threadList)) {
      return threadList || [];
    }
    return threadList.filter(
      (thread) =>
        thread.thread_category
          ?.toLowerCase()
          .includes(looperSearch.toLowerCase()) ||
        thread.description?.toLowerCase().includes(looperSearch.toLowerCase())
    );
  }, [threadList, looperSearch]);

  // Format data for API submission
  const formatSubmitData = (values) => {
    return {
      sub_operation_name: values.sub_operation_name,
      smv: parseFloat(values.smv) || 0,
      remark: values.remark,
      sub_operation_number: values.sub_operation_number,
      needle_count: parseFloat(values.needle_count) || 0,
      spi: parseFloat(values.spi) || 0,
      machine_type: values.machine_type,
      machine_id: values.machine_id ? parseInt(values.machine_id) : null,
      needle_type_id: values.needle_type_id
        ? parseInt(values.needle_type_id)
        : null,
      thread_id: values.thread_id ? parseInt(values.thread_id) : null,
      looper_id: values.looper_id ? parseInt(values.looper_id) : null,
    };
  };

  // Handle machine selection
  const handleMachineSelect = (machine, setFieldValue) => {
    setSelectedMachine(machine);
    setFieldValue("machine_id", machine.machine_id.toString());
    setFieldValue("machine_type", machine.machine_type);
    setMachineSearch(machine.machine_no);
    setShowMachineSuggestions(false);
  };

  // Handle needle selection
  const handleNeedleSelect = (needle, setFieldValue) => {
    setSelectedNeedle(needle);
    setFieldValue("needle_type_id", needle.needle_type_id.toString());
    setNeedleSearch(needle.needle_type);
    setShowNeedleSuggestions(false);
  };

  // Handle thread selection
  const handleThreadSelect = (thread, setFieldValue) => {
    setSelectedThread(thread);
    setFieldValue("thread_id", thread.thread_id.toString());
    setThreadSearch(thread.thread_category);
    setShowThreadSuggestions(false);
  };

  // Handle looper selection
  const handleLooperSelect = (looper, setFieldValue) => {
    setSelectedLooper(looper);
    setFieldValue("looper_id", looper.thread_id.toString());
    setLooperSearch(looper.thread_category);
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
                  }
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
                // You might want to show an error message to the user here
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

                  {/* Machine Details Section */}
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

                        {/* Machine Selection */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Machine No / Name
                          </label>
                          <div className="relative" ref={machineRef}>
                            <input
                              type="text"
                              value={machineSearch}
                              onChange={(e) => {
                                const value = e.target.value;
                                setMachineSearch(value);
                                setShowMachineSuggestions(true);
                                // Clear machine selection if user types
                                if (value && selectedMachine) {
                                  setSelectedMachine(null);
                                  setFieldValue("machine_id", "");
                                  setFieldValue("machine_type", "");
                                }
                              }}
                              onFocus={() => setShowMachineSuggestions(true)}
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="Search machine by no or name"
                            />

                            {/* Current selection display */}
                            {selectedMachine && !machineSearch && (
                              <div className="absolute inset-0 px-4 py-3 text-gray-700 pointer-events-none">
                                {selectedMachine.machine_no} -{" "}
                                {selectedMachine.machine_name}
                              </div>
                            )}

                            {showMachineSuggestions &&
                              filteredMachines.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredMachines.map((machine) => (
                                    <button
                                      key={machine.machine_id}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleMachineSelect(
                                          machine,
                                          setFieldValue
                                        );
                                      }}
                                    >
                                      <div className="font-medium">
                                        {machine.machine_no}
                                      </div>
                                      {/* <div className="text-sm text-gray-600">{machine.machine_name}</div>
                                    <div className="text-xs text-gray-500">{machine.machine_type} | {machine.machine_brand}</div> */}
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                          <input
                            type="hidden"
                            name="machine_id"
                            value={values.machine_id || ""}
                          />
                        </div>

                        {/* Selected Machine Info */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Selected Machine Info
                          </label>
                          <div className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 min-h-[52px]">
                            {selectedMachine ? (
                              <div className="text-sm">
                                <div>
                                  <span className="font-medium">No:</span>{" "}
                                  {selectedMachine.machine_name}
                                </div>
                                {/* <div>
                                  <span className="font-medium">Brand:</span>{" "}
                                  {selectedMachine.machine_brand}
                                </div>
                                <div>
                                  <span className="font-medium">Status:</span>{" "}
                                  {selectedMachine.machine_status}
                                </div> */}
                              </div>
                            ) : (
                              <span className="text-gray-500">
                                No machine selected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Materials Section */}
                  <div className="lg:col-span-3 mt-4">
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h4 className="font-bold text-gray-800 text-lg mb-4 flex items-center">
                        <span className="w-3 h-3 bg-purple-600 rounded-full mr-3"></span>
                        Needles & Threads
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                        {/* Needle Type */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Needle Type
                          </label>
                          <div className="relative" ref={needleRef}>
                            <input
                              type="text"
                              value={needleSearch}
                              onChange={(e) => {
                                const value = e.target.value;
                                setNeedleSearch(value);
                                setShowNeedleSuggestions(true);
                                // Clear selection if user types
                                if (value && selectedNeedle) {
                                  setSelectedNeedle(null);
                                  setFieldValue("needle_type_id", "");
                                }
                              }}
                              onFocus={() => setShowNeedleSuggestions(true)}
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="Search needle type"
                            />

                            {selectedNeedle && !needleSearch && (
                              <div className="absolute inset-0 px-4 py-3 text-gray-700 pointer-events-none">
                                {selectedNeedle.needle_type} (
                                {selectedNeedle.needle_category})
                              </div>
                            )}

                            {showNeedleSuggestions &&
                              filteredNeedles.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredNeedles.map((needle) => (
                                    <button
                                      key={needle.needle_type_id}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleNeedleSelect(
                                          needle,
                                          setFieldValue
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

                        {/* Thread */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Thread
                          </label>
                          <div className="relative" ref={threadRef}>
                            <input
                              type="text"
                              value={threadSearch}
                              onChange={(e) => {
                                const value = e.target.value;
                                setThreadSearch(value);
                                setShowThreadSuggestions(true);
                                // Clear selection if user types
                                if (value && selectedThread) {
                                  setSelectedThread(null);
                                  setFieldValue("thread_id", "");
                                }
                              }}
                              onFocus={() => setShowThreadSuggestions(true)}
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="Search thread"
                            />

                            {selectedThread && !threadSearch && (
                              <div className="absolute inset-0 px-4 py-3 text-gray-700 pointer-events-none">
                                {selectedThread.thread_category}
                              </div>
                            )}

                            {showThreadSuggestions &&
                              filteredThreads.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredThreads.map((thread) => (
                                    <button
                                      key={thread.thread_id}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleThreadSelect(
                                          thread,
                                          setFieldValue
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
                            name="thread_id"
                            value={values.thread_id || ""}
                          />
                        </div>

                        {/* Looper */}
                        <div className="flex flex-col">
                          <label className="font-semibold text-gray-700 mb-2 text-sm">
                            Looper
                          </label>
                          <div className="relative" ref={looperRef}>
                            <input
                              type="text"
                              value={looperSearch}
                              onChange={(e) => {
                                const value = e.target.value;
                                setLooperSearch(value);
                                setShowLooperSuggestions(true);
                                // Clear selection if user types
                                if (value && selectedLooper) {
                                  setSelectedLooper(null);
                                  setFieldValue("looper_id", "");
                                }
                              }}
                              onFocus={() => setShowLooperSuggestions(true)}
                              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full"
                              placeholder="Search looper"
                            />

                            {selectedLooper && !looperSearch && (
                              <div className="absolute inset-0 px-4 py-3 text-gray-700 pointer-events-none">
                                {selectedLooper.thread_category}
                              </div>
                            )}

                            {showLooperSuggestions &&
                              filteredLoopers.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredLoopers.map((looper) => (
                                    <button
                                      key={looper.thread_id}
                                      type="button"
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleLooperSelect(
                                          looper,
                                          setFieldValue
                                        );
                                      }}
                                    >
                                      <div className="font-medium">
                                        {looper.thread_category}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {looper.description}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                          <input
                            type="hidden"
                            name="looper_id"
                            value={values.looper_id || ""}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Debug Info (Optional - Remove in production) */}
                {/* <div className="mt-6 p-4 bg-gray-100 rounded-lg text-xs text-gray-600">
                  <p>
                    <strong>Debug Info:</strong> Sub Operation ID:{" "}
                    {subOperationId} | Operation ID: {operationId}
                  </p>
                  <p>
                    <strong>Selected IDs:</strong> Machine: {values.machine_id}{" "}
                    | Needle: {values.needle_type_id} | Thread:{" "}
                    {values.thread_id} | Looper: {values.looper_id}
                  </p>
                </div> */}

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
                      // Reset search states
                      setMachineTypeSearch(subOperation?.machine_type || "");
                      setMachineSearch(
                        subOperation?.machines?.[0]?.machine_no || ""
                      );
                      setNeedleSearch(
                        subOperation?.needle_type?.needle_type || ""
                      );
                      setThreadSearch(
                        subOperation?.thread?.thread_category || ""
                      );
                      setLooperSearch(
                        subOperation?.looper?.thread_category || ""
                      );
                      setSelectedMachine(subOperation?.machines?.[0] || null);
                      setSelectedNeedle(subOperation?.needle_type || null);
                      setSelectedThread(subOperation?.thread || null);
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
