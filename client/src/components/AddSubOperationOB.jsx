import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage, FieldArray, swap } from "formik";
import * as Yup from "yup";
import { FaPlus, FaEdit, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";
import axios from "axios";
import Swal from "sweetalert2";
import useMachine from "../hooks/useMachine";
import useMachineTypes from "../hooks/useMachineTypes";

// Validation Schema
const SubOperationSchema = Yup.object().shape({
  mainOperation: Yup.string().required("Main Operation is required"),
  subOperationNo: Yup.string().required("Sub Operation No is required"),
  smv: Yup.number()
    .required("SMV is required")
    .positive("SMV must be positive")
    .typeError("SMV must be a number"),
  subOperationName: Yup.string().required("Sub Operation Name is required"),
  machineType: Yup.string().required("Machine Type is required"),
  machineNo: Yup.string().required("Machine No is required"),
  machineName: Yup.string().required("Machine Name is required"),
  needleCount: Yup.number()
    .required("Needle Count is required")
    .integer("Needle Count must be an integer")
    .min(1, "Minimum 1 needle required")
    .max(10, "Maximum 10 needles allowed")
    .typeError("Needle Count must be a number"),
  needles: Yup.array().of(
    Yup.object().shape({
      thread: Yup.string().required("Thread is required"),
      looper: Yup.string().required("Looper is required"),
    })
  ),
  remark: Yup.string().nullable(),
});
const apiUrl = import.meta.env.VITE_API_URL;
const AddSubOperationOB = ({ mainOp, setIsAddingSubOP }) => {
  const { machineList, refresh } = useMachine();
  const { machineTList } = useMachineTypes();
  console.log(machineList);
  console.log("machine", machineList);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      setSubmitting(true);
      console.log("Form submitted:", values);

      const payload = {
        ...values,
        mainOperation_id: mainOp.operation_id,
      };

      const response = await axios.post(
        `${apiUrl}/api/OperationBulleting/create/sub-operation`,
        payload,
        { withCredentials: true }
      );

      // Success handling
      if (response.data.success) {
        await Swal.fire({
          title: "Success!",
          text: response.data.message || "Sub-operation created successfully",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        resetForm();
        setIsAddingSubOP(false);
      } else {
        // Handle API responses that aren't technically errors but indicate failure
        throw new Error(response.data.message || "Operation failed");
      }
    } catch (error) {
      console.error("Submission error:", error);

      // Extract error message from response if available
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.join?.("\n") ||
        error.message ||
        "Failed to create sub-operation";

      // Detailed error display
      await Swal.fire({
        title: "Error",
        html: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
        footer: error.response?.data?.errors
          ? '<a href="#" id="showDetails">Show details</a>'
          : undefined,
      });

      // Add click handler for details if they exist
      if (error.response?.data?.errors) {
        document
          .getElementById("showDetails")
          ?.addEventListener("click", (e) => {
            e.preventDefault();
            Swal.fire({
              title: "Validation Errors",
              html: `<ul>${error.response.data.errors
                .map((err) => `<li>${err.msg || err}</li>`)
                .join("")}</ul>`,
              icon: "info",
            });
          });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStart = (index, value, setFieldValue) => {
    setEditingIndex(index);
    setEditValue(value);
  };

  const handleEditSave = (index, values, setFieldValue) => {
    const newNeedleTypes = [...values.needleTypes];
    newNeedleTypes[index] = editValue;
    setFieldValue("needleTypes", newNeedleTypes);
    setEditingIndex(null);
    setEditValue("");
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditValue("");
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
          machineNo: "",
          machineName: "",
          needleCount: "",
          needles: [],
          needleTypes: [],
          remark: "",
          newNeedleType: "",
        }}
        validationSchema={SubOperationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, isSubmitting, errors, touched, setFieldValue }) => {
          useEffect(() => {
            if (values.needleCount && values.needleCount > 0) {
              const newNeedles = Array.from(
                { length: values.needleCount },
                (_, i) => ({
                  thread: values.needles[i]?.thread || "",
                  looper: values.needles[i]?.looper || "",
                })
              );
              setFieldValue("needles", newNeedles);
            } else {
              setFieldValue("needles", []);
            }
          }, [values.needleCount]);

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

                <div className="grid grid-cols-1">
                  <label htmlFor="machineType">Machine Type</label>
                  <Field
                    name="machineType"
                    className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                      errors.machineType && touched.machineType
                        ? "border-red-500"
                        : ""
                    }`}
                    placeholder="Machine type"
                  />
                  <ErrorMessage
                    name="machineType"
                    component="div"
                    className="text-red-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1">
                  <label htmlFor="machineNo">Machine No</label>
                  <Field
                    as="select"
                    name="machineNo"
                    className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                      errors.machineNo && touched.machineNo
                        ? "border-red-500"
                        : ""
                    }`}
                  >
                    <option>Select a machine</option>
                    {Array.isArray(machineList) &&
                      machineList.map((mch) => (
                        <option
                          className={`${
                            mch.machine_status === "active"
                              ? "text-green-600 bg-green-300"
                              : "text-red-600 bg-red-300"
                          } font-semibold`}
                          key={mch.machine_id}
                          value={mch.machine_no}
                        >
                          <span>
                            {mch.machine_status === "active" ? "✅" : "❌"}{" "}
                            {mch.machine_no}
                          </span>
                        </option>
                      ))}
                  </Field>
                  <ErrorMessage
                    name="machineNo"
                    component="div"
                    className="text-red-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1">
                  <label htmlFor="machineName">Machine Name</label>
                  <Field
                    name="machineName"
                    className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                      errors.machineName && touched.machineName
                        ? "border-red-500"
                        : ""
                    }`}
                    placeholder="Machine name"
                  />
                  <ErrorMessage
                    name="machineName"
                    component="div"
                    className="text-red-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1">
                  <label htmlFor="needleCount">Needle Count</label>
                  <Field
                    name="needleCount"
                    type="number"
                    min="1"
                    max="10"
                    className={`border-2 px-2 py-2 rounded-md shadow-sm ${
                      errors.needleCount && touched.needleCount
                        ? "border-red-500"
                        : ""
                    }`}
                    placeholder="Number of needles"
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
                  Needle Configuration
                </h1>

                <FieldArray name="needleTypes">
                  {({ push, remove }) => (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1">
                        <label htmlFor="newNeedleType">Add Needle Type</label>
                        <div className="flex items-center gap-2">
                          <Field
                            name="newNeedleType"
                            className="border-2 px-2 py-2 rounded-md shadow-sm flex-1"
                            placeholder="Enter needle type"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (values.newNeedleType) {
                                push(values.newNeedleType);
                                setFieldValue("newNeedleType", "");
                              }
                            }}
                            className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
                          >
                            <FaPlus />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h3 className="font-medium mb-2">Needle Types</h3>
                        {values.needleTypes?.length > 0 ? (
                          <div className="space-y-2">
                            {values.needleTypes.map((type, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-gray-100 p-2 rounded"
                              >
                                {editingIndex === index ? (
                                  <div className="flex items-center gap-2 w-full">
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) =>
                                        setEditValue(e.target.value)
                                      }
                                      className="border-2 px-2 py-1 rounded-md shadow-sm flex-1"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleEditSave(
                                          index,
                                          values,
                                          setFieldValue
                                        )
                                      }
                                      className="text-green-500 hover:text-green-700"
                                    >
                                      ✅
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleEditCancel}
                                      className="text-gray-500 hover:text-gray-700"
                                    >
                                      ❌
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span>{type}</span>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleEditStart(
                                            index,
                                            type,
                                            setFieldValue
                                          )
                                        }
                                        className="text-blue-500 hover:text-blue-700"
                                      >
                                        <FaEdit size={20} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        <MdDeleteForever size={20} />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">
                            No needle types added yet
                          </p>
                        )}
                      </div>

                      {values.needleCount > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4 mb-2 font-medium">
                            <div>Threads</div>
                            <div>Loopers</div>
                          </div>

                          <div className="space-y-4">
                            {values.needles.map((needle, index) => (
                              <div
                                key={index}
                                className="grid grid-cols-2 gap-4"
                              >
                                <div>
                                  <Field
                                    name={`needles.${index}.thread`}
                                    className="border-2 px-2 py-2 rounded-md shadow-sm w-full"
                                    placeholder={`Thread ${index + 1}`}
                                  />
                                  <ErrorMessage
                                    name={`needles.${index}.thread`}
                                    component="div"
                                    className="text-red-500 text-sm"
                                  />
                                </div>
                                <div>
                                  <Field
                                    name={`needles.${index}.looper`}
                                    className="border-2 px-2 py-2 rounded-md shadow-sm w-full"
                                    placeholder={`Looper ${index + 1}`}
                                  />
                                  <ErrorMessage
                                    name={`needles.${index}.looper`}
                                    component="div"
                                    className="text-red-500 text-sm"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </FieldArray>
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
