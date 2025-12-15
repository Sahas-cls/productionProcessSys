import React, { useEffect, useState, useMemo, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import Swal from "sweetalert2";
import useMachineTypes from "../hooks/useMachineTypes";
import useAllMachine from "../hooks/useAllMachines";
import useNeedles from "../hooks/useNeedles";
import useThreads from "../hooks/useTreads";

// Validation Schema - Updated to accept numbers for IDs
const SubOperationSchema = Yup.object().shape({
  mainOperation: Yup.string().required("Main Operation is required"),
  subOperationNo: Yup.string().required("Sub Operation No is required"),
  smv: Yup.number()
    .required("SMV is required")
    .positive("SMV must be positive")
    .typeError("SMV must be a number"),
  subOperationName: Yup.string().required("Sub Operation Name is required"),
  machineType: Yup.string().required("Machine Type is required"),
  machineNo: Yup.number()
    .required("Machine No is required")
    .typeError("Machine No must be selected"),
  machineName: Yup.string().required("Machine Name is required"),
  needleCount: Yup.number()
    .required("Needle Count is required")
    .min(1, "Minimum 1 needle required")
    .max(10, "Maximum 10 needles allowed")
    .typeError("Needle Count must be a number"),
  needleType: Yup.number().nullable().typeError("Needle Type must be selected"),
  needleThreads: Yup.number()
    .nullable()
    .typeError("Needle Threads must be selected"),
  bobbinThread: Yup.number()
    .nullable()
    .typeError("Bobbin Thread must be selected"),
  spi: Yup.number().nullable(),
  remark: Yup.string().nullable(),
});

const apiUrl = import.meta.env.VITE_API_URL;

const AddSubOperationOB = ({ mainOp, setIsAddingSubOP }) => {
  const { machineTList } = useMachineTypes();
  const { machineList } = useAllMachine();

  // Needle data
  const { needleList } = useNeedles();

  // Thread & looper data
  const { threadList } = useThreads();

  const [selectedMachineT, setSelectedMachineT] = useState(null);

  // Search states for display values
  const [searchMachineType, setSearchMachineType] = useState("");
  const [searchMachineNo, setSearchMachineNo] = useState("");
  const [searchNeedleType, setSearchNeedleType] = useState("");
  const [searchBobbinThread, setSearchBobbinThread] = useState("");
  const [searchNeedleThreads, setSearchNeedleThreads] = useState("");

  // Display values for inputs (human readable)
  const [displayMachineNo, setDisplayMachineNo] = useState("");
  const [displayNeedleType, setDisplayNeedleType] = useState("");
  const [displayBobbinThread, setDisplayBobbinThread] = useState("");
  const [displayNeedleThreads, setDisplayNeedleThreads] = useState("");

  // Show suggestion states
  const [showMachineTypeSuggestions, setShowMachineTypeSuggestions] =
    useState(false);
  const [showMachineNoSuggestions, setShowMachineNoSuggestions] =
    useState(false);
  const [showNeedleTypeSuggestions, setShowNeedleTypeSuggestions] =
    useState(false);
  const [showBobbinThreadSuggestions, setShowBobbinThreadSuggestions] =
    useState(false);
  const [showNeedleThreadsSuggestions, setShowNeedleThreadsSuggestions] =
    useState(false);

  // Refs for click outside detection
  const machineTypeRef = useRef(null);
  const machineNoRef = useRef(null);
  const needleTypeRef = useRef(null);
  const bobbinThreadRef = useRef(null);
  const needleThreadsRef = useRef(null);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        machineTypeRef.current &&
        !machineTypeRef.current.contains(event.target)
      ) {
        setShowMachineTypeSuggestions(false);
      }
      if (
        machineNoRef.current &&
        !machineNoRef.current.contains(event.target)
      ) {
        setShowMachineNoSuggestions(false);
      }
      if (
        needleTypeRef.current &&
        !needleTypeRef.current.contains(event.target)
      ) {
        setShowNeedleTypeSuggestions(false);
      }
      if (
        bobbinThreadRef.current &&
        !bobbinThreadRef.current.contains(event.target)
      ) {
        setShowBobbinThreadSuggestions(false);
      }
      if (
        needleThreadsRef.current &&
        !needleThreadsRef.current.contains(event.target)
      ) {
        setShowNeedleThreadsSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtered machine list based on selected type
  const filteredMachineList = useMemo(() => {
    if (!machineList || machineList.length === 0) {
      return [];
    }
    if (!selectedMachineT || selectedMachineT === "") {
      return [];
    }
    return machineList.filter(
      (mch) =>
        mch.machine_type === selectedMachineT &&
        (!searchMachineNo ||
          mch.machine_no
            .toLowerCase()
            .includes(searchMachineNo.toLowerCase()) ||
          (mch.machine_name &&
            mch.machine_name
              .toLowerCase()
              .includes(searchMachineNo.toLowerCase())))
    );
  }, [selectedMachineT, machineList, searchMachineNo]);

  // Filter machine types for search
  const filteredMachineTypes = useMemo(() => {
    if (!machineTList || machineTList.length === 0) return [];
    if (!searchMachineType) return machineTList;

    return machineTList.filter((type) =>
      type.toLowerCase().includes(searchMachineType.toLowerCase())
    );
  }, [machineTList, searchMachineType]);

  // Filter needle types for search
  const filteredNeedleTypes = useMemo(() => {
    if (!needleList || needleList.length === 0) return [];
    if (!searchNeedleType) return needleList;

    return needleList.filter(
      (needle) =>
        (needle.needle_type &&
          needle.needle_type
            .toLowerCase()
            .includes(searchNeedleType.toLowerCase())) ||
        (needle.needle_category &&
          needle.needle_category
            .toLowerCase()
            .includes(searchNeedleType.toLowerCase())) ||
        (needle.needle_type_id &&
          needle.needle_type_id.toString().includes(searchNeedleType))
    );
  }, [needleList, searchNeedleType]);

  // Filter threads for bobbin/looper
  const filteredBobbinThreads = useMemo(() => {
    if (!threadList || threadList.length === 0) return [];
    if (!searchBobbinThread) return threadList;

    return threadList.filter(
      (thread) =>
        (thread.thread_category &&
          thread.thread_category
            .toLowerCase()
            .includes(searchBobbinThread.toLowerCase())) ||
        (thread.description &&
          thread.description
            .toLowerCase()
            .includes(searchBobbinThread.toLowerCase())) ||
        (thread.thread_id &&
          thread.thread_id.toString().includes(searchBobbinThread))
    );
  }, [threadList, searchBobbinThread]);

  // Filter threads for needle threads
  const filteredNeedleThreads = useMemo(() => {
    if (!threadList || threadList.length === 0) return [];
    if (!searchNeedleThreads) return threadList;

    return threadList.filter(
      (thread) =>
        (thread.thread_category &&
          thread.thread_category
            .toLowerCase()
            .includes(searchNeedleThreads.toLowerCase())) ||
        (thread.description &&
          thread.description
            .toLowerCase()
            .includes(searchNeedleThreads.toLowerCase())) ||
        (thread.thread_id &&
          thread.thread_id.toString().includes(searchNeedleThreads))
    );
  }, [threadList, searchNeedleThreads]);

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      setSubmitting(true);
      console.log("Form submitted with IDs:", values);

      const payload = {
        ...values,
        mainOperation_id: mainOp.operation_id,
      };

      const response = await axios.post(
        `${apiUrl}/api/OperationBulleting/create/sub-operation`,
        payload,
        { withCredentials: true }
      );

      if (response.data.success) {
        await Swal.fire({
          title: "Success!",
          text: response.data.message || "Sub-operation created successfully",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        resetForm();
        // Reset display states
        setDisplayMachineNo("");
        setDisplayNeedleType("");
        setDisplayBobbinThread("");
        setDisplayNeedleThreads("");
        setSearchMachineType("");
        setSearchMachineNo("");
        setSearchNeedleType("");
        setSearchBobbinThread("");
        setSearchNeedleThreads("");
        setSelectedMachineT(null);
        setIsAddingSubOP(false);
      } else {
        throw new Error(response.data.message || "Operation failed");
      }
    } catch (error) {
      console.error("Submission error:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.join?.("\n") ||
        error.message ||
        "Failed to create sub-operation";

      await Swal.fire({
        title: "Error",
        html: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMachineTypeSelect = (type, setFieldValue) => {
    setFieldValue("machineType", type);
    setSelectedMachineT(type);
    setSearchMachineType(type);
    setShowMachineTypeSuggestions(false);
  };

  const handleMachineNoSelect = (machine, setFieldValue) => {
    // Store ID in form data
    setFieldValue("machineNo", machine.machine_id);
    // Store name in separate form field
    setFieldValue("machineName", machine.machine_name);
    // Update display value
    setDisplayMachineNo(machine.machine_no);
    setSearchMachineNo(machine.machine_no);
    setShowMachineNoSuggestions(false);
  };

  const handleNeedleTypeSelect = (needle, setFieldValue) => {
    // Store ID in form data
    setFieldValue("needleType", needle.needle_type_id);
    // Update display value
    setDisplayNeedleType(needle.needle_type);
    setSearchNeedleType(needle.needle_type);
    setShowNeedleTypeSuggestions(false);
  };

  const handleBobbinThreadSelect = (thread, setFieldValue) => {
    // Store ID in form data
    setFieldValue("bobbinThread", thread.thread_id);
    // Update display value
    setDisplayBobbinThread(thread.thread_category);
    setSearchBobbinThread(thread.thread_category);
    setShowBobbinThreadSuggestions(false);
  };

  const handleNeedleThreadsSelect = (thread, setFieldValue) => {
    // Store ID in form data
    setFieldValue("needleThreads", thread.thread_id);
    // Update display value
    setDisplayNeedleThreads(thread.thread_category);
    setSearchNeedleThreads(thread.thread_category);
    setShowNeedleThreadsSuggestions(false);
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <Formik
        initialValues={{
          mainOperation: mainOp?.operation_name || "",
          subOperationNo: "",
          smv: "",
          subOperationName: "",
          machineType: "",
          machineNo: null,
          machineName: "",
          needleCount: "",
          needleType: null,
          bobbinThread: null,
          needleThreads: null,
          spi: "",
          remark: "",
        }}
        validationSchema={SubOperationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, isSubmitting, errors, touched, setFieldValue }) => {
          return (
            <Form>
              <h1 className="mb-4 underline text-xl italic font-semibold text-blue-900">
                Sub Operation Data
              </h1>

              {/* Sub Operation Section */}
              <section className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div className="grid grid-cols-1 col-span-2">
                  <label htmlFor="mainOperation">Main Operation</label>
                  <Field
                    name="mainOperation"
                    disabled={!!mainOp}
                    className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                      errors.mainOperation && touched.mainOperation
                        ? "border-red-500"
                        : ""
                    }`}
                    placeholder="Main operation"
                  />
                  <ErrorMessage
                    name="mainOperation"
                    component="div"
                    className="text-red-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1">
                  <label htmlFor="subOperationNo">Sub Operation No</label>
                  <Field
                    name="subOperationNo"
                    className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                      errors.subOperationNo && touched.subOperationNo
                        ? "border-red-500"
                        : ""
                    }`}
                    placeholder="Sub operation no"
                  />
                  <ErrorMessage
                    name="subOperationNo"
                    component="div"
                    className="text-red-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1">
                  <label htmlFor="smv">SMV</label>
                  <Field
                    name="smv"
                    type="number"
                    className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                      errors.smv && touched.smv ? "border-red-500" : ""
                    }`}
                    placeholder="SMV value"
                  />
                  <ErrorMessage
                    name="smv"
                    component="div"
                    className="text-red-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 col-span-2">
                  <label htmlFor="subOperationName">Sub Operation Name</label>
                  <Field
                    name="subOperationName"
                    className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                      errors.subOperationName && touched.subOperationName
                        ? "border-red-500"
                        : ""
                    }`}
                    placeholder="Sub operation name"
                  />
                  <ErrorMessage
                    name="subOperationName"
                    component="div"
                    className="text-red-500 text-sm"
                  />
                </div>
              </section>

              {/* Machine Details Section */}
              <section className="mt-8 grid grid-cols-2 gap-x-8 gap-y-3">
                <h1 className="mb-4 underline text-xl col-span-2 italic font-semibold text-blue-900">
                  Machine Details
                </h1>

                {/* Machine Type with Live Search */}
                <div className="grid grid-cols-1 relative" ref={machineTypeRef}>
                  <label htmlFor="machineType">Machine Type</label>
                  <input
                    type="text"
                    value={searchMachineType}
                    onChange={(e) => {
                      setSearchMachineType(e.target.value);
                      setFieldValue("machineType", e.target.value);
                      setShowMachineTypeSuggestions(true);
                    }}
                    onFocus={() => setShowMachineTypeSuggestions(true)}
                    className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                      errors.machineType && touched.machineType
                        ? "border-red-500"
                        : ""
                    }`}
                    placeholder="Search machine type"
                  />
                  <ErrorMessage
                    name="machineType"
                    component="div"
                    className="text-red-500 text-sm"
                  />

                  {showMachineTypeSuggestions &&
                    filteredMachineTypes.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredMachineTypes.map((type, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                            onClick={() =>
                              handleMachineTypeSelect(type, setFieldValue)
                            }
                          >
                            {type}
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* Machine No with Live Search */}
                <div className="grid grid-cols-1 relative" ref={machineNoRef}>
                  <label htmlFor="machineNo">Machine No</label>
                  <input
                    type="text"
                    value={displayMachineNo || searchMachineNo}
                    onChange={(e) => {
                      setDisplayMachineNo(e.target.value);
                      setSearchMachineNo(e.target.value);
                      setShowMachineNoSuggestions(true);
                      // Clear the ID if user types manually
                      setFieldValue("machineNo", null);
                      setFieldValue("machineName", "");
                    }}
                    onFocus={() => setShowMachineNoSuggestions(true)}
                    disabled={!selectedMachineT}
                    className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                      errors.machineNo && touched.machineNo
                        ? "border-red-500"
                        : ""
                    } ${
                      !selectedMachineT ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                    placeholder={
                      selectedMachineT
                        ? "Search machine no"
                        : "Select machine type first"
                    }
                  />
                  <ErrorMessage
                    name="machineNo"
                    component="div"
                    className="text-red-500 text-sm"
                  />

                  {showMachineNoSuggestions &&
                    filteredMachineList.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredMachineList.map((machine) => (
                          <div
                            key={machine.machine_id}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                            onClick={() =>
                              handleMachineNoSelect(machine, setFieldValue)
                            }
                          >
                            <div className="flex justify-between items-center">
                              <span>{machine.machine_no}</span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  machine.machine_status === "Available" ||
                                  machine.machine_status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {machine.machine_status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {machine.machine_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-1">
                  <label htmlFor="machineName">Machine Name</label>
                  <Field
                    name="machineName"
                    readOnly
                    className={`border-2 px-2 py-2 rounded-md shadow-sm bg-gray-100 ${
                      errors.machineName && touched.machineName
                        ? "border-red-500"
                        : ""
                    }`}
                    placeholder="Auto-filled from machine no"
                  />
                  <ErrorMessage
                    name="machineName"
                    component="div"
                    className="text-red-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1">
                  <label htmlFor="needleCount">Needle Size</label>
                  <Field
                    name="needleCount"
                    type="number"
                    step="any"
                    min="1"
                    max="10"
                    className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                      errors.needleCount && touched.needleCount
                        ? "border-red-500"
                        : ""
                    }`}
                    placeholder="Size of the needle"
                  />
                  <ErrorMessage
                    name="needleCount"
                    component="div"
                    className="text-red-500 text-sm"
                  />
                </div>
              </section>

              {/* Needle Configuration Section */}
              <section className="mt-8">
                <h1 className="mb-4 underline text-xl italic font-semibold text-blue-900">
                  Needle & Thread Configuration
                </h1>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {/* Needle Type with Live Search */}
                  <div
                    className="grid grid-rows-1 relative"
                    ref={needleTypeRef}
                  >
                    <label htmlFor="needleType">Needle Type</label>
                    <input
                      type="text"
                      value={displayNeedleType || searchNeedleType}
                      onChange={(e) => {
                        setDisplayNeedleType(e.target.value);
                        setSearchNeedleType(e.target.value);
                        setShowNeedleTypeSuggestions(true);
                        // Clear the ID if user types manually
                        setFieldValue("needleType", null);
                      }}
                      onFocus={() => setShowNeedleTypeSuggestions(true)}
                      className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                        errors.needleType && touched.needleType
                          ? "border-red-500"
                          : ""
                      }`}
                      placeholder="Search needle type (e.g., DO x 558)"
                    />

                    {showNeedleTypeSuggestions &&
                      filteredNeedleTypes.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredNeedleTypes.map((needle) => (
                            <div
                              key={needle.needle_type_id}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                              onClick={() =>
                                handleNeedleTypeSelect(needle, setFieldValue)
                              }
                            >
                              <div className="font-medium">
                                {needle.needle_type}
                              </div>
                              <div className="text-xs text-gray-500">
                                {needle.needle_category}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    {/* Show selected needle type */}
                  </div>

                  {/* Bobbin Thread/Looper with Live Search */}
                  <div
                    className="grid grid-rows-1 relative"
                    ref={bobbinThreadRef}
                  >
                    <label htmlFor="bobbinThread">Bobbin Thread/ Looper</label>
                    <input
                      type="text"
                      value={displayBobbinThread || searchBobbinThread}
                      onChange={(e) => {
                        setDisplayBobbinThread(e.target.value);
                        setSearchBobbinThread(e.target.value);
                        setShowBobbinThreadSuggestions(true);
                        // Clear the ID if user types manually
                        setFieldValue("bobbinThread", null);
                      }}
                      onFocus={() => setShowBobbinThreadSuggestions(true)}
                      className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                        errors.bobbinThread && touched.bobbinThread
                          ? "border-red-500"
                          : ""
                      }`}
                      placeholder="Search bobbin thread (e.g., Firefly FR 50)"
                    />

                    {showBobbinThreadSuggestions &&
                      filteredBobbinThreads.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredBobbinThreads.map((thread) => (
                            <div
                              key={thread.thread_id}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                              onClick={() =>
                                handleBobbinThreadSelect(thread, setFieldValue)
                              }
                            >
                              <div className="font-medium">
                                {thread.thread_category}
                              </div>
                              {thread.description && (
                                <div className="text-xs text-gray-500">
                                  {thread.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Needle Threads with Live Search */}
                  <div
                    className="grid grid-rows-1 relative"
                    ref={needleThreadsRef}
                  >
                    <label htmlFor="needleThreads">Needle Threads</label>
                    <input
                      type="text"
                      value={displayNeedleThreads || searchNeedleThreads}
                      onChange={(e) => {
                        setDisplayNeedleThreads(e.target.value);
                        setSearchNeedleThreads(e.target.value);
                        setShowNeedleThreadsSuggestions(true);
                        // Clear the ID if user types manually
                        setFieldValue("needleThreads", null);
                      }}
                      onFocus={() => setShowNeedleThreadsSuggestions(true)}
                      className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                        errors.needleThreads && touched.needleThreads
                          ? "border-red-500"
                          : ""
                      }`}
                      placeholder="Search needle threads (e.g., Firefly FR 50)"
                    />

                    {showNeedleThreadsSuggestions &&
                      filteredNeedleThreads.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredNeedleThreads.map((thread) => (
                            <div
                              key={thread.thread_id}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                              onClick={() =>
                                handleNeedleThreadsSelect(thread, setFieldValue)
                              }
                            >
                              <div className="font-medium">
                                {thread.thread_category}
                              </div>
                              {thread.description && (
                                <div className="text-xs text-gray-500">
                                  {thread.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  <div className="grid grid-rows-1">
                    <label htmlFor="spi">Stitch Per Inch (SPI)</label>
                    <Field
                      className="border-2 px-2 py-2 rounded-md shadow-sm"
                      placeholder="12.5"
                      name="spi"
                      type="number"
                      step="0.1"
                    />
                  </div>
                </div>
              </section>

              {/* Remark Section */}
              <section className="mt-8">
                <label htmlFor="remark">Remark</label>
                <Field
                  as="textarea"
                  name="remark"
                  className={`border-2 px-2 py-2 rounded-md shadow-sm w-full ${
                    errors.remark && touched.remark ? "border-red-500" : ""
                  }`}
                  rows={2}
                  placeholder="Add a remark"
                />
                <ErrorMessage
                  name="remark"
                  component="div"
                  className="text-red-500 text-sm"
                />
              </section>

              {/* Submit Button */}
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};

export default AddSubOperationOB;
