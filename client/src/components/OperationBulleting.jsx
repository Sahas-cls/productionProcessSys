import React, { useState, useEffect } from "react";
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

const OperationBulleting = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [showForm, setShowForm] = useState(true);
  const [operations, setOperations] = useState([]);
  const [pendingOperations, setPendingOperations] = useState([]);
  const [editingOperation, setEditingOperation] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const { stylesList, isLoading: styleLoading } = useStyles();
  console.log("style list --- ", stylesList);
  const [persistentValues, setPersistentValues] = useState({
    styleNumber: "",
    mainOperation: "",
  });
  const { machineList, isLoading, refresh } = useMachine();
  console.log(machineList);
  const [currentOPId, setCurrentOPId] = useState("");

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
        needleType: Yup.array()
          .of(
            Yup.object().shape({
              type: Yup.string().required("Needle Type is required"),
            })
          )
          .min(1, "At least one Needle Type is required"),
        needleCount: Yup.number()
          .required("Needle count is required")
          .positive("Must be a positive number")
          .integer("Must be a whole number"),
        needleTreads: Yup.array()
          .of(Yup.string().required("Needle Tread is required"))
          .min(1, "At least one Needle Tread is required"),
        bobbinTreadLoopers: Yup.array()
          .of(Yup.string().required("Bobbin Tread/Looper is required"))
          .min(1, "At least one Bobbin Tread/Looper is required"),
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
      machineType: operation.machineType || "HLP",
      machineNo: operation.machineNo || "",
      machineName: operation.machineName || "",
      machineBrand: operation.machineBrand || "",
      machineLocation: operation.machineLocation || "",
      needleType: operation.needleType || [{ type: "" }],
      needleCount: operation.needleCount || 1,
      needleTreads: operation.needleTreads || [""],
      bobbinTreadLoopers: operation.bobbinTreadLoopers || [""],
    };
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    // Filter out empty values for arrays
    alert(values.mainOperation);
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
      needleTreads: values.needleTreads?.filter((tread) => tread !== "") || [],
      bobbinTreadLoopers:
        values.bobbinTreadLoopers?.filter((tread) => tread !== "") || [],
      needleType:
        values.needleType?.filter((needle) => needle?.type !== "") || [],
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

    setPersistentValues({
      styleNumber: values.styleNumber,
      mainOperation: values.mainOperation,
      mainOperationName: values.mainOperationName,
    });

    resetForm({
      values: {
        ...persistentValues,
        operationName: "",
        operationNumber: "",
        smv: "",
        remarks: "",
        machineType: "HLP",
        machineNo: "",
        machineName: "",
        machineBrand: "",
        machineLocation: "",
        needleType: [{ type: "" }],
        needleCount: 1,
        needleTreads: [""],
        bobbinTreadLoopers: [""],
      },
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
    machineName: op.machineName,
    machineBrand: op.machineBrand,
    machineLocation: op.machineLocation,
    needleType: Array.isArray(op.needleType)
      ? op.needleType.filter((nt) => nt && nt.type)
      : [],
    needleCount: op.needleCount || 1,
    needleTreads: Array.isArray(op.needleTreads)
      ? op.needleTreads.filter((t) => t)
      : [],
    bobbinTreadLoopers: Array.isArray(op.bobbinTreadLoopers)
      ? op.bobbinTreadLoopers.filter((b) => b)
      : [],
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
      // Debug: Show what we're about to send
      console.log("Pending operations to save:", pendingOperations);

      const { styleNumber, mainOperation, mainOperationName } =
        pendingOperations[0];

      // Separate operations by type with proper validation
      const machineOperations = pendingOperations
        .filter((op) => op.mainOperation === "1") // Machine Operator
        .map((op) => ({
          ...formatMachineOperation(op),
          styleNumber, // Ensure styleNumber is included
          mainOperation,
          mainOperationName,
        }));

      const helperOperations = pendingOperations
        .filter((op) => op.mainOperation === "2") // Helper
        .map((op) => ({
          ...formatHelperOperation(op),
          styleNumber, // Ensure styleNumber is included
          mainOperation,
          mainOperationName,
        }));

      console.log("Machine operations payload:", machineOperations);
      console.log("Helper operations payload:", helperOperations);

      let mainOPId = localStorage.getItem("currentItem") || null;
      let hasSaved = false;

      // Send machine operations if any exist
      if (machineOperations.length > 0) {
        console.log("Attempting to save machine operations...");
        const machinePayload = {
          styleNumber,
          mainOperation,
          mainOperationName,
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

  return (
    <div className="px-4 py-4">
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-center">
        <div className="md:col-span-8 w-2/4">
          {/* <input
            type="text"
            className="w-2/4 form-input-base py-3 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            placeholder="Search operations..."
          /> */}
        </div>

        <div className="md:col-span-4 grid grid-cols-2 gap-3 md:gap-4 w-full">
          {/* <button
            type="button"
            className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors"
          >
            Download
          </button> */}
          <div className=""></div>
          <button
            type="button"
            onClick={() => {
              setEditingOperation(null);
              setEditingIndex(null);
              setShowForm(true);
            }}
            className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          >
            Add New
          </button>
        </div>
      </section>

      {showForm && (
        <Formik
          initialValues={
            transformOperationToFormValues(editingOperation) || {
              ...persistentValues,
              currentOPId: currentOPId,
              mainOperation: "",
              mainOperationName: "",
              operationName: "",
              operationNumber: "",
              smv: "",
              remarks: "",
              machineType: "HLP",
              machineNo: "",
              machineName: "",
              machineBrand: "",
              machineLocation: "",
              needleType: [{ type: "" }],
              needleCount: 1,
              needleTreads: [""],
              bobbinTreadLoopers: [""],
            }
          }
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
                        onBlur={handleBlur}
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
                          onBlur={handleBlur}
                        />
                        <ErrorMessage
                          name="mainOperation"
                          component="div"
                          className="text-red-500 text-sm mt-1"
                        />
                      </div>
                    ) : (
                      ""
                    )}

                    <div>
                      <label className="block mb-1">Style Number *</label>
                      <Field
                        as="select"
                        name="styleNumber"
                        className={`form-input-base ${
                          errors.styleNumber && touched.styleNumber
                            ? "border-red-500"
                            : ""
                        }`}
                        onBlur={handleBlur}
                      >
                        <option value="">Select a style</option>
                        {Array.isArray(stylesList) &&
                          stylesList.length > 0 &&
                          stylesList.map((sty) => (
                            <option key={sty.style_no} value={sty.style_no}>
                              {sty.style_no} ({sty.po_number})
                            </option>
                          ))}
                      </Field>
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
const FullForm = ({ values, setFieldValue, errors, touched, handleBlur }) => {
  const { machineList } = useMachine();
  const { machineTList } = useMachineTypes();
  const [needleTypes, setNeedleTypes] = useState(
    values.needleType || [{ type: "" }]
  );
  const [selectedMachineT, setSelectedMachineT] = useState(null);

  // to filter machien list according to selected machien list
  const filteredMachineList = useMemo(() => {
    if (selectedMachineT === null || selectedMachineT === "") {
      return [];
    }

    return machineList.filter((mch) => mch.machine_type === selectedMachineT);
  }, [selectedMachineT, machineList]);

  // Handle machine selection and autofill
  const handleMachineSelect = (machineNo, machineStatus) => {
    console.log(machineNo);
    const currentMachine = machineList.filter(
      (mch) => mch.machine_no === machineNo
    );
    console.log("current machine = ", currentMachine[0].machine_status);
    if (currentMachine) {
      if (currentMachine[0].machine_status === "inactive") {
        Swal.fire({
          text: "You can't use this machine because it's borken or inactive",
          icon: "warning",
        });
        return;
      }
    }

    if (machineStatus) {
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

  const handleNeedleTreadChange = (index, value) => {
    const newTreads = [...values.needleTreads];
    newTreads[index] = value;
    setFieldValue("needleTreads", newTreads);
  };

  const handleBobbinTreadChange = (index, value) => {
    const newTreads = [...values.bobbinTreadLoopers];
    newTreads[index] = value;
    setFieldValue("bobbinTreadLoopers", newTreads);
  };

  const addNeedleType = () => {
    const newTypes = [...needleTypes, { type: "" }];
    setNeedleTypes(newTypes);
    setFieldValue("needleType", newTypes);
  };

  const removeNeedleType = (index) => {
    const newTypes = needleTypes.filter((_, i) => i !== index);
    setNeedleTypes(newTypes);
    setFieldValue("needleType", newTypes);
  };

  const handleNeedleTypeChange = (index, value) => {
    const newTypes = [...needleTypes];
    newTypes[index] = { type: value };
    setNeedleTypes(newTypes);
    setFieldValue("needleType", newTypes);
  };

  const updateNeedleCount = (count) => {
    const newCount = Math.max(1, count);
    setFieldValue("needleCount", newCount);

    const newTreads = [...values.needleTreads];
    while (newTreads.length < newCount) newTreads.push("");
    while (newTreads.length > newCount) newTreads.pop();
    setFieldValue("needleTreads", newTreads.slice(0, newCount));

    const newBobbinTreads = [...values.bobbinTreadLoopers];
    while (newBobbinTreads.length < newCount) newBobbinTreads.push("");
    while (newBobbinTreads.length > newCount) newBobbinTreads.pop();
    setFieldValue("bobbinTreadLoopers", newBobbinTreads.slice(0, newCount));
  };

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
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <fieldset className="border rounded-md shadow-md p-4 grid md:grid-cols-2 md:gap-x-8 gap-x-2">
            <legend className="italic font-bold text-blue-950">
              Machine Details
            </legend>
            <div className="mt-4">
              <label htmlFor="">Machine Type *</label>
              <Field
                name="machineType"
                as="select"
                className={`form-input-base ${
                  errors.machineType && touched.machineType
                    ? "border-red-500"
                    : ""
                }`}
                onChange={(e) => {
                  const value = e.target.value;
                  setFieldValue("machineType", value);
                  setSelectedMachineT(value);
                }}
                // onBlur={handleBlur}
                // readOnly
              >
                <option>Select a machine type</option>
                {Array.isArray(machineTList) &&
                  machineTList.map((mcht, index) => (
                    <option key={index} value={mcht}>
                      {mcht}
                    </option>
                  ))}
              </Field>
              <ErrorMessage
                name="machineType"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>
            <div className="mt-4">
              <label htmlFor="">Machine No *</label>
              <Field
                name="machineNo"
                as="select"
                className={`form-input-base ${
                  errors.machineNo && touched.machineNo ? "border-red-500" : ""
                }`}
                onChange={(e) => handleMachineSelect(e.target.value)}
                onBlur={handleBlur}
              >
                <option value="">Select Machine</option>
                {filteredMachineList?.map((mch) => (
                  <option
                    className={`${
                      mch.machine_status == "active"
                        ? "text-green-600 font-semibold bg-green-200"
                        : "text-red-600 font-semibold bg-red-400"
                    }`}
                    key={mch.machine_id}
                    // mch.machine_no
                    value={mch.machine_no}
                  >
                    <span>
                      {mch.machine_status === "active" ? "✅" : "❌"}
                      {mch.machine_no}
                    </span>
                  </option>
                ))}
              </Field>
              <ErrorMessage
                name="machineNo"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="">Machine Name *</label>
              <Field
                name="machineName"
                type="text"
                className={`form-input-base ${
                  errors.machineName && touched.machineName
                    ? "border-red-500"
                    : ""
                }`}
                onBlur={handleBlur}
                readOnly
              />
              <ErrorMessage
                name="machineName"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="">Brand *</label>
              <Field
                name="machineBrand"
                type="text"
                className={`form-input-base ${
                  errors.machineBrand && touched.machineBrand
                    ? "border-red-500"
                    : ""
                }`}
                onBlur={handleBlur}
                readOnly
              />
              <ErrorMessage
                name="machineBrand"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>
            <div className="mt-4 col-span-2">
              <label htmlFor="">Machine Location *</label>
              <Field
                name="machineLocation"
                type="text"
                className={`form-input-base ${
                  errors.machineLocation && touched.machineLocation
                    ? "border-red-500"
                    : ""
                }`}
                onBlur={handleBlur}
                readOnly
              />
              <ErrorMessage
                name="machineLocation"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>

            <div className="mt-4 col-span-2">
              <label className="block mb-2 font-medium">Needle Types *</label>
              <div className="space-y-3">
                {Array.isArray(needleTypes) &&
                  needleTypes.map((item, index) => (
                    <motion.div
                      key={index}
                      className="grid grid-cols-12 gap-3 items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="col-span-10">
                        <input
                          name={`needleType[${index}].type`}
                          type="text"
                          value={item.type}
                          onChange={(e) =>
                            handleNeedleTypeChange(index, e.target.value)
                          }
                          onBlur={handleBlur}
                          className={`form-input-base ${
                            errors.needleType?.[index]?.type &&
                            touched.needleType
                              ? "border-red-500"
                              : ""
                          }`}
                          placeholder={`Needle type #${index + 1}`}
                        />
                      </div>
                      <div className="col-span-2">
                        <motion.button
                          type="button"
                          onClick={() => removeNeedleType(index)}
                          className="w-1/4 py-4 bg-red-500 rounded-md hover:bg-red-700 duration-200 flex items-center justify-center"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <FaMinus className="text-lg text-white" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                {errors.needleType && touched.needleType && (
                  <div className="text-red-500 text-sm mt-1">
                    {typeof errors.needleType === "string"
                      ? errors.needleType
                      : "Please fill all needle types"}
                  </div>
                )}
              </div>
              <motion.button
                type="button"
                onClick={addNeedleType}
                className="mt-2 w-full md:w-auto py-2 bg-green-500 rounded-md px-4 hover:bg-green-700 duration-200 flex items-center justify-center gap-2 text-white"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PiPlusBold className="text-xl" />
                <span>Add Needle Type</span>
              </motion.button>
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

            <div className="mt-4">
              <label htmlFor="">Needle Count *</label>
              <div className="">
                <Field
                  name="needleCount"
                  type="number"
                  min="1"
                  className={`form-input-base ${
                    errors.needleCount && touched.needleCount
                      ? "border-red-500"
                      : ""
                  }`}
                  onChange={(e) =>
                    updateNeedleCount(parseInt(e.target.value)) || 1
                  }
                  onBlur={handleBlur}
                />
                <ErrorMessage
                  name="needleCount"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="mt-6">
                <label className="block mb-2 font-medium">
                  Needle Treads *
                </label>
                <div className="space-y-3">
                  {values.needleTreads?.map((tread, index) => (
                    <motion.div
                      key={`needle-tread-${index}`}
                      className="grid grid-cols-12 gap-3 items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="col-span-10">
                        <input
                          name={`needleTreads[${index}]`}
                          type="text"
                          value={tread}
                          onChange={(e) =>
                            handleNeedleTreadChange(index, e.target.value)
                          }
                          onBlur={handleBlur}
                          className={`form-input-base ${
                            errors.needleTreads?.[index] && touched.needleTreads
                              ? "border-red-500"
                              : ""
                          }`}
                          placeholder={`Needle Tread #${index + 1}`}
                        />
                        {errors.needleTreads?.[index] &&
                          touched.needleTreads && (
                            <div className="text-red-500 text-xs mt-1">
                              {errors.needleTreads[index]}
                            </div>
                          )}
                      </div>
                      <div className="col-span-2 text-gray-500 text-sm">
                        #{index + 1}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <label className="block mb-2 font-medium">
                  Bobbin Tread/Looper *
                </label>
                <div className="space-y-3">
                  {values.bobbinTreadLoopers?.map((tread, index) => (
                    <motion.div
                      key={`bobbin-tread-${index}`}
                      className="grid grid-cols-12 gap-3 items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="col-span-10">
                        <input
                          name={`bobbinTreadLoopers[${index}]`}
                          type="text"
                          value={tread}
                          onChange={(e) =>
                            handleBobbinTreadChange(index, e.target.value)
                          }
                          onBlur={handleBlur}
                          className={`form-input-base ${
                            errors.bobbinTreadLoopers?.[index] &&
                            touched.bobbinTreadLoopers
                              ? "border-red-500"
                              : ""
                          }`}
                          placeholder={`Bobbin Tread #${index + 1}`}
                        />
                        {errors.bobbinTreadLoopers?.[index] &&
                          touched.bobbinTreadLoopers && (
                            <div className="text-red-500 text-xs mt-1">
                              {errors.bobbinTreadLoopers[index]}
                            </div>
                          )}
                      </div>
                      <div className="col-span-2 text-gray-500 text-sm">
                        #{index + 1}
                      </div>
                    </motion.div>
                  ))}
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
      <Field type="hidden" name="needleType" value={[]} />
      <Field type="hidden" name="needleCount" value={1} />
      <Field type="hidden" name="needleTreads" value={[]} />
      <Field type="hidden" name="bobbinTreadLoopers" value={[]} />
    </motion.div>
  );
};

export default OperationBulleting;
