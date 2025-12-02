// Remove bobbing tread/looper and needle treads being array - there should be only one value for that no multi values

import React, { useState, useEffect, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { FaMinus } from "react-icons/fa";
import { PiPlusBold } from "react-icons/pi";
import { motion } from "framer-motion";
import axios from "axios";
import Swal from "sweetalert2";
import { VscSaveAll } from "react-icons/vsc";
import { IoIosArrowDropdown } from "react-icons/io";
import useMachine from "../hooks/useMachine";
import useStyles from "../hooks/useStyles";
import useMachineTypes from "../hooks/useMachineTypes";
import { useMemo } from "react";
import useThreads from "../hooks/useTreads";
import useNeedles from "../hooks/useNeedles";

const OperationBulleting = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [showForm, setShowForm] = useState(true);
  const [operations, setOperations] = useState([]);
  const [pendingOperations, setPendingOperations] = useState([]);
  const [editingOperation, setEditingOperation] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const { stylesList, isLoading: styleLoading } = useStyles();
  const [isMachineFocused, setIsMachineFocused] = useState(false);
  const {
    isLoading: threadLoading,
    refreshThreads: refreshThreads,
    threadList,
    treadErrors,
  } = useThreads();

  const {
    isLoading: needleLoading,
    needleErrors,
    needleList,
    refreshNeedle,
  } = useNeedles();

  const [threadVal, setThreadVal] = useState("");

  // Persistent values for the main fields that should never reset
  const [persistentValues, setPersistentValues] = useState({
    styleNumber: "",
    mainOperation: "",
    mainOperationName: "",
  });

  const { machineList, isLoading, refresh } = useMachine();
  const [currentOPId, setCurrentOPId] = useState("");

  // State for live search
  const [styleSearchTerm, setStyleSearchTerm] = useState("");
  const [showStyleSuggestions, setShowStyleSuggestions] = useState(false);
  const [filteredStyles, setFilteredStyles] = useState([]);

  useEffect(() => {
    const fetchOperations = async () => {
      try {
        const response = await axios.get(
          `${apiUrl}/api/operationBuleting/getAllOB`,
          {
            withCredentials: true,
          }
        );
        setOperations(response.data);
      } catch (error) {
        console.error("Error fetching operations:", error);
      }
    };
    fetchOperations();
  }, [apiUrl]);

  // Filter styles based on search term
  useEffect(() => {
    if (stylesList && Array.isArray(stylesList)) {
      const filtered = stylesList.filter(
        (style) =>
          style.style_no
            ?.toLowerCase()
            .includes(styleSearchTerm.toLowerCase()) ||
          style.po_number?.toLowerCase().includes(styleSearchTerm.toLowerCase())
      );
      setFilteredStyles(filtered);
    }
  }, [styleSearchTerm, stylesList]);

  const validationSchema = Yup.object()
    .shape({
      styleNumber: Yup.string()
        .required("Style Number is required")
        .max(20, "Style Number must be 20 characters or less"),
      mainOperation: Yup.string().required("Main Operation is required"),
      operationName: Yup.string().required("Operation Name is required"),
      operationNumber: Yup.string().required("Operation Number is required"),
      smv: Yup.string()
        .required("SMV is required")
        .matches(
          /^\d+(\.\d{1,2})?$/,
          "Must be a number with up to 2 decimal places"
        ),
      remarks: Yup.string().max(500, "Remarks must be 500 characters or less"),
    })
    .when("mainOperation", {
      is: "Machine Operator",
      then: Yup.object().shape({
        machineType: Yup.string().required("Machine Type is required"),
        machineNo: Yup.string().required("Machine No is required"),
        machineName: Yup.string().required("Machine Name is required"),
        machineBrand: Yup.string().required("Machine Brand is required"),
        machineLocation: Yup.string().required("Machine Location is required"),
        needleCount: Yup.number()
          .required("Needle count is required")
          .positive("Must be a positive number")
          .integer("Must be a whole number"),
        needleTreads: Yup.number().required("Needle Tread is required"),
        bobbinTreadLoopers: Yup.number().required(
          "Bobbin Tread/Looper is required"
        ),
      }),
    });

  const transformOperationToFormValues = (operation) => {
    if (!operation) return null;
    return {
      styleNumber: operation.styleNumber || "",
      mainOperation: operation.mainOperation || "",
      operationName: operation.operationName || "",
      operationNumber: operation.operationNumber || "",
      smv: operation.smv || "",
      remarks: operation.remarks || "",
      machineType: operation.machineType || "",
      machineNo: operation.machineNo || "",
      machineName: operation.machineName || "",
      machineBrand: operation.machineBrand || "",
      machineLocation: operation.machineLocation || "",
      needleTypeId: operation.needleTypeId || "",
      needleCount: operation.needleCount || 1,
      spi: operation?.spi || 1,
      needleTreads: operation.needleTreads || "", // Changed from array to string
      bobbinTreadLoopers: operation.bobbinTreadLoopers || "", // Changed from array to string
    };
  };

  // Get initial form values that preserve persistent values
  const getInitialFormValues = (editingOp = null) => {
    if (editingOp) {
      return transformOperationToFormValues(editingOp);
    }

    return {
      ...persistentValues,
      currentOPId: currentOPId,
      operationName: "",
      operationNumber: "",
      smv: "",
      remarks: "",
      machineType: "",
      machineNo: "",
      machineName: "",
      machineBrand: "",
      machineLocation: "",
      needleTypeId: "",
      needleCount: 1,
      spi: 1,
      needleTreads: "", // Changed from array to string
      bobbinTreadLoopers: "", // Changed from array to string
    };
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    if (values.mainOperation == 2) {
      console.log(values);
      try {
        const response = await axios.post(
          `${apiUrl}/api/operationBulleting/createHelperOps`,
          values,
          { withCredentials: true }
        );

        if (response.status === 200 || response.status === 201) {
          Swal.fire({
            icon: "success",
            title: "Operation success",
            text: "Helper operation create success",
            confirmButtonText: "Ok",
          });
        }
      } catch (error) {
        console.error(error);
      }

      return;
    }

    const operationData = {
      ...values,
      needleTreads: values.needleTreads || "", // Changed to single value
      bobbinTreadLoopers: values.bobbinTreadLoopers || "", // Changed to single value
    };

    if (editingIndex !== null) {
      // Update existing pending operation
      setPendingOperations((prev) => {
        const updated = [...prev];
        updated[editingIndex] = operationData;
        return updated;
      });
      setEditingIndex(null);
    } else {
      // Add new operation
      setPendingOperations((prev) => [...prev, operationData]);
    }

    // Update persistent values with current main field values
    setPersistentValues({
      styleNumber: values.styleNumber,
      mainOperation: values.mainOperation,
      mainOperationName: values.mainOperationName,
    });

    // Reset form but preserve the main fields
    resetForm({
      values: getInitialFormValues(),
    });

    setEditingOperation(null);
    setSubmitting(false);

    Swal.fire({
      title: editingIndex !== null ? "Updated" : "Added to Pending",
      text:
        editingIndex !== null
          ? "Operation updated in pending list"
          : "Operation added to pending list",
      icon: "success",
    });
  };

  const handleEditPendingOperation = (index) => {
    const operationToEdit = pendingOperations[index];
    setEditingOperation(operationToEdit);
    setEditingIndex(index);
    setShowForm(true);
  };

  // Helper function to format machine operation data for API request
  const formatMachineOperation = (op) => ({
    operationName: op.operationName,
    operationNumber: op.operationNumber,
    smv: op.smv,
    remarks: op.remarks,
    machineType: op.machineType,
    machineNo: op.machineNo,
    spi: op.spi,
    machineName: op.machineName,
    machineBrand: op.machineBrand,
    machineLocation: op.machineLocation,
    // Send needle type ID
    needleTypeId: op.needleTypeId || null,
    needleCount: op.needleCount || 1,
    // Send thread IDs as single values (not arrays)
    needleTreads: op.needleTreads || "", // Changed to single value
    bobbinTreadLoopers: op.bobbinTreadLoopers || "", // Changed to single value
  });

  // Helper function to format helper operation data for API request
  const formatHelperOperation = (op) => ({
    operationName: op.operationName,
    operationNumber: op.operationNumber,
    smv: op.smv,
    remarks: op.remarks,
  });

  const handleBulkSave = async () => {
    if (pendingOperations.length === 0) {
      Swal.fire({
        title: "No Pending Operations",
        text: "Please add operations before saving",
        icon: "warning",
      });
      return;
    }

    try {
      console.log("Pending operations to save:", pendingOperations);

      const { styleNumber, mainOperation, mainOperationName } =
        pendingOperations[0];

      // Separate operations by type with proper validation
      const machineOperations = pendingOperations
        .filter((op) => op.mainOperation === "1")
        .map((op) => ({
          ...formatMachineOperation(op),
          styleNumber,
          mainOperation,
          mainOperationName,
        }));

      const helperOperations = pendingOperations
        .filter((op) => op.mainOperation === "2")
        .map((op) => ({
          ...formatHelperOperation(op),
          styleNumber,
          mainOperation,
          mainOperationName,
        }));

      console.log("Machine operations payload:", machineOperations);

      let mainOPId = localStorage.getItem("currentItem") || null;
      let hasSaved = false;

      // Send machine operations if any exist
      if (machineOperations.length > 0) {
        console.log("Attempting to save machine operations...");
        const machinePayload = {
          styleNumber,
          mainOperation,
          mainOperationName: mainOperationName || "empty",
          currentOPId: mainOPId,
          operations: machineOperations,
        };

        const machineResponse = await axios.post(
          `${apiUrl}/api/operationBulleting/createOB`,
          machinePayload,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Machine operations response:", machineResponse.data);

        if (machineResponse.data?.mainOPId) {
          mainOPId = machineResponse.data.mainOPId;
          hasSaved = true;
          console.log("Saved machine operations with ID:", mainOPId);
        }
      }

      // Send helper operations if any exist
      if (helperOperations.length > 0) {
        console.log("Attempting to save helper operations...");
        const helperPayload = {
          styleNumber,
          mainOperation,
          mainOperationName,
          currentOPId: mainOPId,
          operations: helperOperations,
        };

        const helperResponse = await axios.post(
          `${apiUrl}/api/operationBulleting/createHelperOps`,
          helperPayload,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Helper operations response:", helperResponse.data);

        if (helperResponse.data?.mainOPId) {
          mainOPId = helperResponse.data.mainOPId;
          hasSaved = true;
          console.log("Saved helper operations with ID:", mainOPId);
        }
      }

      if (!hasSaved) {
        throw new Error(
          "No operations were saved - backend didn't respond with IDs"
        );
      }

      // Only update state if we successfully saved
      if (mainOPId) {
        localStorage.setItem("currentItem", mainOPId);
        setCurrentOPId(mainOPId);
        setPendingOperations([]);
      }

      Swal.fire({
        title: "Success",
        text: `Saved ${pendingOperations.length} operations (${machineOperations.length} machine, ${helperOperations.length} helper)`,
        icon: "success",
      });
    } catch (error) {
      console.error("Bulk save failed:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        stack: error.stack,
      });

      let errorMessage = "Failed to save operations";
      if (error.response) {
        errorMessage =
          error.response.data?.message ||
          JSON.stringify(error.response.data) ||
          `Server responded with ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "No response received from server";
      } else {
        errorMessage = error.message || "Unknown error occurred";
      }

      Swal.fire({
        title: "Error",
        html: `
        <div>${errorMessage}</div>
        <small class="text-gray-500">Check console for details</small>
      `,
        icon: "error",
      });
    }
  };

  const handleDeletePendingOperation = (index) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        setPendingOperations((prev) => prev.filter((_, i) => i !== index));
        Swal.fire("Deleted!", "Operation has been removed.", "success");
      }
    });
  };

  const formVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: 20 },
  };

  const rowVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
  };

  // Update persistent values when main fields change in the form
  const handleMainFieldChange = (fieldName, value) => {
    setPersistentValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  // Handle style selection from suggestions
  const handleStyleSelect = (style, setFieldValue) => {
    setFieldValue("styleNumber", style.style_no);
    setStyleSearchTerm(style.style_no);
    setShowStyleSuggestions(false);
    handleMainFieldChange("styleNumber", style.style_no);
  };

  return (
    <div className="px-4">
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-center">
        <div className="md:col-span-8 w-2/4">
          {/* Search input removed for brevity */}
        </div>
      </section>

      {showForm && (
        <Formik
          initialValues={getInitialFormValues(editingOperation)}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          validateOnBlur={true}
          validateOnChange={false}
          enableReinitialize={true}
        >
          {({
            values,
            isSubmitting,
            setFieldValue,
            errors,
            touched,
            handleBlur,
            handleChange,
          }) => (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={formVariants}
            >
              <Form>
                <section className="mt-4">
                  <div className="px-4 py-6 border bg-white rounded-md space-y-4">
                    <div>
                      <label className="block mb-1">Main Operation *</label>
                      <Field
                        as="select"
                        name="mainOperation"
                        className={`form-input-base ${
                          errors.mainOperation && touched.mainOperation
                            ? "border-red-500"
                            : ""
                        }`}
                        onBlur={(e) => {
                          handleBlur(e);
                          handleMainFieldChange(
                            "mainOperation",
                            e.target.value
                          );
                        }}
                        onChange={(e) => {
                          handleChange(e);
                          handleMainFieldChange(
                            "mainOperation",
                            e.target.value
                          );
                        }}
                      >
                        <option value="">Select Operation</option>
                        <option value="1">Machine Operator</option>
                        <option value="2">Helper</option>
                      </Field>
                      <ErrorMessage
                        name="mainOperation"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {values.mainOperation == 1 ? (
                      <div>
                        <label className="block mb-1">
                          Main Operation Name *
                        </label>
                        <Field
                          name="mainOperationName"
                          type="text"
                          className={`form-input-base ${
                            errors.mainOperationName &&
                            touched.mainOperationName
                              ? "border-red-500"
                              : ""
                          }`}
                          onBlur={(e) => {
                            handleBlur(e);
                            handleMainFieldChange(
                              "mainOperationName",
                              e.target.value
                            );
                          }}
                          onChange={(e) => {
                            handleChange(e);
                            handleMainFieldChange(
                              "mainOperationName",
                              e.target.value
                            );
                          }}
                        />
                        <ErrorMessage
                          name="mainOperationName"
                          component="div"
                          className="text-red-500 text-sm mt-1"
                        />
                      </div>
                    ) : (
                      ""
                    )}

                    <div className="relative">
                      <label className="block mb-1">Style Number *</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="styleNumber"
                          value={styleSearchTerm}
                          className={`form-input-base w-full ${
                            errors.styleNumber && touched.styleNumber
                              ? "border-red-500"
                              : ""
                          }`}
                          placeholder="Type to search styles..."
                          onChange={(e) => {
                            setStyleSearchTerm(e.target.value);
                            setFieldValue("styleNumber", e.target.value);
                            setShowStyleSuggestions(true);
                          }}
                          onFocus={() => setShowStyleSuggestions(true)}
                          onBlur={() => {
                            setTimeout(
                              () => setShowStyleSuggestions(false),
                              200
                            );
                            handleBlur({
                              target: {
                                name: "styleNumber",
                                value: styleSearchTerm,
                              },
                            });
                            handleMainFieldChange(
                              "styleNumber",
                              styleSearchTerm
                            );
                          }}
                        />

                        {showStyleSuggestions && filteredStyles.length > 0 && (
                          <div className="absolute z-50 left-0 mt-1 w-full bg-white shadow-lg border border-gray-300 rounded-md max-h-60 overflow-y-auto">
                            {filteredStyles.map((style, index) => (
                              <div
                                key={index}
                                className="px-3 py-2 hover:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onMouseDown={() =>
                                  handleStyleSelect(style, setFieldValue)
                                }
                              >
                                <div className="font-medium">
                                  {style.style_no}
                                </div>
                                <div className="text-sm text-gray-600">
                                  PO: {style.po_number}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <ErrorMessage
                        name="styleNumber"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {values.mainOperation === "1" ? (
                      <FullForm
                        values={values}
                        setFieldValue={setFieldValue}
                        errors={errors}
                        touched={touched}
                        handleBlur={handleBlur}
                        styleSearchTerm={styleSearchTerm}
                        setStyleSearchTerm={setStyleSearchTerm}
                        threadList={threadList}
                        needleList={needleList}
                      />
                    ) : values.mainOperation === "2" ? (
                      <HelperForm
                        values={values}
                        errors={errors}
                        touched={touched}
                        handleBlur={handleBlur}
                      />
                    ) : null}

                    <div className="flex justify-end space-x-4 pt-4">
                      <motion.button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setEditingOperation(null);
                          setEditingIndex(null);
                        }}
                        className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isSubmitting
                          ? "Saving..."
                          : editingIndex !== null
                          ? "Update"
                          : "Add"}
                      </motion.button>
                    </div>
                  </div>
                </section>
              </Form>
            </motion.div>
          )}
        </Formik>
      )}

      {pendingOperations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 flex justify-between items-center">
            Pending Operations
            <motion.button
              onClick={handleBulkSave}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>
                <VscSaveAll className="mr-2 text-xl" />
              </span>
              Save All
            </motion.button>
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border">#</th>
                  <th className="py-2 px-4 border">Operation</th>
                  <th className="py-2 px-4 border">Machine</th>
                  <th className="py-2 px-4 border">SMV</th>
                  <th className="py-2 px-4 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingOperations.map((op, index) => (
                  <motion.tr
                    key={`pending-${index}`}
                    className="hover:bg-gray-50"
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <td className="py-2 px-4 border">{index + 1}</td>
                    <td className="py-2 px-4 border">{op.operationName}</td>
                    <td className="py-2 px-4 border">
                      {op.machineName} ({op.machineNo})
                    </td>
                    <td className="py-2 px-4 border">{op.smv}</td>
                    <td className="py-2 px-4 border flex justify-center space-x-2">
                      <motion.button
                        className="text-blue-500 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded border border-blue-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEditPendingOperation(index)}
                      >
                        Edit
                      </motion.button>
                      <motion.button
                        className="text-red-500 bg-red-100 hover:bg-red-200 px-2 py-1 rounded border border-red-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeletePendingOperation(index)}
                      >
                        Remove
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Full Form Component
const FullForm = ({
  values,
  setFieldValue,
  errors,
  touched,
  handleBlur,
  styleSearchTerm,
  setStyleSearchTerm,
  threadList,
  needleList,
}) => {
  const { machineList } = useMachine();
  const { machineTList } = useMachineTypes();
  const [isMachineFocused, setIsMachineFocused] = useState(false);
  const [isMachineTypeFocused, setIsMachineTypeFocused] = useState(false);
  const [machineTypeSearchTerm, setMachineTypeSearchTerm] = useState("");
  const [filteredMachineTypes, setFilteredMachineTypes] = useState([]);
  const [selectedMachineT, setSelectedMachineT] = useState(null);

  // States for live search inputs - now single values not arrays
  const [needleThreadSearch, setNeedleThreadSearch] = useState("");
  const [bobbinThreadSearch, setBobbinThreadSearch] = useState("");
  const [showNeedleSuggestions, setShowNeedleSuggestions] = useState(false);
  const [showBobbinSuggestions, setShowBobbinSuggestions] = useState(false);

  // States for needle type search
  const [needleTypeSearch, setNeedleTypeSearch] = useState("");
  const [showNeedleTypeSuggestions, setShowNeedleTypeSuggestions] =
    useState(false);

  // Filter machine types based on search term
  useEffect(() => {
    if (machineTList && Array.isArray(machineTList)) {
      const filtered = machineTList.filter((type) =>
        type.toLowerCase().includes(machineTypeSearchTerm.toLowerCase())
      );
      setFilteredMachineTypes(filtered);
    }
  }, [machineTypeSearchTerm, machineTList]);

  // to filter machine list according to selected machine type
  const filteredMachineList = useMemo(() => {
    if (selectedMachineT === null || selectedMachineT === "") {
      return [];
    }
    return machineList.filter((mch) => mch.machine_type === selectedMachineT);
  }, [selectedMachineT, machineList]);

  // Safe thread filtering functions
  const getFilteredNeedleThreads = (searchTerm) => {
    if (!threadList || !Array.isArray(threadList)) return [];

    const searchText = searchTerm || "";
    return threadList.filter((thread) => {
      const threadText = thread.thread_category || "";
      return threadText.toLowerCase().includes(searchText.toLowerCase());
    });
  };

  const getFilteredBobbinThreads = (searchTerm) => {
    if (!threadList || !Array.isArray(threadList)) return [];

    const searchText = searchTerm || "";
    return threadList.filter((thread) => {
      const threadText = thread.thread_category || "";
      return threadText.toLowerCase().includes(searchText.toLowerCase());
    });
  };

  // Safe needle type filtering function
  const getFilteredNeedleTypes = (searchTerm) => {
    if (!needleList || !Array.isArray(needleList)) return [];

    const searchText = searchTerm || "";
    return needleList.filter((needle) => {
      const needleText = needle.needle_type || "";
      return needleText.toLowerCase().includes(searchText.toLowerCase());
    });
  };

  // Handle machine selection and autofill
  const handleMachineSelect = (machineNo, machineStatus) => {
    const currentMachine = machineList.filter(
      (mch) => mch.machine_no === machineNo
    );
    if (currentMachine) {
      if (currentMachine[0].machine_status === "inactive") {
        Swal.fire({
          text: "You can't use this machine because it's broken or inactive",
          icon: "warning",
        });
        return;
      }
    }

    const selectedMachine = machineList?.find(
      (m) => m.machine_no === machineNo
    );
    if (selectedMachine) {
      setFieldValue("machineNo", selectedMachine.machine_no);
      setFieldValue("machineType", selectedMachine.machine_type);
      setFieldValue("machineName", selectedMachine.machine_name);
      setFieldValue("machineBrand", selectedMachine.machine_brand);
      setFieldValue("machineLocation", selectedMachine.machine_location);
    }
  };

  // Handle machine type selection
  const handleMachineTypeSelect = (machineType) => {
    setFieldValue("machineType", machineType);
    setMachineTypeSearchTerm(machineType);
    setSelectedMachineT(machineType);
    setIsMachineTypeFocused(false);
  };

  // Handle needle thread search and selection
  const handleNeedleThreadSelect = (thread) => {
    setFieldValue("needleTreads", thread.thread_id);
    setNeedleThreadSearch(thread.thread_category);
    setShowNeedleSuggestions(false);
  };

  // Handle bobbin thread search and selection
  const handleBobbinThreadSelect = (thread) => {
    setFieldValue("bobbinTreadLoopers", thread.thread_id);
    setBobbinThreadSearch(thread.thread_category);
    setShowBobbinSuggestions(false);
  };

  // Handle needle type search and selection
  const handleNeedleTypeSearch = (value) => {
    setNeedleTypeSearch(value);
    setShowNeedleTypeSuggestions(true);
  };

  const handleNeedleTypeSelect = (needle) => {
    setFieldValue("needleTypeId", needle.needle_type_id);
    setNeedleTypeSearch(needle.needle_type);
    setShowNeedleTypeSuggestions(false);
  };

  // Helper function to get display text for selected values
  const getDisplayText = (id, list, displayField) => {
    if (!id || !list || !Array.isArray(list)) return "";
    const item = list.find((item) => {
      if (typeof item === "object") {
        return item.thread_id === id || item.needle_type_id === id;
      }
      return false;
    });
    return item ? item[displayField] : "";
  };

  // Get current needle thread display text
  const getCurrentNeedleThreadDisplay = () => {
    if (!values.needleTreads || !threadList || !Array.isArray(threadList))
      return needleThreadSearch || "";
    const thread = threadList.find((t) => t.thread_id === values.needleTreads);
    return thread ? thread.thread_category : needleThreadSearch;
  };

  // Get current bobbin thread display text
  const getCurrentBobbinThreadDisplay = () => {
    if (!values.bobbinTreadLoopers || !threadList || !Array.isArray(threadList))
      return bobbinThreadSearch || "";
    const thread = threadList.find(
      (t) => t.thread_id === values.bobbinTreadLoopers
    );
    return thread ? thread.thread_category : bobbinThreadSearch;
  };

  // Get current needle type display text
  const getCurrentNeedleTypeDisplay = () => {
    if (!values.needleTypeId || !needleList || !Array.isArray(needleList))
      return needleTypeSearch;
    const needle = needleList.find(
      (n) => n.needle_type_id === values.needleTypeId
    );
    return needle ? needle.needle_type : needleTypeSearch;
  };

  // machine type ref
  const machineTr = useRef();

  return (
    <div className="">
      <div className="">
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <fieldset className="border rounded-md shadow-md p-4 grid md:grid-cols-4 md:gap-x-8">
            <legend className="italic font-bold text-blue-950">
              Sub Operation
            </legend>
            <div className="mt-4">
              <label htmlFor="">Operation Number *</label>
              <Field
                name="operationNumber"
                type="text"
                className={`form-input-base ${
                  errors.operationNumber && touched.operationNumber
                    ? "border-red-500"
                    : ""
                }`}
                placeholder="Operation number"
                onBlur={handleBlur}
              />
              <ErrorMessage
                name="operationNumber"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>
            <div className="mt-4">
              <label htmlFor="">Operation Name *</label>
              <Field
                name="operationName"
                type="text"
                className={`form-input-base ${
                  errors.operationName && touched.operationName
                    ? "border-red-500"
                    : ""
                }`}
                placeholder="Operation name"
                onBlur={handleBlur}
              />
              <ErrorMessage
                name="operationName"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="">M/C SMV *</label>
              <Field
                name="smv"
                type="text"
                className={`form-input-base ${
                  errors.smv && touched.smv ? "border-red-500" : ""
                }`}
                onBlur={handleBlur}
              />
              <ErrorMessage
                name="smv"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="">Remarks</label>
              <Field
                name="remarks"
                type="text"
                className={`form-input-base ${
                  errors.remarks && touched.remarks ? "border-red-500" : ""
                }`}
                onBlur={handleBlur}
              />
              <ErrorMessage
                name="remarks"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>
          </fieldset>
        </motion.section>

        <motion.section
          className="mt-4 md:mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <fieldset className="border rounded-lg md:rounded-md shadow-sm md:shadow-md p-3 md:p-4 lg:p-6 grid grid-cols-1 gap-4 md:gap-6 lg:gap-8">
            <legend className="italic font-bold text-blue-950 text-sm md:text-base px-2 md:px-3">
              Machine Details
            </legend>

            {/* Machine Type */}
            <div className="space-y-2 md:space-y-3">
              <label
                htmlFor="machineType"
                className="block text-sm md:text-base font-medium text-gray-700"
              >
                Machine Type *
              </label>
              <div className="relative w-full">
                <input
                  name="machineType"
                  type="text"
                  value={machineTypeSearchTerm}
                  ref={machineTr}
                  onFocus={() => setIsMachineTypeFocused(true)}
                  onBlur={() =>
                    setTimeout(() => setIsMachineTypeFocused(false), 200)
                  }
                  onChange={(e) => {
                    setMachineTypeSearchTerm(e.target.value);
                    setFieldValue("machineType", e.target.value);
                    setSelectedMachineT(e.target.value);
                  }}
                  className={`w-full text-sm md:text-base border rounded-md px-3 py-2 appearance-none focus:outline-none focus:ring-2
                    ${
                      errors.machineType && touched.machineType
                        ? "border-red-500 focus:ring-red-300"
                        : "border-gray-300 focus:ring-blue-300"
                    }
                  `}
                  placeholder="Type to search machine types..."
                />

                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ▼
                </div>

                {isMachineTypeFocused && filteredMachineTypes.length > 0 && (
                  <div className="absolute z-50 left-0 mt-1 w-full bg-white shadow-lg border border-gray-300 rounded-md max-h-40 overflow-y-auto">
                    {filteredMachineTypes.map((type, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                        onMouseDown={() => handleMachineTypeSelect(type)}
                      >
                        {type}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <ErrorMessage
                name="machineType"
                component="div"
                className="text-red-500 text-xs md:text-sm mt-1"
              />
            </div>

            {/* Machine No */}
            <div className="space-y-2 md:space-y-3">
              <label
                htmlFor="machineNo"
                className="block text-sm md:text-base font-medium text-gray-700"
              >
                Machine No *
              </label>
              <Field
                name="machineNo"
                as="select"
                className={`form-input-base w-full text-sm md:text-base ${
                  errors.machineNo && touched.machineNo
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                onChange={(e) => handleMachineSelect(e.target.value)}
                onBlur={handleBlur}
              >
                <option value="">Select Machine</option>
                {filteredMachineList?.map((mch) => (
                  <option
                    className={`text-sm ${
                      mch.machine_status == "active" ||
                      mch.machine_status === "Available"
                        ? "text-green-600 font-semibold bg-green-50"
                        : "text-red-600 font-semibold bg-red-50"
                    }`}
                    key={mch.machine_id}
                    value={mch.machine_no}
                  >
                    {mch.machine_status === "active" ||
                    mch.machine_status === "Available"
                      ? "✅"
                      : "❌"}{" "}
                    {mch.machine_no}
                  </option>
                ))}
              </Field>
              <ErrorMessage
                name="machineNo"
                component="div"
                className="text-red-500 text-xs md:text-sm mt-1"
              />
            </div>

            {/* Machine Name */}
            <div className="space-y-2 md:space-y-3">
              <label
                htmlFor="machineName"
                className="block text-sm md:text-base font-medium text-gray-700"
              >
                Machine Name *
              </label>
              <Field
                name="machineName"
                type="text"
                className={`form-input-base w-full text-sm md:text-base ${
                  errors.machineName && touched.machineName
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                onBlur={handleBlur}
                readOnly
              />
              <ErrorMessage
                name="machineName"
                component="div"
                className="text-red-500 text-xs md:text-sm mt-1"
              />
            </div>

            {/* Brand */}
            <div className="space-y-2 md:space-y-3">
              <label
                htmlFor="machineBrand"
                className="block text-sm md:text-base font-medium text-gray-700"
              >
                Brand *
              </label>
              <Field
                name="machineBrand"
                type="text"
                className={`form-input-base w-full text-sm md:text-base ${
                  errors.machineBrand && touched.machineBrand
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                onBlur={handleBlur}
                readOnly
              />
              <ErrorMessage
                name="machineBrand"
                component="div"
                className="text-red-500 text-xs md:text-sm mt-1"
              />
            </div>

            {/* Machine Location */}
            <div className="space-y-2 md:space-y-3 col-span-1">
              <label
                htmlFor="machineLocation"
                className="block text-sm md:text-base font-medium text-gray-700"
              >
                Machine Location *
              </label>
              <Field
                name="machineLocation"
                type="text"
                className={`form-input-base w-full text-sm md:text-base ${
                  errors.machineLocation && touched.machineLocation
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                onBlur={handleBlur}
                readOnly
              />
              <ErrorMessage
                name="machineLocation"
                component="div"
                className="text-red-500 text-xs md:text-sm mt-1"
              />
            </div>
          </fieldset>
        </motion.section>

        <motion.section
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <fieldset className="border rounded-md shadow-md p-4">
            <legend className="italic font-bold text-blue-950">
              Needle Configuration
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-8">
              {/* First Column */}
              <div className="space-y-4">
                {/* Needle Count */}
                <div className="mt-4">
                  <label htmlFor="">Needle Size *</label>
                  <div className="">
                    <Field
                      name="needleCount"
                      type="number"
                      step="any"
                      min="1"
                      className={`form-input-base ${
                        errors.needleCount && touched.needleCount
                          ? "border-red-500"
                          : ""
                      }`}
                      onBlur={handleBlur}
                    />

                    <ErrorMessage
                      name="needleCount"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                </div>

                {/* Needle Type */}
                <div className="mt-4">
                  <label className="block mb-2 font-medium">Needle Type</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={getCurrentNeedleTypeDisplay()}
                      onChange={(e) => handleNeedleTypeSearch(e.target.value)}
                      onFocus={() => setShowNeedleTypeSuggestions(true)}
                      onBlur={() =>
                        setTimeout(
                          () => setShowNeedleTypeSuggestions(false),
                          200
                        )
                      }
                      className={`form-input-base w-full ${
                        errors.needleTypeId && touched.needleTypeId
                          ? "border-red-500"
                          : ""
                      }`}
                      placeholder="Search needle types..."
                    />

                    {/* Needle Type Suggestions */}
                    {showNeedleTypeSuggestions && needleList.length > 0 && (
                      <div className="absolute z-50 left-0 mt-1 w-full bg-white shadow-lg border border-gray-300 rounded-md max-h-40 overflow-y-auto">
                        {(needleTypeSearch
                          ? getFilteredNeedleTypes(needleTypeSearch)
                          : needleList
                        ).map((needle, needleIndex) => (
                          <div
                            key={needleIndex}
                            className="px-3 py-2 hover:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onMouseDown={() => handleNeedleTypeSelect(needle)}
                          >
                            {needle.needle_type}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <ErrorMessage
                    name="needleTypeId"
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>

                {/* Needle Treads - Now single input, not array */}
                <div className="mt-2">
                  <label className="block mb-2 font-medium">
                    Needle Treads *
                  </label>
                  <div className="space-y-3">
                    <motion.div
                      className="relative"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="relative">
                        <input
                          name="needleTreads"
                          type="text"
                          value={getCurrentNeedleThreadDisplay()}
                          onChange={(e) => {
                            setNeedleThreadSearch(e.target.value);
                          }}
                          onFocus={() => setShowNeedleSuggestions(true)}
                          onBlur={() =>
                            setTimeout(
                              () => setShowNeedleSuggestions(false),
                              200
                            )
                          }
                          className={`form-input-base w-full ${
                            errors.needleTreads && touched.needleTreads
                              ? "border-red-500"
                              : ""
                          }`}
                          placeholder="Select needle thread"
                        />

                        {/* Needle Thread Suggestions */}
                        {showNeedleSuggestions && threadList.length > 0 && (
                          <div className="absolute z-50 left-0 mt-1 w-full bg-white shadow-lg border border-gray-300 rounded-md max-h-40 overflow-y-auto">
                            {(needleThreadSearch
                              ? getFilteredNeedleThreads(needleThreadSearch)
                              : threadList
                            ).map((thread, threadIndex) => (
                              <div
                                key={threadIndex}
                                className="px-3 py-2 hover:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onMouseDown={() =>
                                  handleNeedleThreadSelect(thread)
                                }
                              >
                                {thread.thread_category}
                              </div>
                            ))}
                          </div>
                        )}

                        {errors.needleTreads && touched.needleTreads && (
                          <div className="text-red-500 text-xs mt-1">
                            {errors.needleTreads}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Second Column */}
              <div className="space-y-4">
                {/* SPI */}
                <div className="mt-4">
                  <label htmlFor="">Stitch Per Inch (SPI) *</label>
                  <div className="">
                    <Field
                      name="spi"
                      type="number"
                      min="1"
                      className={`form-input-base ${
                        errors.needleCount && touched.needleCount
                          ? "border-red-500"
                          : ""
                      }`}
                    />
                    <ErrorMessage
                      name="spi"
                      component="div"
                      className="text-red-500 text-sm mt-1"
                    />
                  </div>
                </div>

                {/* Bobbin Tread/Looper - Now single input, not array */}
                <div className="mt-6">
                  <label className="block mb-2 font-medium">
                    Bobbin Tread/Looper *
                  </label>
                  <div className="space-y-3">
                    <motion.div
                      className="relative"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="relative">
                        <input
                          name="bobbinTreadLoopers"
                          type="text"
                          value={getCurrentBobbinThreadDisplay()}
                          onChange={(e) => {
                            setBobbinThreadSearch(e.target.value);
                          }}
                          onFocus={() => setShowBobbinSuggestions(true)}
                          onBlur={() =>
                            setTimeout(
                              () => setShowBobbinSuggestions(false),
                              200
                            )
                          }
                          className={`form-input-base w-full ${
                            errors.bobbinTreadLoopers &&
                            touched.bobbinTreadLoopers
                              ? "border-red-500"
                              : ""
                          }`}
                          placeholder="Select bobbin thread"
                        />

                        {/* Bobbin Thread Suggestions */}
                        {showBobbinSuggestions && threadList.length > 0 && (
                          <div className="absolute z-50 left-0 mt-1 w-full bg-white shadow-lg border border-gray-300 rounded-md max-h-40 overflow-y-auto">
                            {(bobbinThreadSearch
                              ? getFilteredBobbinThreads(bobbinThreadSearch)
                              : threadList
                            ).map((thread, threadIndex) => (
                              <div
                                key={threadIndex}
                                className="px-3 py-2 hover:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onMouseDown={() =>
                                  handleBobbinThreadSelect(thread)
                                }
                              >
                                {thread.thread_category}
                              </div>
                            ))}
                          </div>
                        )}

                        {errors.bobbinTreadLoopers &&
                          touched.bobbinTreadLoopers && (
                            <div className="text-red-500 text-xs mt-1">
                              {errors.bobbinTreadLoopers}
                            </div>
                          )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>
        </motion.section>
      </div>
    </div>
  );
};

const HelperForm = ({ values, errors, touched, handleBlur, setFieldValue }) => {
  return (
    <motion.div
      className="space-y-4 mt-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <div>
        <label className="block mb-1">Operation Number *</label>
        <Field
          name="operationNumber"
          type="text"
          className={`form-input-base ${
            errors.operationNumber && touched.operationNumber
              ? "border-red-500"
              : ""
          }`}
          placeholder="Operation Number"
          onBlur={handleBlur}
        />
        <ErrorMessage
          name="operationNumber"
          component="div"
          className="text-red-500 text-sm mt-1"
        />
      </div>
      <div>
        <label className="block mb-1">Operation Name *</label>
        <Field
          name="operationName"
          type="text"
          className={`form-input-base ${
            errors.operationName && touched.operationName
              ? "border-red-500"
              : ""
          }`}
          placeholder="Operation Name"
          onBlur={handleBlur}
        />
        <ErrorMessage
          name="operationName"
          component="div"
          className="text-red-500 text-sm mt-1"
        />
      </div>
      <div>
        <label className="block mb-1">SMV *</label>
        <Field
          name="smv"
          type="text"
          className={`form-input-base ${
            errors.smv && touched.smv ? "border-red-500" : ""
          }`}
          placeholder="SMV"
          onBlur={handleBlur}
        />
        <ErrorMessage
          name="smv"
          component="div"
          className="text-red-500 text-sm mt-1"
        />
      </div>
      <div>
        <label className="block mb-1">Remarks</label>
        <Field
          name="remarks"
          as="textarea"
          className={`form-input-base ${
            errors.remarks && touched.remarks ? "border-red-500" : ""
          }`}
          rows={3}
          onBlur={handleBlur}
        />
        <ErrorMessage
          name="remarks"
          component="div"
          className="text-red-500 text-sm mt-1"
        />
      </div>
      <Field type="hidden" name="machineType" value="HLP" />
      <Field type="hidden" name="machineNo" value="" />
      <Field type="hidden" name="machineName" value="" />
      <Field type="hidden" name="machineBrand" value="" />
      <Field type="hidden" name="machineLocation" value="" />
      <Field type="hidden" name="needleTypeId" value="" />
      <Field type="hidden" name="needleCount" value={1} />
      <Field type="hidden" name="needleTreads" value="" />{" "}
      {/* Changed from array to empty string */}
      <Field type="hidden" name="bobbinTreadLoopers" value="" />{" "}
      {/* Changed from array to empty string */}
    </motion.div>
  );
};

export default OperationBulleting;
