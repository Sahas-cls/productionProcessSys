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

const OperationBulleting = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [showForm, setShowForm] = useState(true);
  const [operations, setOperations] = useState([]);
  const [pendingOperations, setPendingOperations] = useState([]);
  const [editingOperation, setEditingOperation] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [persistentValues, setPersistentValues] = useState({
    styleNumber: "",
    mainOperation: "",
  });
  const [currentOPId, setCurrentOPId] = useState("");

  useEffect(() => {
    const fetchOperations = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/operationBuleting`, {
          withCredentials: true,
        });
        setOperations(response.data);
      } catch (error) {
        console.error("Error fetching operations:", error);
      }
    };
    fetchOperations();
  }, [apiUrl]);

  const validationSchema = Yup.object().shape({
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
    machineType: Yup.string().when("mainOperation", {
      is: "Machine Operator",
      then: Yup.string().required("Machine Type is required"),
      otherwise: Yup.string(),
    }),
    machineNo: Yup.string().when("mainOperation", {
      is: "Machine Operator",
      then: Yup.string().required("Machine No is required"),
      otherwise: Yup.string(),
    }),
    machineName: Yup.string().when("mainOperation", {
      is: "Machine Operator",
      then: Yup.string().required("Machine Name is required"),
      otherwise: Yup.string(),
    }),
    machineBrand: Yup.string().when("mainOperation", {
      is: "Machine Operator",
      then: Yup.string().required("Machine Brand is required"),
      otherwise: Yup.string(),
    }),
    machineLocation: Yup.string().when("mainOperation", {
      is: "Machine Operator",
      then: Yup.string().required("Machine Location is required"),
      otherwise: Yup.string(),
    }),
    needleType: Yup.array().when("mainOperation", {
      is: "Machine Operator",
      then: Yup.array()
        .of(
          Yup.object().shape({
            type: Yup.string().required("Needle Type is required"),
          })
        )
        .min(1, "At least one Needle Type is required"),
      otherwise: Yup.array(),
    }),
    needleCount: Yup.number().when("mainOperation", {
      is: "Machine Operator",
      then: Yup.number()
        .required("Needle count is required")
        .positive("Must be a positive number")
        .integer("Must be a whole number"),
      otherwise: Yup.number(),
    }),
    needleTreads: Yup.array().when("mainOperation", {
      is: "Machine Operator",
      then: Yup.array()
        .of(Yup.string().required("Needle Tread is required"))
        .min(1, "At least one Needle Tread is required"),
      otherwise: Yup.array(),
    }),
    bobbinTreadLoopers: Yup.array().when("mainOperation", {
      is: "Machine Operator",
      then: Yup.array()
        .of(Yup.string().required("Bobbin Tread/Looper is required"))
        .min(1, "At least one Bobbin Tread/Looper is required"),
      otherwise: Yup.array(),
    }),
    remarks: Yup.string().max(500, "Remarks must be 500 characters or less"),
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

  const handleSubmit = (values, { setSubmitting, resetForm }) => {
    // Filter out empty values for arrays
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
      const { styleNumber, mainOperation, mainOperationName } =  
        pendingOperations[0];

      // Separate operations by type
      const machineOperations = pendingOperations.filter(
        (op) => op.mainOperation === "Machine Operator"
      );
      const helperOperations = pendingOperations.filter(
        (op) => op.mainOperation === "Helper"
      );

      // Prepare payloads for each type
      const machinePayload = {
        styleNumber,
        mainOperation,
        mainOperationName,
        currentOPId: localStorage.getItem("currentItem") || null,
        operations: machineOperations.map(formatMachineOperation),
      };

      const helperPayload = {
        styleNumber,
        mainOperation,
        mainOperationName,
        currentOPId: localStorage.getItem("currentItem") || null,
        operations: helperOperations.map(formatHelperOperation),
      };

      // Send requests in parallel
      const responses = await Promise.all([
        machineOperations.length > 0
          ? axios.post(
              `${apiUrl}/api/operationBuleting/createMachineOps`,
              machinePayload,
              { withCredentials: true }
            )
          : Promise.resolve(null),
        helperOperations.length > 0
          ? axios.post(
              `${apiUrl}/api/operationBuleting/createHelperOps`,
              helperPayload,
              { withCredentials: true }
            )
          : Promise.resolve(null),
      ]);

      // Handle responses
      const [machineResponse, helperResponse] = responses;
      let mainOPId = currentOPId;

      if (machineResponse?.data?.mainOPId) {
        mainOPId = machineResponse.data.mainOPId;
        localStorage.setItem("currentItem", mainOPId);
        setCurrentOPId(mainOPId);
      } else if (helperResponse?.data?.mainOPId) {
        mainOPId = helperResponse.data.mainOPId;
        localStorage.setItem("currentItem", mainOPId);
        setCurrentOPId(mainOPId);
      }

      Swal.fire({
        title: "Success",
        text: `Saved ${pendingOperations.length} operations (${machineOperations.length} machine, ${helperOperations.length} helper)`,
        icon: "success",
      });

      setPendingOperations([]);
    } catch (error) {
      console.error("Bulk save error:", error);
      let errorMessage = "Failed to save operations";

      if (error.response?.data) {
        errorMessage =
          error.response.data.message || JSON.stringify(error.response.data);
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        title: "Error",
        html: `<div>${errorMessage}</div><small>Check console for details</small>`,
        icon: "error",
      });
    }
  };

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

  const formatHelperOperation = (op) => ({
  operationName: op.operationName,
  operationNumber: op.operationNumber,
  smv: op.smv,
  remarks: op.remarks
});

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
          <input
            type="text"
            className="w-2/4 form-input-base py-3 px-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            placeholder="Search operations..."
          />
        </div>

        <div className="md:col-span-4 grid grid-cols-2 gap-3 md:gap-4 w-full">
          <button
            type="button"
            className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors"
          >
            Download
          </button>
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
                        <option value="Machine Operator">
                          Machine Operator
                        </option>
                        <option value="Helper">Helper</option>
                      </Field>
                      <ErrorMessage
                        name="mainOperation"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {/* main operation name */}
                    <div>
                      <label className="block mb-1">
                        Main Operation Name *
                      </label>
                      <Field
                        name="mainOperationName"
                        type="text"
                        className={`form-input-base ${
                          errors.mainOperationName && touched.mainOperationName
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

                    <div>
                      <label className="block mb-1">Style Number *</label>
                      <Field
                        name="styleNumber"
                        type="text"
                        className={`form-input-base ${
                          errors.styleNumber && touched.styleNumber
                            ? "border-red-500"
                            : ""
                        }`}
                        placeholder="Style Number"
                        onBlur={handleBlur}
                      />
                      <ErrorMessage
                        name="styleNumber"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {values.mainOperation === "Machine Operator" ? (
                      <FullForm
                        values={values}
                        setFieldValue={setFieldValue}
                        errors={errors}
                        touched={touched}
                        handleBlur={handleBlur}
                      />
                    ) : values.mainOperation === "Helper" ? (
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
  const [needleTypes, setNeedleTypes] = useState(
    values.needleType || [{ type: "" }]
  );

  // Handle needle tread changes
  const handleNeedleTreadChange = (index, value) => {
    const newTreads = [...values.needleTreads];
    newTreads[index] = value;
    setFieldValue("needleTreads", newTreads);
  };

  // Handle bobbin tread changes
  const handleBobbinTreadChange = (index, value) => {
    const newTreads = [...values.bobbinTreadLoopers];
    newTreads[index] = value;
    setFieldValue("bobbinTreadLoopers", newTreads);
  };

  // Add new needle type
  const addNeedleType = () => {
    const newTypes = [...needleTypes, { type: "" }];
    setNeedleTypes(newTypes);
    setFieldValue("needleType", newTypes);
  };

  // Remove needle type
  const removeNeedleType = (index) => {
    const newTypes = needleTypes.filter((_, i) => i !== index);
    setNeedleTypes(newTypes);
    setFieldValue("needleType", newTypes);
  };

  // Handle needle type change
  const handleNeedleTypeChange = (index, value) => {
    const newTypes = [...needleTypes];
    newTypes[index] = { type: value };
    setNeedleTypes(newTypes);
    setFieldValue("needleType", newTypes);
  };

  // Update needle count and adjust arrays
  const updateNeedleCount = (count) => {
    const newCount = Math.max(1, count);
    setFieldValue("needleCount", newCount);

    // Adjust needle treads array
    const newTreads = [...values.needleTreads];
    while (newTreads.length < newCount) newTreads.push("");
    while (newTreads.length > newCount) newTreads.pop();
    setFieldValue("needleTreads", newTreads.slice(0, newCount));

    // Adjust bobbin treads array
    const newBobbinTreads = [...values.bobbinTreadLoopers];
    while (newBobbinTreads.length < newCount) newBobbinTreads.push("");
    while (newBobbinTreads.length > newCount) newBobbinTreads.pop();
    setFieldValue("bobbinTreadLoopers", newBobbinTreads.slice(0, newCount));
  };

  return (
    <div className="">
      <div className="">
        {/* sub operation section */}
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

        {/* machine type section */}
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
                type="text"
                className={`form-input-base ${
                  errors.machineType && touched.machineType
                    ? "border-red-500"
                    : ""
                }`}
                onBlur={handleBlur}
              />
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
                type="text"
                className={`form-input-base ${
                  errors.machineNo && touched.machineNo ? "border-red-500" : ""
                }`}
                placeholder="Machine number"
                onBlur={handleBlur}
              />
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

        {/* needle section */}
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

            {/* Needle Count */}
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
                    updateNeedleCount(parseInt(e.target.value) || 1)
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

            {/* Needle Treads - dynamic based on needleCount */}
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

              {/* Bobbin Treads - dynamic based on needleCount */}
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

// Helper Form Component
const HelperForm = ({ values, errors, touched, handleBlur, setFieldValue }) => {
  // Helper form doesn't need machine details, so we'll keep it simple
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

      {/* Hidden fields for machine details (required by validation but not shown for helpers) */}
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

// FullForm and HelperForm components remain the same as in your original code
// ... [Include the FullForm and HelperForm components exactly as you have them]

export default OperationBulleting;
